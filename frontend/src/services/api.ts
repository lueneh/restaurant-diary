import type {
  Restaurant,
  RestaurantInput,
  Visit,
  VisitInput
} from '../types'

// Gemeinsame Funktion zur Fehlerbehandlung
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `HTTP-Fehler ${response.status}`

    try {
      const data: { error?: string } = await response.json()

      if (data.error) {
        message = data.error
      }
    } catch {
      // Falls die Antwort kein JSON enthält
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}

// RESTAURANTS

export async function getRestaurants(): Promise<Restaurant[]> {
  const response = await fetch('/api/restaurants')

  return handleResponse<Restaurant[]>(response)
}

export async function createRestaurant(
  data: RestaurantInput
): Promise<Restaurant> {
  const response = await fetch('/api/restaurants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  return handleResponse<Restaurant>(response)
}

export async function updateRestaurant(
  id: string,
  data: RestaurantInput
): Promise<Restaurant> {
  const response = await fetch(`/api/restaurants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  return handleResponse<Restaurant>(response)
}

export async function deleteRestaurant(id: string): Promise<void> {
  const response = await fetch(`/api/restaurants/${id}`, {
    method: 'DELETE'
  })

  await handleResponse<{ message: string }>(response)
}

// BESUCHE

export async function getVisits(
  restaurantId: string
): Promise<Visit[]> {
  const response = await fetch(
    `/api/restaurants/${restaurantId}/visits`
  )

  return handleResponse<Visit[]>(response)
}

export async function createVisit(
  restaurantId: string,
  data: VisitInput
): Promise<Visit> {
  const response = await fetch(
    `/api/restaurants/${restaurantId}/visits`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  )

  return handleResponse<Visit>(response)
}

export async function updateVisit(
  restaurantId: string,
  visitId: string,
  data: VisitInput
): Promise<Visit> {
  const response = await fetch(
    `/api/restaurants/${restaurantId}/visits/${visitId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  )

  return handleResponse<Visit>(response)
}

export async function deleteVisit(
  restaurantId: string,
  visitId: string
): Promise<void> {
  const response = await fetch(
    `/api/restaurants/${restaurantId}/visits/${visitId}`,
    {
      method: 'DELETE'
    }
  )

  await handleResponse<{ message: string }>(response)
}

 // ========================================
 // BENUTZERVERWALTUNG
 // ========================================

export type AuthUser = {
  id: string
  username: string
  createdAt: string
}

type AuthResponse = {
  message: string
  user: AuthUser
}

// Benutzer registrieren
export async function register(
  username: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })

  return handleResponse<AuthResponse>(response)
}

// Benutzer anmelden
export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })

  return handleResponse<AuthResponse>(response)
}

// Aktuelle Sitzung prüfen
export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', {
    credentials: 'include'
  })

  if (response.status === 401) {
    return null
  }

  const data = await handleResponse<{ user: AuthUser }>(response)
  return data.user
}

// Benutzer abmelden
export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  })

  await handleResponse<{ message: string }>(response)
}