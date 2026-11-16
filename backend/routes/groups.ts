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

type GroupRestaurant = SharedRestaurant & {
  ownerId: string
  ownerUsername: string
  visits: SharedVisit[]
  visitCount: number
  averageRating: number | null
}

// Restaurants und Bewertungen aller Gruppenmitglieder
groupRoutes.get('/:id/restaurants', async (c) => {
  const user = await getAuthenticatedUser(c)

  if (!user) {
    return c.json({ error: 'Nicht angemeldet' }, 401)
  }

  const groupId = c.req.param('id')

  // Prüfen, ob die Gruppe existiert
  const group = await kv.get(['groups', groupId])

  if (!group.value) {
    return c.json({ error: 'Gruppe nicht gefunden' }, 404)
  }

  // Nur Mitglieder dürfen die gemeinsamen Daten sehen
  const membership = await kv.get([
    'groupMembers',
    groupId,
    user.id
  ])

  if (!membership.value) {
    return c.json({
      error: 'Du bist kein Mitglied dieser Gruppe.'
    }, 403)
  }

  const result: GroupRestaurant[] = []

  // Alle Mitglieder der Gruppe durchgehen
  for await (
    const memberEntry of kv.list<{ userId: string }>({
      prefix: ['groupMembers', groupId]
    })
  ) {
    const memberId = memberEntry.value.userId

    // Benutzername laden
    const member = await kv.get<{
      id: string
      username: string
    }>(['users', memberId])

    if (!member.value) continue

    // Persönliche Restaurants dieses Mitglieds laden
    for await (
      const restaurantEntry of kv.list<SharedRestaurant>({
        prefix: ['restaurants', memberId]
      })
    ) {
      const restaurant = restaurantEntry.value
      const visits: SharedVisit[] = []

      // Alle Besuche des Restaurants laden
      for await (
        const visitEntry of kv.list<SharedVisit>({
          prefix: [
            'visits',
            memberId,
            restaurant.id
          ]
        })
      ) {
        visits.push(visitEntry.value)
      }

      visits.sort((a, b) => b.date.localeCompare(a.date))

      const averageRating = visits.length > 0
        ? Math.round(
            (
              visits.reduce(
                (sum, visit) => sum + visit.rating,
                0
              ) / visits.length
            ) * 10
          ) / 10
        : null

      result.push({
        ...restaurant,
        ownerId: memberId,
        ownerUsername: member.value.username,
        visits,
        visitCount: visits.length,
        averageRating
      })
    }
  }

  result.sort((a, b) =>
    a.name.localeCompare(b.name, 'de', {
      sensitivity: 'base'
    })
  )

  return c.json(result)
})