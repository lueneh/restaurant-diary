
<script setup lang="ts">
import type { Visit } from '../types'

// Daten von App.vue empfangen
defineProps<{
  visit: Visit
  loading: boolean
}>()

// Ereignisse an App.vue senden
const emit = defineEmits<{
  (e: 'edit', visit: Visit): void
  (e: 'delete', visit: Visit): void
}>()

// Datum auf Deutsch formatieren
function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    'de-DE',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }
  )
}

// Bewertung mit einer Nachkommastelle anzeigen
function displayRating(rating: number): string {
  return rating.toFixed(1).replace('.', ',')
}
</script>

<template>
  <article class="visit-card">

    <!-- DATUM UND GESAMTBEWERTUNG -->
    <div class="visit-top">
      <strong>
        {{ formatDate(visit.date) }}
      </strong>

      <span class="visit-total">
        ★ {{ displayRating(visit.rating) }}
      </span>
    </div>

    <!-- EINZELBEWERTUNGEN -->
    <div
      v-if="
        visit.foodRating !== undefined &&
        visit.serviceRating !== undefined &&
        visit.ambienceRating !== undefined &&
        visit.valueRating !== undefined
      "
      class="visit-criteria"
    >
      <div>
        <span>Essen</span>
        <strong>{{ visit.foodRating }}/5</strong>
      </div>

      <div>
        <span>Service</span>
        <strong>{{ visit.serviceRating }}/5</strong>
      </div>

      <div>
        <span>Ambiente</span>
        <strong>{{ visit.ambienceRating }}/5</strong>
      </div>

      <div>
        <span>Preis-Leistung</span>
        <strong>{{ visit.valueRating }}/5</strong>
      </div>
    </div>

    <!-- NOTIZ -->
    <p v-if="visit.note">
      {{ visit.note }}
    </p>

    <p v-else class="muted-text">
      Keine Notiz hinterlegt.
    </p>

    <!-- AKTIONEN -->
    <div class="visit-actions">
      <button
        class="text-button"
        type="button"
        :disabled="loading"
        @click="emit('edit', visit)"
      >
        Bearbeiten
      </button>

      <button
        class="text-button delete-text"
        type="button"
        :disabled="loading"
        @click="emit('delete', visit)"
      >
        Löschen
      </button>
    </div>
  </article>
</template>

<style scoped>
.visit-card {
  padding: 20px;
  background: #fafbf8;
  border: 1px solid #e8ece5;
  border-radius: 13px;
}

.visit-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.visit-top strong {
  font-size: 13px;
}

.visit-total {
  color: #a87b28;
  font-weight: 800;
  font-size: 17px;
}

.visit-criteria {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 18px;
}

.visit-criteria div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #6f7e72;
}

.visit-criteria strong {
  color: #334c3a;
}

.visit-card p {
  margin: 14px 0 0;
  color: #647368;
  line-height: 1.6;
  font-size: 14px;
}

.visit-actions {
  display: flex;
  justify-content: flex-start;
  gap: 22px;
  border-top: 1px solid #e8ece5;
  padding-top: 15px;
  margin-top: 20px;
}

.text-button {
  border: none;
  background: transparent;
  color: #78877c;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.text-button:hover {
  text-decoration: underline;
}

.text-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-text {
  color: #b16a64;
}

.muted-text {
  color: #829087;
}

@media (max-width: 600px) {
  .visit-top {
    align-items: flex-start;
    flex-direction: column;
  }

  .visit-criteria {
    grid-template-columns: 1fr;
  }
}
</style>
