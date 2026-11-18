import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { kv } from './db.ts'
import { authRoutes } from './routes/auth.ts'
import { getAuthenticatedUser } from './services/session.ts'
import { groupRoutes } from './routes/groups.ts'

const app = new Hono()

// CORS
app.use('/api/*', cors({
  origin: 'http://localhost:5173',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type']
}))

// AUTHENTIFIZIERUNG
app.route('/api/auth', authRoutes)
app.route('/api/groups', groupRoutes)

// Alle Restaurant- und Besuchsrouten schützen
app.use('/api/restaurants', requireAuth)
app.use('/api/restaurants/*', requireAuth)

// Die Middleware stellt den ermittelten Benutzer für die nachfolgenden Restaurant- und Besuchsrouten bereit.
async function requireAuth(
  c: Parameters<typeof getAuthenticatedUser>[0],
  next: () => Promise<void>
) {
  const user = await getAuthenticatedUser(c)

  if (!user) {
    return c.json({ error: 'Nicht angemeldet' }, 401)
  }

  await next()
}

// DATENTYPEN

type Restaurant = {
  id: string
  name: string
  location: string
  address?: string
  cuisine: string
}

type Visit = {
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

type VisitInput = {
  date: string
  foodRating: number
  serviceRating: number
  ambienceRating: number
  valueRating: number
  note: string
}

// HILFSFUNKTIONEN

function isValidRating(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  )
}

// Die Gesamtbewertung serverseitig aus den vier Einzelwerten ableiten und auf eine Nachkommastelle runden.
function calculateRating(data: VisitInput): number {
  const average = (
    data.foodRating +
    data.serviceRating +
    data.ambienceRating +
    data.valueRating
  ) / 4

  return Math.round(average * 10) / 10
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  // Der Vergleich mit dem ISO-Datum erkennt auch Eingaben, die beim Parsen auf einen anderen Tag fallen.
  const timestamp = Date.parse(value)

  return (
    !Number.isNaN(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  )
}

function validateRestaurant(body: unknown): {
  name: string
  location: string
  address: string
  cuisine: string
} | null {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return null
  }

  const data = body as Record<string, unknown>

  if (
    typeof data.name !== 'string' ||
    !data.name.trim() ||
    typeof data.location !== 'string' ||
    !data.location.trim() ||
    typeof data.cuisine !== 'string' ||
    !data.cuisine.trim() ||
    (
    data.address !== undefined &&
    typeof data.address !== 'string'
    )
  ) {
    return null
  }

  return {
    name: data.name.trim(),
    location: data.location.trim(),
    address: typeof data.address === 'string'
    ? data.address.trim()
    : '',
    cuisine: data.cuisine.trim()
  }
}

function validateVisit(body: unknown): VisitInput | null {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return null
  }

  const data = body as Record<string, unknown>

  if (
    !isValidDate(data.date) ||
    !isValidRating(data.foodRating) ||
    !isValidRating(data.serviceRating) ||
    !isValidRating(data.ambienceRating) ||
    !isValidRating(data.valueRating) ||
    typeof data.note !== 'string'
  ) {
    return null
  }

  return {
    date: data.date,
    foodRating: data.foodRating,
    serviceRating: data.serviceRating,
    ambienceRating: data.ambienceRating,
    valueRating: data.valueRating,
    note: data.note.trim()
  }
}

async function readJson(c: {
  req: { json: () => Promise<unknown> }
}): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}

// STATUS

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    message: 'Restaurant-App Backend läuft!'
  })
})

// RESTAURANTS ABRUFEN

// Das Präfix mit der Benutzer-ID begrenzt die Liste auf die Restaurants des eigenen Kontos.
app.get('/api/restaurants', async (c) => {
  const user = (await getAuthenticatedUser(c))!
  const restaurants: Restaurant[] = []

  for await (
    const entry of kv.list<Restaurant>({
      prefix: ['restaurants', user.id]
    })
  ) {
    restaurants.push(entry.value)
  }

  return c.json(restaurants)
})

// RESTAURANT ERSTELLEN

app.post('/api/restaurants', async (c) => {
  const user = (await getAuthenticatedUser(c))!
  const data = validateRestaurant(await readJson(c))

  if (!data) {
    return c.json({ error: 'Ungültige Restaurantdaten' }, 400)
  }

  const restaurant: Restaurant = {
    id: crypto.randomUUID(),
    ...data
  }

  await kv.set(
    ['restaurants', user.id, restaurant.id],
    restaurant
  )

  return c.json(restaurant, 201)
})

// RESTAURANT BEARBEITEN

app.put('/api/restaurants/:id', async (c) => {
  const user = (await getAuthenticatedUser(c))!
  const id = c.req.param('id')

  const key: Deno.KvKey = ['restaurants', user.id, id]
  const existing = await kv.get<Restaurant>(key)

  if (!existing.value) {
    return c.json({ error: 'Restaurant nicht gefunden' }, 404)
  }

  const data = validateRestaurant(await readJson(c))

  if (!data) {
    return c.json({ error: 'Ungültige Restaurantdaten' }, 400)
  }

  const updatedRestaurant: Restaurant = {
    id,
    ...data
  }

  await kv.set(key, updatedRestaurant)

  return c.json(updatedRestaurant)
})

// RESTAURANT LÖSCHEN

// Beim Löschen eines Restaurants auch die zugehörigen Besuche entfernen.
app.delete('/api/restaurants/:id', async (c) => {
  const user = (await getAuthenticatedUser(c))!
  const id = c.req.param('id')

  const key: Deno.KvKey = ['restaurants', user.id, id]
  const existing = await kv.get<Restaurant>(key)

  if (!existing.value) {
    return c.json({ error: 'Restaurant nicht gefunden' }, 404)
  }

  // Alle zugehörigen Besuche löschen
  for await (
    const entry of kv.list({
      prefix: ['visits', user.id, id]
    })
  ) {
    await kv.delete(entry.key)
  }

  await kv.delete(key)

  return c.json({ message: 'Restaurant gelöscht' })
})

// BESUCHE ABRUFEN

app.get('/api/restaurants/:id/visits', async (c) => {
  const user = (await getAuthenticatedUser(c))!
  const restaurantId = c.req.param('id')

  const restaurant = await kv.get<Restaurant>([
    'restaurants',
    user.id,
    restaurantId
  ])

  if (!restaurant.value) {
    return c.json({ error: 'Restaurant nicht gefunden' }, 404)
  }

  const visits: Visit[] = []

  for await (
    const entry of kv.list<Visit>({
      prefix: ['visits', user.id, restaurantId]
    })
  ) {
    visits.push(entry.value)
  }

  visits.sort((a, b) => b.date.localeCompare(a.date))

  return c.json(visits)
})

// BESUCH ERSTELLEN

app.post('/api/restaurants/:id/visits', async (c) => {
  const user = (await getAuthenticatedUser(c))!
  const restaurantId = c.req.param('id')

  const restaurant = await kv.get<Restaurant>([
    'restaurants',
    user.id,
    restaurantId
  ])

  if (!restaurant.value) {
    return c.json({ error: 'Restaurant nicht gefunden' }, 404)
  }

  const data = validateVisit(await readJson(c))

  if (!data) {
    return c.json({ error: 'Ungültige Besuchsdaten' }, 400)
  }

  const visit: Visit = {
    id: crypto.randomUUID(),
    restaurantId,
    ...data,
    rating: calculateRating(data)
  }

  await kv.set(
    ['visits', user.id, restaurantId, visit.id],
    visit
  )

  return c.json(visit, 201)
})

// BESUCH BEARBEITEN

app.put('/api/restaurants/:id/visits/:visitId', async (c) => {
  const user = (await getAuthenticatedUser(c))!
  const restaurantId = c.req.param('id')
  const visitId = c.req.param('visitId')

  // Erst prüfen, ob das Restaurant dem Benutzer gehört
  const restaurant = await kv.get<Restaurant>([
    'restaurants',
    user.id,
    restaurantId
  ])

  if (!restaurant.value) {
    return c.json({ error: 'Restaurant nicht gefunden' }, 404)
  }

  const key: Deno.KvKey = [
    'visits',
    user.id,
    restaurantId,
    visitId
  ]

  const existing = await kv.get<Visit>(key)

  if (!existing.value) {
    return c.json({ error: 'Besuch nicht gefunden' }, 404)
  }

  const data = validateVisit(await readJson(c))

  if (!data) {
    return c.json({ error: 'Ungültige Besuchsdaten' }, 400)
  }

  const updatedVisit: Visit = {
    id: visitId,
    restaurantId,
    ...data,
    rating: calculateRating(data)
  }

  await kv.set(key, updatedVisit)

  return c.json(updatedVisit)
})

// BESUCH LÖSCHEN

app.delete('/api/restaurants/:id/visits/:visitId', async (c) => {
  const user = (await getAuthenticatedUser(c))!
  const restaurantId = c.req.param('id')
  const visitId = c.req.param('visitId')

  // Erst prüfen, ob das Restaurant dem Benutzer gehört
  const restaurant = await kv.get<Restaurant>([
    'restaurants',
    user.id,
    restaurantId
  ])

  if (!restaurant.value) {
    return c.json({ error: 'Restaurant nicht gefunden' }, 404)
  }

  const key: Deno.KvKey = [
    'visits',
    user.id,
    restaurantId,
    visitId
  ]

  const existing = await kv.get<Visit>(key)

  if (!existing.value) {
    return c.json({ error: 'Besuch nicht gefunden' }, 404)
  }

  await kv.delete(key)

  return c.json({ message: 'Besuch gelöscht' })
})

// SERVER STARTEN

Deno.serve({ port: 8000 }, app.fetch)