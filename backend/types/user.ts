// Benutzer inklusive Passwort-Hash (nur Backend)
export type User = {
  id: string
  username: string
  passwordHash: string
  createdAt: string
}

// Öffentliche Benutzerdaten ohne Passwort-Hash
export type PublicUser = {
  id: string
  username: string
  createdAt: string
}