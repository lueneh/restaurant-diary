<script setup lang="ts">
import { computed } from 'vue'

// Die benannten v-model-Bindungen halten die Eingaben mit dem Filterzustand in App.vue synchron.
const search = defineModel<string>('search', {
  default: ''
})

const cuisine = defineModel<string>('cuisine', {
  default: ''
})

const sort = defineModel<string>('sort', {
  default: 'az'
})

const props = defineProps<{
  cuisines: string[]
}>()

// Für die Auswahlliste eine sortierte Kopie erzeugen, damit die übergebene Liste unverändert bleibt.
const cuisineOptions = computed(() =>
  [...props.cuisines].sort((a, b) =>
    a.localeCompare(b, 'de')
  )
)

function resetFilters() {
  search.value = ''
  cuisine.value = ''
  sort.value = 'az'
}
</script>

<template>
  <div class="filters-panel">
    <div class="filter-heading">
      <div>
        <h3>Restaurants entdecken</h3>
        <p>Durchsuche und sortiere deine Sammlung.</p>
      </div>

      <button
        class="reset-button"
        type="button"
        @click="resetFilters"
      >
        Zurücksetzen
      </button>
    </div>

    <div class="filter-grid">
      <label class="search-field">
        <span>Suche</span>

        <input
          v-model="search"
          type="search"
          placeholder="Name oder Standort suchen ..."
        >
      </label>

      <label>
        <span>Küchenrichtung</span>

        <select v-model="cuisine">
          <option value="">Alle Küchen</option>

          <option
            v-for="item in cuisineOptions"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
        </select>
      </label>

      <label>
        <span>Sortieren nach</span>

        <select v-model="sort">
          <option value="az">Name A–Z</option>
          <option value="za">Name Z–A</option>
        </select>
      </label>
    </div>
  </div>
</template>

<style scoped>
.filters-panel {
  margin-bottom: 24px;
  padding: 22px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
}

.filter-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.filter-heading h3 {
  margin: 0 0 6px;
  font-size: 17px;
}

.filter-heading p {
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
}

.reset-button {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.reset-button:hover {
  text-decoration: underline;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) 1fr 1fr;
  gap: 14px;
}

.filter-grid label {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.filter-grid label span {
  font-size: 12px;
  font-weight: 700;
}

.filter-grid input,
.filter-grid select {
  width: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid #dfe4dc;
  border-radius: 10px;
  background: #fff;
  color: var(--color-text);
  font-size: 13px;
  outline: none;
}

.filter-grid input:focus,
.filter-grid select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(57, 130, 92, 0.1);
}

@media (max-width: 1100px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .filters-panel {
    padding: 18px;
  }

  .filter-heading {
    flex-direction: column;
  }
}
</style>