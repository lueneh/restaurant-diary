import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { kv } from './db.ts'
import { authRoutes } from './routes/auth.ts'

const app = new Hono()

app.use('/api/*', cors({
  origin: 'http://localhost:5173',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type']
}))

app.route('/api/auth', authRoutes)

// DATENTYPEN

type Restaurant = {
  id: string
  name: string
  location: string
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

  const timestamp = Date.parse(value)

  return (
    !Number.isNaN(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  )
}

function validateRestaurant(body: unknown): {
  name: string
  location: string
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
    !data.cuisine.trim()
  ) {
    return null
  }

  return {
    name: data.name.trim(),
    location: data.location.trim(),
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

app.get('/api/restaurants', async (c) => {
  const restaurants: Restaurant[] = []

  for await (
    const entry of kv.list<Restaurant>({ prefix: ['restaurants'] })
  ) {
    restaurants.push(entry.value)
  }

  return c.json(restaurants)
})

// RESTAURANT ERSTELLEN

app.post('/api/restaurants', async (c) => {
  const data = validateRestaurant(await readJson(c))

  if (!data) {
    return c.json({ error: 'Ungültige Restaurantdaten' }, 400)
  }

  const restaurant: Restaurant = {
    id: crypto.randomUUID(),
    ...data
  }

  await kv.set(['restaurants', restaurant.id], restaurant)

  return c.json(restaurant, 201)
})

// RESTAURANT BEARBEITEN

app.put('/api/restaurants/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await kv.get<Restaurant>(['restaurants', id])

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

  await kv.set(['restaurants', id], updatedRestaurant)

  return c.json(updatedRestaurant)
})

// RESTAURANT LÖSCHEN

app.delete('/api/restaurants/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await kv.get<Restaurant>(['restaurants', id])

  if (!existing.value) {
    return c.json({ error: 'Restaurant nicht gefunden' }, 404)
  }

  // Auch alle zugehörigen Besuche entfernen
  for await (
    const entry of kv.list({ prefix: ['visits', id] })
  ) {
    await kv.delete(entry.key)
  }

  await kv.delete(['restaurants', id])

  return c.json({ message: 'Restaurant gelöscht' })
})

// BESUCHE ABRUFEN

app.get('/api/restaurants/:id/visits', async (c) => {
  const restaurantId = c.req.param('id')

  const restaurant = await kv.get<Restaurant>([
    'restaurants',
    restaurantId
  ])

  if (!restaurant.value) {
    return c.json({ error: 'Restaurant nicht gefunden' }, 404)
  }

  const visits: Visit[] = []

  for await (
    const entry of kv.list<Visit>({
      prefix: ['visits', restaurantId]
    })
  ) {
    visits.push(entry.value)
  }

  visits.sort((a, b) => b.date.localeCompare(a.date))

  return c.json(visits)
})

// BESUCH ERSTELLEN

app.post('/api/restaurants/:id/visits', async (c) => {
  const restaurantId = c.req.param('id')

  const restaurant = await kv.get<Restaurant>([
    'restaurants',
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

  await kv.set(['visits', restaurantId, visit.id], visit)

  return c.json(visit, 201)
})

// NEU: BESUCH BEARBEITEN

app.put('/api/restaurants/:id/visits/:visitId', async (c) => {
  const restaurantId = c.req.param('id')
  const visitId = c.req.param('visitId')

  const key: Deno.KvKey = ['visits', restaurantId, visitId]

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

// NEU: BESUCH LÖSCHEN

app.delete('/api/restaurants/:id/visits/:visitId', async (c) => {
  const restaurantId = c.req.param('id')
  const visitId = c.req.param('visitId')

  const key: Deno.KvKey = ['visits', restaurantId, visitId]

  const existing = await kv.get<Visit>(key)

  if (!existing.value) {
    return c.json({ error: 'Besuch nicht gefunden' }, 404)
  }

  await kv.delete(key)

  return c.json({ message: 'Besuch gelöscht' })
})

// SERVER STARTEN

Deno.serve({ port: 8000 }, app.fetch)
