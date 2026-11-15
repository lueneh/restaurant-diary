import { getCookie } from 'hono/cookie'
import type { Context } from 'hono'

import { kv } from '../db.ts'
import type { User } from '../types/user.ts'

export const SESSION_COOKIE = 'restaurant_session'

type Session = {
  userId: string
  expiresAt: number
}

// Sitzungstoken hashen
export async function hashSessionToken(
  token: string
): Promise<string> {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Angemeldeten Benutzer ermitteln
export async function getAuthenticatedUser(
  c: Context
): Promise<User | null> {
  const token = getCookie(c, SESSION_COOKIE)

  if (!token) {
    return null
  }

  const tokenHash = await hashSessionToken(token)

  const sessionEntry = await kv.get<Session>([
    'sessions',
    tokenHash
  ])

  const session = sessionEntry.value

  if (!session || session.expiresAt <= Date.now()) {
    return null
  }

  const userEntry = await kv.get<User>([
    'users',
    session.userId
  ])

  return userEntry.value
}