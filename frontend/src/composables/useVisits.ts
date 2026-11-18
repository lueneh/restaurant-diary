import { ref } from 'vue'

import type {
  Visit,
  VisitInput
} from '../types'

import {
  getVisits,
  createVisit,
  updateVisit,
  deleteVisit
} from '../services/api'

// Verwaltet die Besuchsliste und die Änderungen für das jeweils ausgewählte Restaurant.
export function useVisits() {
  const visits = ref<Visit[]>([])
  const visitError = ref('')
  const visitLoading = ref(false)

  // Aktuell ausgewähltes Restaurant
  const activeRestaurantId = ref<string | null>(null)

  // Verhindert, dass veraltete Anfragen
  // die Besuchsliste überschreiben
  let requestVersion = 0

  function selectRestaurant(id: string | null) {
    activeRestaurantId.value = id
    visits.value = []
    visitError.value = ''
    requestVersion++
  }

  // Besuche laden
  async function loadVisits() {
    const restaurantId = activeRestaurantId.value
    if (!restaurantId) return

    const currentVersion = ++requestVersion

    try {
      const data = await getVisits(restaurantId)

      if (
        activeRestaurantId.value === restaurantId &&
        currentVersion === requestVersion
      ) {
        visits.value = data
        visitError.value = ''
      }
    } catch (err) {
      if (
        activeRestaurantId.value === restaurantId &&
        currentVersion === requestVersion
      ) {
        visitError.value = 'Besuche konnten nicht geladen werden.'
      }

      console.error(err)
    }
  }

  // Besuch erstellen oder aktualisieren
  async function saveVisit(
    data: VisitInput,
    editingVisitId: string | null
  ): Promise<boolean> {
    const restaurantId = activeRestaurantId.value

    if (!restaurantId || visitLoading.value) {
      return false
    }

    visitError.value = ''
    visitLoading.value = true

    try {
      if (editingVisitId) {
        await updateVisit(
          restaurantId,
          editingVisitId,
          data
        )
      } else {
        await createVisit(restaurantId, data)
      }

      // Nur die noch aktive Detailansicht aktualisieren
      if (activeRestaurantId.value === restaurantId) {
        await loadVisits()
      }

      return true
    } catch (err) {
      if (activeRestaurantId.value === restaurantId) {
        visitError.value = 'Besuch konnte nicht gespeichert werden.'
      }

      console.error(err)
      return false
    } finally {
      visitLoading.value = false
    }
  }

  // Besuch löschen
  async function removeVisit(
    visit: Visit
  ): Promise<boolean> {
    const restaurantId = activeRestaurantId.value
    if (!restaurantId) return false

    const date = new Date(
      `${visit.date}T12:00:00`
    ).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })

    const confirmed = window.confirm(
      `Möchtest du den Besuch vom ${date} wirklich löschen?`
    )

    if (!confirmed) return false

    visitError.value = ''

    try {
      await deleteVisit(restaurantId, visit.id)

      if (activeRestaurantId.value === restaurantId) {
        await loadVisits()
      }

      return true
    } catch (err) {
      if (activeRestaurantId.value === restaurantId) {
        visitError.value = 'Besuch konnte nicht gelöscht werden.'
      }

      console.error(err)
      return false
    }
  }

  return {
    visits,
    visitError,
    visitLoading,
    activeRestaurantId,
    selectRestaurant,
    loadVisits,
    saveVisit,
    removeVisit
  }
}