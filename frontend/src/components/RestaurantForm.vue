<script setup lang="ts">
import { ref, watch } from 'vue'
import type { RestaurantInput } from '../types'

// Daten von App.vue empfangen
const props = defineProps<{
  initialData: RestaurantInput | null
  loading: boolean
  error: string
}>()

// Ereignisse an App.vue senden
const emit = defineEmits<{
  (e: 'save', data: RestaurantInput): void
  (e: 'cancel'): void
}>()

// Formularfelder
const name = ref('')
const location = ref('')
const address = ref('')
const cuisine = ref('')

// Formular aktualisieren, wenn ein Restaurant
// zum Bearbeiten ausgewählt wird
watch(
  () => props.initialData,
  (restaurant) => {
    name.value = restaurant?.name ?? ''
    location.value = restaurant?.location ?? ''
    address.value = restaurant?.address ?? ''
    cuisine.value = restaurant?.cuisine ?? ''
  },
  { immediate: true }
)

// Formulardaten an App.vue übergeben
function submitForm() {
  const data: RestaurantInput = {
    name: name.value.trim(),
    location: location.value.trim(),
    address: address.value.trim(),
    cuisine: cuisine.value.trim()
  }

  if (!data.name || !data.location || !data.cuisine) {
    return
  }

  emit('save', data)
}

// Bearbeitung abbrechen
function cancelEditing() {
  emit('cancel')
}
</script>

<template>
  <section class="panel form-panel">
    <div class="section-heading">
      <span class="section-icon">＋</span>

      <h2>
        {{
          initialData
            ? 'Restaurant bearbeiten'
            : 'Neues Restaurant'
        }}
      </h2>
    </div>

    <p class="section-description">
      {{
        initialData
          ? 'Passe die Informationen zu deinem Restaurant an.'
          : 'Füge einen neuen Ort zu deiner Sammlung hinzu.'
      }}
    </p>

    <form
      class="restaurant-form"
      @submit.prevent="submitForm"
    >
      <label>
        Restaurantname
        <input
          v-model="name"
          placeholder="z. B. Bella Italia"
          required
        >
      </label>

      <label>
        Ort
        <input
          v-model="location"
          placeholder="z. B. Mosbach"
          required
        >
      </label>

      <label>
        Adresse (optional)
        <input
          v-model="address"
          placeholder="z. B. Hauptstraße 12"
        >
      </label>

      <label>
        Küche
        <input
          v-model="cuisine"
          placeholder="z. B. Italienisch"
          required
        >
      </label>

      <button
        class="primary-button"
        type="submit"
        :disabled="loading"
      >
        {{
          loading
            ? 'Speichert ...'
            : initialData
              ? 'Änderungen speichern'
              : 'Restaurant hinzufügen'
        }}
      </button>

      <button
        v-if="initialData"
        class="secondary-button"
        type="button"
        :disabled="loading"
        @click="cancelEditing"
      >
        Abbrechen
      </button>
    </form>

    <p v-if="error" class="error-message">
      {{ error }}
    </p>
  </section>
</template>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid #e9eae4;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 8px 30px rgba(36, 59, 49, 0.04);
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-heading h2 {
  font-size: 20px;
  margin: 0;
}

.section-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: #e7f1e9;
  color: #286b50;
  border-radius: 10px;
  font-size: 23px;
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

.restaurant-form input {
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

.restaurant-form input:focus {
  border-color: #39825c;
  box-shadow: 0 0 0 3px rgba(57, 130, 92, 0.1);
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

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-button {
  background: #edf1ec;
  color: #3b5747;
}

.error-message {
  color: #b83b3b;
  font-size: 13px;
  margin-top: 14px;
}

@media (max-width: 600px) {
  .panel {
    padding: 22px;
  }
}
</style>
