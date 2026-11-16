<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type {
  Restaurant,
  Visit,
  RestaurantInput,
  VisitInput
} from './types'

import RestaurantCard from './components/RestaurantCard.vue'
import RestaurantForm from './components/RestaurantForm.vue'
import RestaurantDetail from './components/RestaurantDetail.vue'
import RestaurantFilters from './components/RestaurantFilters.vue'
import LoginForm from './components/LoginForm.vue'
import RegisterForm from './components/RegisterForm.vue'
import GroupsView from './components/GroupsView.vue'

import { useRestaurants } from './composables/useRestaurants'
import { useVisits } from './composables/useVisits'

import {
  getVisits,
  login,
  register,
  logout,
  getCurrentUser
} from './services/api'

import type { AuthUser } from './services/api'

// ========================================
// BENUTZERVERWALTUNG
// ========================================

const currentUser = ref<AuthUser | null>(null)
const authChecking = ref(true)
const authLoading = ref(false)
const authError = ref('')
const authMode = ref<'login' | 'register'>('login')

// Navigation
const activePage = ref<'restaurants' | 'groups'>('restaurants')

function switchAuthMode(mode: 'login' | 'register') {
  authMode.value = mode
  authError.value = ''
}

async function handleLogin(username: string, password: string) {
  authLoading.value = true
  authError.value = ''

  try {
    const response = await login(username, password)
    currentUser.value = response.user
    activePage.value = 'restaurants'

    await loadRestaurants()
    await loadRestaurantRatings()
  } catch (err) {
    authError.value = err instanceof Error
      ? err.message
      : 'Anmeldung fehlgeschlagen'
  } finally {
    authLoading.value = false
  }
}

async function handleRegister(username: string, password: string) {
  authLoading.value = true
  authError.value = ''

  try {
    await register(username, password)
    await handleLogin(username, password)
  } catch (err) {
    authError.value = err instanceof Error
      ? err.message
      : 'Registrierung fehlgeschlagen'
  } finally {
    authLoading.value = false
  }
}

async function handleLogout() {
  authLoading.value = true
  authError.value = ''

  try {
    await logout()

    currentUser.value = null
    authMode.value = 'login'
    activePage.value = 'restaurants'

    closeRestaurant()
    resetRestaurantForm()
    restaurantFormKey.value++
    restaurantRatings.value = {}
    restaurants.value = []
    visits.value = []
  } catch (err) {
    authError.value = err instanceof Error
      ? err.message
      : 'Abmeldung fehlgeschlagen'
  } finally {
    authLoading.value = false
  }
}

// ========================================
// RESTAURANTVERWALTUNG
// ========================================

const {
  restaurants,
  error,
  loading,
  loadRestaurants,
  saveRestaurant: persistRestaurant,
  removeRestaurant
} = useRestaurants()

const editingId = ref<string | null>(null)
const restaurantFormKey = ref(0)

const editingRestaurant = computed<RestaurantInput | null>(() => {
  if (!editingId.value) return null

  const restaurant = restaurants.value.find(
    (item) => item.id === editingId.value
  )

  if (!restaurant) return null

  return {
    name: restaurant.name,
    location: restaurant.location,
    cuisine: restaurant.cuisine
  }
})

function resetRestaurantForm() {
  editingId.value = null
  error.value = ''
}

async function saveRestaurant(data: RestaurantInput) {
  const saved = await persistRestaurant(
    data,
    editingId.value
  )

  if (!saved) return

  if (selectedRestaurant.value?.id === saved.id) {
    selectedRestaurant.value = saved
  }

  resetRestaurantForm()
  restaurantFormKey.value++
  await loadRestaurantRatings()
}

function editRestaurant(restaurant: Restaurant) {
  activePage.value = 'restaurants'
  editingId.value = restaurant.id
  error.value = ''

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

async function deleteRestaurant(restaurant: Restaurant) {
  const deleted = await removeRestaurant(restaurant)

  if (!deleted) return

  if (editingId.value === restaurant.id) {
    resetRestaurantForm()
    restaurantFormKey.value++
  }

  if (selectedRestaurant.value?.id === restaurant.id) {
    closeRestaurant()
  }

  await loadRestaurantRatings()
}

// ========================================
// SUCHE, FILTER UND SORTIERUNG
// ========================================

const searchQuery = ref('')
const selectedCuisine = ref('')
const sortOrder = ref('az')

const availableCuisines = computed(() => {
  const cuisines = restaurants.value
    .map((restaurant) => restaurant.cuisine.trim())
    .filter(Boolean)

  return [...new Set(cuisines)]
})

const filteredRestaurants = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('de')

  const result = restaurants.value.filter((restaurant) => {
    const name = restaurant.name.toLocaleLowerCase('de')
    const location = restaurant.location.toLocaleLowerCase('de')

    const matchesSearch =
      name.includes(query) ||
      location.includes(query)

    const matchesCuisine =
      !selectedCuisine.value ||
      restaurant.cuisine.trim() === selectedCuisine.value

    return matchesSearch && matchesCuisine
  })

  return result.sort((a, b) => {
    const comparison = a.name.localeCompare(
      b.name,
      'de',
      { sensitivity: 'base' }
    )

    return sortOrder.value === 'za'
      ? -comparison
      : comparison
  })
})

// ========================================
// BEWERTUNGSÜBERSICHT
// ========================================

type RatingSummary = {
  averageRating: number | null
  visitCount: number
}

const restaurantRatings = ref<Record<string, RatingSummary>>({})

async function loadRestaurantRatings() {
  const results = await Promise.allSettled(
    restaurants.value.map(async (restaurant) => {
      const restaurantVisits = await getVisits(restaurant.id)

      const visitCount = restaurantVisits.length

      const averageRating = visitCount > 0
        ? restaurantVisits.reduce(
            (sum, visit) => sum + visit.rating,
            0
          ) / visitCount
        : null

      return {
        id: restaurant.id,
        averageRating,
        visitCount
      }
    })
  )

  const ratings: Record<string, RatingSummary> = {}

  for (const result of results) {
    if (result.status === 'fulfilled') {
      ratings[result.value.id] = {
        averageRating: result.value.averageRating,
        visitCount: result.value.visitCount
      }
    } else {
      console.error(
        'Bewertungen konnten nicht geladen werden.',
        result.reason
      )
    }
  }

  restaurantRatings.value = ratings
}

// ========================================
// BESUCHSVERWALTUNG
// ========================================

const {
  visits,
  visitError,
  visitLoading,
  selectRestaurant: setActiveRestaurant,
  loadVisits,
  saveVisit: persistVisit,
  removeVisit
} = useVisits()

const selectedRestaurant = ref<Restaurant | null>(null)

const editingVisitId = ref<string | null>(null)
const visitFormKey = ref(0)

const editingVisit = computed<VisitInput | null>(() => {
  if (!editingVisitId.value) return null

  const visit = visits.value.find(
    (item) => item.id === editingVisitId.value
  )

  if (!visit) return null

  const oldRating = Math.max(
    1,
    Math.min(5, Math.round(visit.rating))
  )

  return {
    date: visit.date,
    foodRating: visit.foodRating ?? oldRating,
    serviceRating: visit.serviceRating ?? oldRating,
    ambienceRating: visit.ambienceRating ?? oldRating,
    valueRating: visit.valueRating ?? oldRating,
    note: visit.note
  }
})

function resetVisitForm() {
  editingVisitId.value = null
  visitError.value = ''
  visitFormKey.value++
}

async function selectRestaurant(restaurant: Restaurant) {
  selectedRestaurant.value = restaurant

  resetVisitForm()
  setActiveRestaurant(restaurant.id)

  await loadVisits()
}

function closeRestaurant() {
  selectedRestaurant.value = null

  setActiveRestaurant(null)
  resetVisitForm()
}

function editVisit(visit: Visit) {
  editingVisitId.value = visit.id
  visitError.value = ''
}

async function saveVisit(data: VisitInput) {
  const restaurantId = selectedRestaurant.value?.id
  if (!restaurantId) return

  const saved = await persistVisit(
    data,
    editingVisitId.value
  )

  if (
    saved &&
    selectedRestaurant.value?.id === restaurantId
  ) {
    resetVisitForm()
  }

  await loadRestaurantRatings()
}

async function deleteVisit(visit: Visit) {
  const restaurantId = selectedRestaurant.value?.id
  if (!restaurantId) return

  const deleted = await removeVisit(visit)

  if (deleted) {
    await loadRestaurantRatings()
  }

  if (
    deleted &&
    selectedRestaurant.value?.id === restaurantId &&
    editingVisitId.value === visit.id
  ) {
    resetVisitForm()
  }
}

// ========================================
// NAVIGATION
// ========================================

function navigateTo(page: 'restaurants' | 'groups') {
  activePage.value = page

  if (page === 'groups') {
    closeRestaurant()
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// ========================================
// INITIALISIERUNG
// ========================================

onMounted(async () => {
  try {
    currentUser.value = await getCurrentUser()

    if (currentUser.value) {
      await loadRestaurants()
      await loadRestaurantRatings()
    }
  } catch (err) {
    authError.value = err instanceof Error
      ? err.message
      : 'Die Sitzung konnte nicht überprüft werden.'
  } finally {
    authChecking.value = false
  }
})
</script>

<template>
  <div class="app-shell">

    <!-- HEADER -->
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          Restaurant Diary
        </div>

        <div v-if="currentUser" class="user-menu">
          <span class="topbar-label">
            Angemeldet als
            <strong>{{ currentUser.username }}</strong>
          </span>

          <button
            type="button"
            class="logout-button"
            :disabled="authLoading"
            @click="handleLogout"
          >
            Abmelden
          </button>
        </div>

        <span v-else class="topbar-label">
          Dein persönlicher Food-Guide
        </span>
      </div>
    </header>

    <!-- NAVIGATION -->
    <nav
      v-if="currentUser && !authChecking"
      class="page-navigation"
      aria-label="Hauptnavigation"
    >
      <div class="navigation-inner">

        <button
          type="button"
          class="nav-button"
          :class="{ active: activePage === 'restaurants' }"
          :aria-current="activePage === 'restaurants' ? 'page' : undefined"
          @click="navigateTo('restaurants')"
        >
          Meine Restaurants
        </button>

        <button
          type="button"
          class="nav-button"
          :class="{ active: activePage === 'groups' }"
          :aria-current="activePage === 'groups' ? 'page' : undefined"
          @click="navigateTo('groups')"
        >
          Meine Gruppen
        </button>

      </div>
    </nav>

    <main class="container">

      <!-- SITZUNG WIRD ÜBERPRÜFT -->
      <div v-if="authChecking" class="auth-status">
        Anmeldung wird überprüft ...
      </div>

      <!-- LOGIN UND REGISTRIERUNG -->
      <section v-else-if="!currentUser" class="auth-page">
        <div class="auth-intro">
          <span class="eyebrow">
            DEIN RESTAURANT-TAGEBUCH
          </span>

          <h1>
            Gute Restaurants.<br>
            <em>Schöne Erinnerungen.</em>
          </h1>

          <p>
            Entdecke Restaurants, halte deine Besuche fest
            und sammle deine schönsten Food-Erlebnisse.
          </p>
        </div>

        <div class="auth-card">
          <LoginForm
            v-if="authMode === 'login'"
            :loading="authLoading"
            :error="authError"
            @login="handleLogin"
            @switch-to-register="switchAuthMode('register')"
          />

          <RegisterForm
            v-else
            :loading="authLoading"
            :error="authError"
            @register="handleRegister"
            @switch-to-login="switchAuthMode('login')"
          />
        </div>
      </section>

      <!-- ANGEMELDETE ANWENDUNG -->
      <template v-else>

        <!-- GRUPPENANSICHT -->
        <GroupsView
          v-if="activePage === 'groups'"
        />

        <!-- RESTAURANTANSICHT -->
        <template v-else>

          <!-- HERO -->
          <section class="hero">
            <span class="eyebrow">
              DEIN RESTAURANT-TAGEBUCH
            </span>

            <h1>
              Gute Restaurants.<br>
              <em>Schöne Erinnerungen.</em>
            </h1>

            <p>
              Sammle deine Lieblingsrestaurants, halte deine Besuche
              fest und erinnere dich an die besten Gerichte.
            </p>
          </section>

          <!-- RESTAURANTÜBERSICHT -->
          <div class="content-grid">

            <!-- RESTAURANTFORMULAR -->
            <RestaurantForm
              :key="restaurantFormKey"
              :initial-data="editingRestaurant"
              :loading="loading"
              :error="error"
              @save="saveRestaurant"
              @cancel="resetRestaurantForm"
            />

            <!-- RESTAURANTLISTE -->
            <section class="restaurant-section">

              <div class="list-heading">
                <div>
                  <span class="eyebrow">
                    DEINE SAMMLUNG
                  </span>

                  <h2>Meine Restaurants</h2>
                </div>

                <span class="count-badge">
                  {{ restaurants.length }}
                  {{
                    restaurants.length === 1
                      ? 'Restaurant'
                      : 'Restaurants'
                  }}
                </span>
              </div>

              <!-- SUCHE, FILTER UND SORTIERUNG -->
              <RestaurantFilters
                v-model:search="searchQuery"
                v-model:cuisine="selectedCuisine"
                v-model:sort="sortOrder"
                :cuisines="availableCuisines"
              />

              <!-- KEINE RESTAURANTS -->
              <div
                v-if="restaurants.length === 0"
                class="empty-state"
              >
                <span class="empty-icon">🍽️</span>

                <h3>Noch keine Restaurants</h3>

                <p>
                  Füge dein erstes Restaurant hinzu.
                </p>
              </div>

              <!-- KEINE SUCHERGEBNISSE -->
              <div
                v-else-if="filteredRestaurants.length === 0"
                class="empty-state"
              >
                <span class="empty-icon">🔎</span>

                <h3>Keine Restaurants gefunden</h3>

                <p>
                  Versuche einen anderen Suchbegriff
                  oder ändere deine Filter.
                </p>
              </div>

              <!-- RESTAURANTKARTEN -->
              <div v-else class="restaurant-grid">
                <RestaurantCard
                  v-for="restaurant in filteredRestaurants"
                  :key="restaurant.id"
                  :restaurant="restaurant"
                  :average-rating="restaurantRatings[restaurant.id]?.averageRating ?? null"
                  :visit-count="restaurantRatings[restaurant.id]?.visitCount ?? 0"
                  @select="selectRestaurant"
                  @edit="editRestaurant"
                  @delete="deleteRestaurant"
                />
              </div>

            </section>
          </div>

          <!-- RESTAURANTDETAILANSICHT -->
          <RestaurantDetail
            v-if="selectedRestaurant"
            :restaurant="selectedRestaurant"
            :visits="visits"
            :visit-error="visitError"
            :visit-loading="visitLoading"
            :editing-visit-id="editingVisitId"
            :editing-visit="editingVisit"
            :visit-form-key="visitFormKey"
            @close="closeRestaurant"
            @save-visit="saveVisit"
            @edit-visit="editVisit"
            @delete-visit="deleteVisit"
            @cancel-edit="resetVisitForm"
          />

        </template>
      </template>

    </main>
  </div>
</template>

<style scoped>
/* ========================================
   HAUPTLAYOUT
======================================== */

.app-shell {
  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-text);
}

/* ========================================
   HEADER
======================================== */

.topbar {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.topbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 22px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.topbar-label {
  color: #89958c;
  font-size: 13px;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logout-button {
  border: 1px solid var(--color-border);
  background: transparent;
  padding: 10px 16px;
  border-radius: 10px;
  color: var(--color-text);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.logout-button:hover {
  background: #e8f0e8;
}

.logout-button:disabled {
  opacity: 0.5;
  cursor: wait;
}

/* ========================================
   NAVIGATION
======================================== */

.page-navigation {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.navigation-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 32px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-button {
  border: none;
  background: transparent;
  color: #6e7c72;
  border-radius: 10px;
  padding: 12px 20px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.nav-button:hover {
  background: #f0f5ed;
  color: #286b50;
}

.nav-button.active {
  background: #e8f1e9;
  color: #286b50;
}

/* ========================================
   CONTAINER
======================================== */

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px 80px;
}

/* ========================================
   HERO
======================================== */

.hero {
  padding: 65px 0 55px;
  max-width: 720px;
}

.hero h1 {
  font-size: clamp(36px, 5vw, 60px);
  line-height: 1.13;
  letter-spacing: -2px;
  margin: 0 0 20px;
}

.hero h1 em {
  color: #39825c;
  font-style: normal;
}

.hero p {
  color: #6e7c72;
  font-size: 17px;
  line-height: 1.7;
  max-width: 570px;
}

/* ========================================
   RESTAURANTÜBERSICHT
======================================== */

.content-grid {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 40px;
  align-items: start;
}

.list-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 24px;
}

.list-heading h2 {
  font-size: 27px;
  margin: 0;
  letter-spacing: -0.7px;
}

.count-badge {
  background: #e8f0e8;
  color: #397052;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.restaurant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
}

.empty-state {
  background: var(--color-surface);
  border: 1px dashed #cbd8cb;
  border-radius: 18px;
  padding: 60px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 36px;
}

.empty-state p {
  color: var(--color-muted);
  font-size: 14px;
}

/* ========================================
   LOGIN UND REGISTRIERUNG
======================================== */

.auth-status {
  padding: 100px 20px;
  text-align: center;
  color: var(--color-muted);
}

.auth-page {
  min-height: calc(100vh - 90px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  align-items: center;
  gap: 70px;
  padding: 60px 0;
  box-sizing: border-box;
}

.auth-intro h1 {
  font-size: clamp(36px, 5vw, 60px);
  line-height: 1.13;
  letter-spacing: -2px;
  margin: 20px 0;
}

.auth-intro h1 em {
  color: #39825c;
  font-style: normal;
}

.auth-intro p {
  max-width: 480px;
  color: #6e7c72;
  font-size: 17px;
  line-height: 1.7;
}

.auth-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 36px;
  box-shadow: 0 12px 35px rgba(25, 50, 35, 0.05);
}

/* ========================================
   RESPONSIVE DESIGN
======================================== */

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .auth-page {
    grid-template-columns: 1fr;
    gap: 35px;
    max-width: 560px;
    margin: 0 auto;
  }
}

@media (max-width: 600px) {
  .topbar-inner {
    padding: 16px 20px;
  }

  .topbar-label {
    display: none;
  }

  .navigation-inner {
    padding: 10px 20px;
    gap: 8px;
  }

  .nav-button {
    padding: 11px 13px;
    font-size: 13px;
  }

  .container {
    padding: 0 20px 50px;
  }

  .hero {
    padding: 45px 0;
  }

  .hero h1 {
    letter-spacing: -1px;
  }

  .list-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .restaurant-grid {
    grid-template-columns: 1fr;
  }

  .auth-page {
    padding: 35px 0;
  }

  .auth-card {
    padding: 24px;
  }

  .auth-intro h1 {
    letter-spacing: -1px;
  }

  .user-menu {
    gap: 10px;
  }

  .logout-button {
    padding: 8px 12px;
  }
}
</style>