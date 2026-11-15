const ITERATIONS = 600_000
const SALT_LENGTH = 16
const HASH_LENGTH = 32

// Bytes in eine hexadezimale Zeichenfolge umwandeln
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Hexadezimale Zeichenfolge in Bytes umwandeln
function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2)

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }

  return bytes
}

// Passwort sicher hashen
export async function hashPassword(
  password: string
): Promise<string> {
  const salt = crypto.getRandomValues(
    new Uint8Array(SALT_LENGTH)
  )

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    key,
    HASH_LENGTH * 8
  )

  const hash = new Uint8Array(derivedBits)

  return `pbkdf2_sha256$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`
}

// Passwort überprüfen
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split('$')

  if (parts.length !== 4) return false

  const [algorithm, iterationsText, saltHex, hashHex] = parts

  if (algorithm !== 'pbkdf2_sha256') return false

  const iterations = Number(iterationsText)

  if (
    !Number.isSafeInteger(iterations) ||
    iterations !== ITERATIONS ||
    !/^[0-9a-f]{32}$/.test(saltHex) ||
    !/^[0-9a-f]{64}$/.test(hashHex)
  ) {
    return false
  }

  const salt = fromHex(saltHex)
  const expectedHash = fromHex(hashHex)

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    key,
    expectedHash.length * 8
  )

  const actualHash = new Uint8Array(derivedBits)

  // Vergleich ohne vorzeitigen Abbruch
  let difference = 0

  for (let i = 0; i < expectedHash.length; i++) {
    difference |= expectedHash[i] ^ actualHash[i]
  }

  return difference === 0
}