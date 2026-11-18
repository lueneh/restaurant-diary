import { ref } from 'vue'

import type {
  Restaurant,
  RestaurantInput
} from '../types'

import {
  getRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant
} from '../services/api'

// Bündelt die Restaurantliste, die API-Aufrufe und den Zustand für Speicherung und Fehler.
export function useRestaurants() {
  const restaurants = ref<Restaurant[]>([])
  const error = ref('')
  const loading = ref(false)

  // Restaurants laden
  async function loadRestaurants() {
    try {
      error.value = ''
      restaurants.value = await getRestaurants()
    } catch (err) {
      error.value = 'Restaurants konnten nicht geladen werden.'
      console.error(err)
    }
  }

  // Restaurant hinzufügen oder aktualisieren
  async function saveRestaurant(
    data: RestaurantInput,
    editingId: string | null
  ): Promise<Restaurant | null> {
    if (loading.value) return null

    error.value = ''
    loading.value = true

    try {
      const saved = editingId
        ? await updateRestaurant(editingId, data)
        : await createRestaurant(data)

      await loadRestaurants()

      return saved
    } catch (err) {
      error.value = 'Restaurant konnte nicht gespeichert werden.'
      console.error(err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Restaurant löschen
  async function removeRestaurant(
    restaurant: Restaurant
  ): Promise<boolean> {
    const confirmed = window.confirm(
      `Möchtest du "${restaurant.name}" wirklich löschen?`
    )

    if (!confirmed) return false

    error.value = ''

    try {
      await deleteRestaurant(restaurant.id)
      await loadRestaurants()
      return true
    } catch (err) {
      error.value = 'Restaurant konnte nicht gelöscht werden.'
      console.error(err)
      return false
    }
  }

  return {
    restaurants,
    error,
    loading,
    loadRestaurants,
    saveRestaurant,
    removeRestaurant
  }
}