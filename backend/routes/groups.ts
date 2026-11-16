import { Hono } from 'hono'
import { kv } from '../db.ts'
import { getAuthenticatedUser } from '../services/session.ts'

export const groupRoutes = new Hono()

type Group = {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  createdAt: string
}

type GroupMember = {
  userId: string
  joinedAt: string
}

async function currentUser(c: Parameters<typeof getAuthenticatedUser>[0]) {
  return await getAuthenticatedUser(c)
}

async function readBody(c: {
  req: { json: () => Promise<unknown> }
}): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await c.req.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return null
    }
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

// Alle Gruppen des angemeldeten Nutzers
groupRoutes.get('/', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Nicht angemeldet' }, 401)

  const groups: Group[] = []

  for await (const entry of kv.list<GroupMember>({
    prefix: ['groupMemberships', user.id]
  })) {
    const groupId = String(entry.key[2])
    const group = await kv.get<Group>(['groups', groupId])

    if (group.value) groups.push(group.value)
  }

  groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return c.json(groups)
})

// Neue Gruppe erstellen
groupRoutes.post('/', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Nicht angemeldet' }, 401)

  const body = await readBody(c)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (name.length < 2 || name.length > 60) {
    return c.json({
      error: 'Der Gruppenname muss zwischen 2 und 60 Zeichen lang sein.'
    }, 400)
  }

  const groupId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  // Einladungscode eindeutig reservieren
  let inviteCode = ''
  let reserved = false

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateInviteCode()
    const result = await kv.atomic()
      .check({ key: ['groupCodes', candidate], versionstamp: null })
      .set(['groupCodes', candidate], groupId)
      .commit()

    if (result.ok) {
      inviteCode = candidate
      reserved = true
      break
    }
  }

  if (!reserved) {
    return c.json({ error: 'Einladungscode konnte nicht erstellt werden.' }, 500)
  }

  const group: Group = {
    id: groupId,
    name,
    inviteCode,
    ownerId: user.id,
    createdAt
  }

  const member: GroupMember = {
    userId: user.id,
    joinedAt: createdAt
  }

  const saved = await kv.atomic()
    .set(['groups', groupId], group)
    .set(['groupMembers', groupId, user.id], member)
    .set(['groupMemberships', user.id, groupId], member)
    .commit()

  if (!saved.ok) {
    await kv.delete(['groupCodes', inviteCode])
    return c.json({ error: 'Gruppe konnte nicht gespeichert werden.' }, 500)
  }

  return c.json(group, 201)
})

// Einer Gruppe mit Einladungscode beitreten
groupRoutes.post('/join', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Nicht angemeldet' }, 401)

  const body = await readBody(c)
  const code = typeof body?.inviteCode === 'string'
    ? body.inviteCode.trim().toUpperCase()
    : ''

  if (!code) {
    return c.json({ error: 'Bitte einen Einladungscode eingeben.' }, 400)
  }

  const groupIdEntry = await kv.get<string>(['groupCodes', code])

  if (!groupIdEntry.value) {
    return c.json({ error: 'Ungültiger Einladungscode.' }, 404)
  }

  const groupId = groupIdEntry.value
  const groupEntry = await kv.get<Group>(['groups', groupId])

  if (!groupEntry.value) {
    return c.json({ error: 'Gruppe nicht gefunden.' }, 404)
  }

  const membershipKey: Deno.KvKey = ['groupMembers', groupId, user.id]
  const existing = await kv.get<GroupMember>(membershipKey)

  if (existing.value) {
    return c.json({ error: 'Du bist bereits Mitglied dieser Gruppe.' }, 409)
  }

  const member: GroupMember = {
    userId: user.id,
    joinedAt: new Date().toISOString()
  }

  const result = await kv.atomic()
    .check({ key: membershipKey, versionstamp: null })
    .set(membershipKey, member)
    .set(['groupMemberships', user.id, groupId], member)
    .commit()

  if (!result.ok) {
    return c.json({ error: 'Beitritt fehlgeschlagen. Bitte erneut versuchen.' }, 409)
  }

  return c.json(groupEntry.value, 201)
})

// Mitglieder einer Gruppe anzeigen
groupRoutes.get('/:id/members', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'Nicht angemeldet' }, 401)

  const groupId = c.req.param('id')
  const membership = await kv.get<GroupMember>(
    ['groupMembers', groupId, user.id]
  )

  if (!membership.value) {
    return c.json({ error: 'Kein Zugriff auf diese Gruppe.' }, 403)
  }

  const members: { id: string; username: string }[] = []

  for await (const entry of kv.list<GroupMember>({
    prefix: ['groupMembers', groupId]
  })) {
    const userEntry = await kv.get<{ id: string; username: string }>(
      ['users', entry.value.userId]
    )

    if (userEntry.value) {
      members.push({
        id: userEntry.value.id,
        username: userEntry.value.username
      })
    }
  }

  return c.json(members)
})

type SharedRestaurant = {
  id: string
  name: string
  location: string
  address?: string
  cuisine: string
}

type SharedVisit = {
  id: string
  restaurantId: string
  date: string
  foodRating?: number
  serviceRating?: number
  ambienceRating?: number
  valueRating?: number
  rating: number
  note: string
}

type GroupVisit = SharedVisit & {
  ownerId: string
  ownerUsername: string
}

type GroupRestaurant = SharedRestaurant & {
  ownerId: string
  ownerUsername: string
  contributors: {
    id: string
    username: string
  }[]
  visits: GroupVisit[]
  visitCount: number
  averageRating: number | null
}

// Schreibweisen vereinheitlichen
function normalize(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('de')
    .replace(/\s+/g, ' ')
}

// Restaurant anhand von Name, Stadt und Adresse erkennen
function restaurantKey(restaurant: SharedRestaurant): string {
  return JSON.stringify([
    normalize(restaurant.name),
    normalize(restaurant.location),
    normalize(restaurant.address)
  ])
}

// Restaurants und Bewertungen aller Gruppenmitglieder
groupRoutes.get('/:id/restaurants', async (c) => {
  const user = await currentUser(c)

  if (!user) {
    return c.json({ error: 'Nicht angemeldet' }, 401)
  }

  const groupId = c.req.param('id')

  const group = await kv.get<Group>(['groups', groupId])

  if (!group.value) {
    return c.json({ error: 'Gruppe nicht gefunden' }, 404)
  }

  const membership = await kv.get<GroupMember>([
    'groupMembers',
    groupId,
    user.id
  ])

  if (!membership.value) {
    return c.json({
      error: 'Kein Zugriff auf diese Gruppe.'
    }, 403)
  }

  // Pro eindeutigem Restaurant nur ein Gruppeneintrag
  const restaurantMap = new Map<string, GroupRestaurant>()

  for await (
    const memberEntry of kv.list<GroupMember>({
      prefix: ['groupMembers', groupId]
    })
  ) {
    const memberId = memberEntry.value.userId

    const member = await kv.get<{
      id: string
      username: string
    }>(['users', memberId])

    if (!member.value) continue

    const username = member.value.username

    for await (
      const restaurantEntry of kv.list<SharedRestaurant>({
        prefix: ['restaurants', memberId]
      })
    ) {
      const restaurant = restaurantEntry.value
      const key = restaurantKey(restaurant)

      let groupedRestaurant = restaurantMap.get(key)

      // Restaurant zum ersten Mal gefunden
      if (!groupedRestaurant) {
        groupedRestaurant = {
          ...restaurant,
          ownerId: memberId,
          ownerUsername: username,
          contributors: [],
          visits: [],
          visitCount: 0,
          averageRating: null
        }

        restaurantMap.set(key, groupedRestaurant)
      }

      // Mitglied als Beitragenden hinzufügen
      if (
        !groupedRestaurant.contributors.some(
          contributor => contributor.id === memberId
        )
      ) {
        groupedRestaurant.contributors.push({
          id: memberId,
          username
        })
      }

      // Fehlende Anzeigeinformationen ergänzen
      if (!groupedRestaurant.address && restaurant.address) {
        groupedRestaurant.address = restaurant.address
      }

      if (!groupedRestaurant.cuisine && restaurant.cuisine) {
        groupedRestaurant.cuisine = restaurant.cuisine
      }

      // Besuche dieses Mitglieds hinzufügen
      for await (
        const visitEntry of kv.list<SharedVisit>({
          prefix: ['visits', memberId, restaurant.id]
        })
      ) {
        groupedRestaurant.visits.push({
          ...visitEntry.value,
          ownerId: memberId,
          ownerUsername: username
        })
      }
    }
  }

  const result = Array.from(restaurantMap.values())

  // Gemeinsame Statistiken berechnen
  for (const restaurant of result) {
    restaurant.visits.sort((a, b) =>
      b.date.localeCompare(a.date)
    )

    restaurant.contributors.sort((a, b) =>
      a.username.localeCompare(b.username, 'de')
    )

    restaurant.visitCount = restaurant.visits.length

    if (restaurant.visits.length > 0) {
      const sum = restaurant.visits.reduce(
        (total, visit) => total + visit.rating,
        0
      )

      restaurant.averageRating =
        Math.round(
          (sum / restaurant.visits.length) * 10
        ) / 10
    }
  }

  result.sort((a, b) =>
    a.name.localeCompare(b.name, 'de', {
      sensitivity: 'base'
    })
  )

  return c.json(result)
})