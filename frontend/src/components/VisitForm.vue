<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { VisitInput } from '../types'

type VisitFormData = VisitInput

const props = defineProps<{
  initialData: VisitFormData | null
  editing: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'save', data: VisitInput): void
  (e: 'cancel'): void
}>()

// Das Datum für das Eingabefeld aus der lokalen Zeit bilden, damit ein UTC-Tageswechsel den Standardwert nicht verschiebt.
function todayLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const visitDate = ref(todayLocal())
const foodRating = ref(5)
const serviceRating = ref(5)
const ambienceRating = ref(5)
const valueRating = ref(5)
const visitNote = ref('')

// Formular aktualisieren, wenn ein Besuch bearbeitet wird
watch(
  () => props.initialData,
  (data) => {
    visitDate.value = data?.date ?? todayLocal()
    foodRating.value = data?.foodRating ?? 5
    serviceRating.value = data?.serviceRating ?? 5
    ambienceRating.value = data?.ambienceRating ?? 5
    valueRating.value = data?.valueRating ?? 5
    visitNote.value = data?.note ?? ''
  },
  { immediate: true }
)

// Gesamtbewertung automatisch berechnen
const newVisitRating = computed(() => {
  const average = (
    foodRating.value +
    serviceRating.value +
    ambienceRating.value +
    valueRating.value
  ) / 4

  return average.toFixed(1).replace('.', ',')
})

function submitForm() {
  if (props.loading || !visitDate.value) return

  emit('save', {
    date: visitDate.value,
    foodRating: foodRating.value,
    serviceRating: serviceRating.value,
    ambienceRating: ambienceRating.value,
    valueRating: valueRating.value,
    note: visitNote.value.trim()
  })
}
</script>

<template>
  <div class="visit-form-panel">
    <h3>
      {{ editing ? 'Besuch bearbeiten' : 'Neuen Besuch eintragen' }}
    </h3>

    <p class="section-description">
      {{
        editing
          ? 'Ändere die Bewertungen oder deine Notiz.'
          : 'Bewerte deinen Besuch nach vier Kriterien.'
      }}
    </p>

    <form
      class="restaurant-form"
      @submit.prevent="submitForm"
    >
      <label>
        Besuchsdatum

        <input
          v-model="visitDate"
          type="date"
          required
        >
      </label>

      <!-- BEWERTUNGSKRITERIEN -->
      <div class="rating-criteria">
        <div class="criterion">
          <div class="criterion-label">
            <strong>🍝 Essen</strong>
            <span>Geschmack und Qualität</span>
          </div>

          <select
            v-model.number="foodRating"
            aria-label="Essen bewerten"
          >
            <option :value="5">★★★★★</option>
            <option :value="4">★★★★☆</option>
            <option :value="3">★★★☆☆</option>
            <option :value="2">★★☆☆☆</option>
            <option :value="1">★☆☆☆☆</option>
          </select>
        </div>

        <div class="criterion">
          <div class="criterion-label">
            <strong>🤝 Service</strong>
            <span>Freundlichkeit und Betreuung</span>
          </div>

          <select
            v-model.number="serviceRating"
            aria-label="Service bewerten"
          >
            <option :value="5">★★★★★</option>
            <option :value="4">★★★★☆</option>
            <option :value="3">★★★☆☆</option>
            <option :value="2">★★☆☆☆</option>
            <option :value="1">★☆☆☆☆</option>
          </select>
        </div>

        <div class="criterion">
          <div class="criterion-label">
            <strong>✨ Ambiente</strong>
            <span>Atmosphäre und Einrichtung</span>
          </div>

          <select
            v-model.number="ambienceRating"
            aria-label="Ambiente bewerten"
          >
            <option :value="5">★★★★★</option>
            <option :value="4">★★★★☆</option>
            <option :value="3">★★★☆☆</option>
            <option :value="2">★★☆☆☆</option>
            <option :value="1">★☆☆☆☆</option>
          </select>
        </div>

        <div class="criterion">
          <div class="criterion-label">
            <strong>💶 Preis-Leistung</strong>
            <span>War es den Preis wert?</span>
          </div>

          <select
            v-model.number="valueRating"
            aria-label="Preis-Leistung bewerten"
          >
            <option :value="5">★★★★★</option>
            <option :value="4">★★★★☆</option>
            <option :value="3">★★★☆☆</option>
            <option :value="2">★★☆☆☆</option>
            <option :value="1">★☆☆☆☆</option>
          </select>
        </div>
      </div>

      <!-- GESAMTBEWERTUNG -->
      <div class="new-rating-preview">
        <span>Gesamtbewertung</span>

        <strong>
          ★ {{ newVisitRating }} / 5
        </strong>
      </div>

      <!-- NOTIZ -->
      <label>
        Deine Notiz

        <textarea
          v-model="visitNote"
          placeholder="Was hast du gegessen? Wie war die Atmosphäre?"
          rows="4"
        ></textarea>
      </label>

      <button
        class="primary-button"
        type="submit"
        :disabled="loading"
      >
        {{
          loading
            ? 'Speichert ...'
            : editing
              ? 'Änderungen speichern'
              : 'Besuch speichern'
        }}
      </button>

      <button
        v-if="editing"
        class="secondary-button"
        type="button"
        :disabled="loading"
        @click="emit('cancel')"
      >
        Bearbeitung abbrechen
      </button>
    </form>
  </div>
</template>

<style scoped>
.visit-form-panel {
  min-width: 0;
}

.visit-form-panel h3 {
  font-size: 20px;
  margin: 0;
}

.section-description {
  color: #849087;
  font-size: 14px;
  line-height: 1.6;
  margin: 12px 0 24px;
}

.restaurant-form {
  display: grid;
  gap: 18px;
}

.restaurant-form label {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.restaurant-form input,
.restaurant-form select,
.restaurant-form textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 13px 14px;
  border: 1px solid #dfe4dc;
  border-radius: 10px;
  background: #fff;
  color: #243b31;
  font: inherit;
  font-weight: 400;
  outline: none;
}

.restaurant-form input:focus,
.restaurant-form select:focus,
.restaurant-form textarea:focus {
  border-color: #39825c;
  box-shadow: 0 0 0 3px rgba(57, 130, 92, 0.1);
}

.restaurant-form textarea {
  resize: vertical;
}

.rating-criteria {
  display: grid;
  gap: 12px;
}

.criterion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 13px;
  background: #f8faf6;
  border: 1px solid #e8eee5;
  border-radius: 12px;
}

.criterion-label {
  display: grid;
  gap: 5px;
}

.criterion-label strong {
  font-size: 13px;
}

.criterion-label span {
  color: #89958c;
  font-size: 11px;
}

.restaurant-form .criterion select {
  width: 135px;
  padding: 9px;
  color: #a87b28;
  font-size: 17px;
}

.new-rating-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #e8f1e9;
  border-radius: 12px;
  font-size: 13px;
}

.new-rating-preview strong {
  color: #286b50;
  font-size: 20px;
}

.primary-button,
.secondary-button {
  border: none;
  border-radius: 10px;
  padding: 13px 18px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  background: #286b50;
  color: white;
}

.primary-button:hover {
  background: #20563f;
}

.secondary-button {
  background: #edf1ec;
  color: #3b5747;
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .criterion {
    align-items: flex-start;
    flex-direction: column;
  }

  .restaurant-form .criterion select {
    width: 100%;
  }
}
</style>