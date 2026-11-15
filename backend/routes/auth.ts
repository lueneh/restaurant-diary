import { Hono } from 'hono'

import { kv } from '../db.ts'
import { hashPassword } from '../services/auth.ts'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { verifyPassword } from '../services/auth.ts'

import {
  SESSION_COOKIE,
  hashSessionToken,
  getAuthenticatedUser
} from '../services/session.ts'

import type {
  User,
  PublicUser
} from '../types/user.ts'

export const authRoutes = new Hono()

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000

type Session = {
  userId: string
  expiresAt: number
}

// Zufälliges Sitzungstoken erstellen
function createSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Cookie-Einstellungen
function cookieOptions(c: { req: { url: string } }) {
  return {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax' as const,
    path: '/',
  }
}

// ========================================
// REGISTRIERUNG
// ========================================

authRoutes.post('/register', async (c) => {
  // JSON-Daten einlesen
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json(
      { error: 'Ungültige JSON-Daten' },
      400
    )
  }

  // Eingaben überprüfen
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return c.json(
      { error: 'Ungültige Eingaben' },
      400
    )
  }

  const data = body as Record<string, unknown>

  if (
    typeof data.username !== 'string' ||
    typeof data.password !== 'string'
  ) {
    return c.json(
      { error: 'Benutzername und Passwort sind erforderlich' },
      400
    )
  }

  const username = data.username.trim()
  const password = data.password

  // Benutzername: 3–20 Zeichen
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
    return c.json(
      {
        error: 'Der Benutzername muss 3–20 Zeichen lang sein und darf nur Buchstaben, Zahlen, _ und - enthalten.'
      },
      400
    )
  }

  // Passwort: mindestens 12 Zeichen
  if (
    password.length < 12 ||
    password.length > 128
  ) {
    return c.json(
      {
        error: 'Das Passwort muss zwischen 12 und 128 Zeichen lang sein.'
      },
      400
    )
  }

  // Benutzernamen unabhängig von Großschreibung vergleichen
  const usernameKey = username.toLowerCase()

  // Prüfen, ob der Benutzername bereits vergeben ist
  const existing = await kv.get<string>([
    'usernames',
    usernameKey
  ])

  if (existing.value !== null) {
    return c.json(
      { error: 'Benutzername ist bereits vergeben' },
      409
    )
  }

  // Passwort hashen
  const passwordHash = await hashPassword(password)

  // Benutzer erstellen
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash,
    createdAt: new Date().toISOString()
  }

  // Benutzer und eindeutigen Namen atomar speichern
  const result = await kv.atomic()
    .check(existing)
    .set(['users', user.id], user)
    .set(['usernames', usernameKey], user.id)
    .commit()

  if (!result.ok) {
    return c.json(
      { error: 'Benutzername ist bereits vergeben' },
      409
    )
  }

  // Passwort-Hash niemals zurückgeben
  const publicUser: PublicUser = {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  }

  return c.json(
    {
      message: 'Registrierung erfolgreich',
      user: publicUser
    },
    201
  )
})

// ========================================
// LOGIN
// ========================================

authRoutes.post('/login', async (c) => {
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Ungültige JSON-Daten' }, 400)
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return c.json({ error: 'Ungültige Eingaben' }, 400)
  }

  const data = body as Record<string, unknown>

  if (
    typeof data.username !== 'string' ||
    typeof data.password !== 'string'
  ) {
    return c.json(
      { error: 'Benutzername und Passwort erforderlich' },
      400
    )
  }

  const username = data.username.trim().toLowerCase()
  const password = data.password

  if (username.length > 20 || password.length > 128) {
    return c.json(
      { error: 'Benutzername oder Passwort falsch' },
      401
    )
  }

  // Benutzer-ID anhand des Benutzernamens suchen
  const usernameEntry = await kv.get<string>([
    'usernames',
    username
  ])

  if (!usernameEntry.value) {
    return c.json(
      { error: 'Benutzername oder Passwort falsch' },
      401
    )
  }

  // Benutzer laden
  const userEntry = await kv.get<User>([
    'users',
    usernameEntry.value
  ])

  const user = userEntry.value

  if (!user) {
    return c.json(
      { error: 'Benutzername oder Passwort falsch' },
      401
    )
  }

  // Passwort überprüfen
  const passwordCorrect = await verifyPassword(
    password,
    user.passwordHash
  )

  if (!passwordCorrect) {
    return c.json(
      { error: 'Benutzername oder Passwort falsch' },
      401
    )
  }

  // Sitzung erstellen
  const token = createSessionToken()
  const tokenHash = await hashSessionToken(token)

  const session: Session = {
    userId: user.id,
    expiresAt: Date.now() + SESSION_DURATION
  }

  await kv.set(
    ['sessions', tokenHash],
    session,
    { expireIn: SESSION_DURATION }
  )

  // Cookie setzen
  setCookie(c, SESSION_COOKIE, token, {
    ...cookieOptions(c),
    maxAge: SESSION_DURATION / 1000
  })

  const publicUser: PublicUser = {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  }

  return c.json({
    message: 'Login erfolgreich',
    user: publicUser
  })
})

// ========================================
// AKTUELLER BENUTZER
// ========================================

authRoutes.get('/me', async (c) => {
  const user = await getAuthenticatedUser(c)

  if (!user) {
    return c.json({ error: 'Nicht angemeldet' }, 401)
  }

  const publicUser: PublicUser = {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  }

  return c.json({ user: publicUser })
})

// ========================================
// LOGOUT
// ========================================

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE)

  if (token) {
    const tokenHash = await hashSessionToken(token)

    // Sitzung aus Deno KV löschen
    await kv.delete(['sessions', tokenHash])
  }

  // Cookie aus dem Browser entfernen
  deleteCookie(c, SESSION_COOKIE, cookieOptions(c))

  return c.json({
    message: 'Erfolgreich abgemeldet'
  })
})