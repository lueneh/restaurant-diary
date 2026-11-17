<script setup lang="ts">
import type { Restaurant } from '../types'

defineProps<{
  restaurant: Restaurant
  averageRating: number | null
  visitCount: number
}>()

const emit = defineEmits<{
  (e: 'select', restaurant: Restaurant): void
  (e: 'edit', restaurant: Restaurant): void
  (e: 'delete', restaurant: Restaurant): void
}>()
</script>

<template>
  <article class="restaurant-card">
    <div class="restaurant-card-top">
      <span class="cuisine-tag">
        {{ restaurant.cuisine }}
      </span>

      <span class="card-symbol">✳</span>
    </div>

    <h3>{{ restaurant.name }}</h3>

    <p class="location-text">
      📍 {{ restaurant.location }}
    </p>

    <p v-if="restaurant.address" class="location-text">
      {{ restaurant.address }}
    </p>

    <div class="rating-row">
      <template v-if="averageRating !== null">
        <span class="rating-star">★</span>
        <span class="rating-value">
          {{ averageRating.toFixed(1).replace('.', ',') }} / 5
        </span>
        <span class="rating-count">
          {{ visitCount }}
          {{ visitCount === 1 ? 'Besuch' : 'Besuche' }}
        </span>
      </template>

      <span v-else class="no-rating">
        Noch keine Bewertungen
      </span>
    </div>

    <div class="card-actions">
      <button
        class="view-button"
        type="button"
        @click="emit('select', restaurant)"
      >
        Besuche ansehen
      </button>

      <div class="small-actions">
        <button
          class="text-button"
          type="button"
          @click="emit('edit', restaurant)"
        >
          Bearbeiten
        </button>

        <button
          class="text-button delete-text"
          type="button"
          @click="emit('delete', restaurant)"
        >
          Löschen
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.restaurant-card {
  background: #fff;
  border: 1px solid #e9eae4;
  border-radius: 18px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  min-height: 210px;
  box-shadow: 0 5px 20px rgba(36, 59, 49, 0.03);
  transition: transform 0.2s, box-shadow 0.2s;
}

.restaurant-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(36, 59, 49, 0.08);
}

.restaurant-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
}

.cuisine-tag {
  background: #eef4ed;
  color: #477b58;
  border-radius: 20px;
  padding: 7px 11px;
  font-size: 11px;
  font-weight: 700;
}

.card-symbol {
  color: #c8d8c8;
  font-size: 25px;
}

.restaurant-card h3 {
  font-size: 21px;
  margin: 0 0 10px;
}

.location-text {
  color: #829087;
  font-size: 14px;
  margin: 0;
}

.rating-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 16px;
}

.rating-star {
  color: #d6a342;
  font-size: 20px;
}

.rating-value {
  color: #243b31;
  font-size: 14px;
  font-weight: 800;
}

.rating-count,
.no-rating {
  color: #829087;
  font-size: 12px;
}

.card-actions {
  margin-top: auto;
  padding-top: 28px;
}

.view-button {
  width: 100%;
  padding: 12px;
  background: #e8f1e9;
  color: #286b50;
  border: none;
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.view-button:hover {
  background: #d8e8da;
}

.small-actions {
  display: flex;
  justify-content: center;
  gap: 22px;
  margin-top: 14px;
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

.delete-text {
  color: #b16a64;
}
</style>