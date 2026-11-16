<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import type {
  Restaurant,
  Visit,
  VisitInput
} from '../types'

import VisitForm from './VisitForm.vue'
import VisitCard from './VisitCard.vue'

const props = defineProps<{
  restaurant: Restaurant
  visits: Visit[]
  visitError: string
  visitLoading: boolean
  editingVisitId: string | null
  editingVisit: VisitInput | null
  visitFormKey: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save-visit', data: VisitInput): void
  (e: 'edit-visit', visit: Visit): void
  (e: 'delete-visit', visit: Visit): void
  (e: 'cancel-edit'): void
}>()

const visitFormElement = ref<HTMLElement | null>(null)

// Durchschnitt aller Besuche berechnen
const averageRating = computed(() => {
  if (props.visits.length === 0) {
    return '–'
  }

  const sum = props.visits.reduce(
    (total, visit) => total + visit.rating,
    0
  )

  return (sum / props.visits.length)
    .toFixed(1)
    .replace('.', ',')
})

// Beim Bearbeiten zum Besuchsformular scrollen
watch(
  () => props.editingVisitId,
  async (id) => {
    if (!id) return

    await nextTick()

    visitFormElement.value?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
)
</script>

<template>
  <section class="visits-section">

    <!-- RESTAURANTINFORMATIONEN -->
    <div class="visits-header">
      <div>
        <span class="eyebrow">
          RESTAURANT-DETAILS
        </span>

        <h2>{{ restaurant.name }}</h2>

        <p>
          {{ restaurant.location }}
          ·
          {{ restaurant.cuisine }}
        </p>

        <p v-if="restaurant.address" class="restaurant-address">
         📍 {{ restaurant.address }}
        </p>
      </div>

      <button
        class="secondary-button"
        type="button"
        @click="emit('close')"
      >
        ✕ Schließen
      </button>
    </div>

    <!-- DURCHSCHNITTSBEWERTUNG -->
    <div class="rating-summary">
      <div class="rating-number">
        <span class="rating-star">★</span>

        <strong>{{ averageRating }}</strong>
      </div>

      <div>
        <strong>
          Deine Durchschnittsbewertung
        </strong>

        <p>
          Basierend auf {{ visits.length }}
          {{
            visits.length === 1
              ? 'Besuch'
              : 'Besuchen'
          }}
        </p>
      </div>
    </div>

    <!-- FEHLERMELDUNG -->
    <p
      v-if="visitError"
      class="error-message"
    >
      {{ visitError }}
    </p>

    <!-- FORMULAR UND BESUCHSHISTORIE -->
    <div class="visits-content">

      <!-- BESUCHSFORMULAR -->
      <div
        ref="visitFormElement"
        class="visit-form-wrapper"
      >
        <VisitForm
          :key="visitFormKey"
          :initial-data="editingVisit"
          :editing="editingVisitId !== null"
          :loading="visitLoading"
          @save="emit('save-visit', $event)"
          @cancel="emit('cancel-edit')"
        />
      </div>

      <!-- BESUCHSHISTORIE -->
      <div class="visit-history">
        <h3>Meine Besuche</h3>

        <div
          v-if="visits.length === 0"
          class="empty-visits"
        >
          <span>✍️</span>

          <p>
            Noch keine Besuche eingetragen.
          </p>
        </div>

        <div v-else class="visit-list">
          <VisitCard
            v-for="visit in visits"
            :key="visit.id"
            :visit="visit"
            :loading="visitLoading"
            @edit="emit('edit-visit', $event)"
            @delete="emit('delete-visit', $event)"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.visits-section {
  margin-top: 60px;
  padding: 36px;
  background: var(--color-surface);
  border: 1px solid #e9eae4;
  border-radius: var(--radius-large);
}

.visits-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 20px;
}

.visits-header h2 {
  font-size: 30px;
  margin: 0 0 8px;
}

.visits-header p {
  color: var(--color-muted);
  margin: 0;
}

.restaurant-address {
  margin-top: 8px !important;
  font-size: 14px;
}

.rating-summary {
  display: flex;
  align-items: center;
  gap: 22px;
  margin: 30px 0;
  padding: 24px;
  background: var(--color-primary-soft);
  border-radius: var(--radius-medium);
}

.rating-number {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rating-star {
  color: var(--color-gold);
  font-size: 30px;
}

.rating-number strong {
  font-size: 34px;
}

.rating-summary p {
  color: var(--color-muted);
  margin: 6px 0 0;
  font-size: 13px;
}

.visits-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 40px;
  padding-top: 15px;
}

.visit-form-wrapper {
  min-width: 0;
}

.visit-history h3 {
  font-size: 20px;
  margin: 0 0 24px;
}

.visit-list {
  display: grid;
  gap: 14px;
}

.empty-visits {
  padding: 36px 20px;
  background: #fafbf8;
  border: 1px dashed #d4dfd2;
  border-radius: 14px;
  text-align: center;
}

.empty-visits span {
  font-size: 30px;
}

.empty-visits p {
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .visits-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .visits-section {
    padding: 22px;
  }

  .visits-header,
  .rating-summary {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>