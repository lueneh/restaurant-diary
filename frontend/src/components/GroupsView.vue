<script setup lang="ts">
import { onMounted, ref } from 'vue'

type Group = {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  createdAt: string
}

type Member = {
  id: string
  username: string
}

type GroupVisit = {
  id: string
  restaurantId: string
  date: string
  rating: number
  foodRating?: number
  serviceRating?: number
  ambienceRating?: number
  valueRating?: number
  note: string
  ownerId: string
  ownerUsername: string
}

type GroupRestaurant = {
  id: string
  name: string
  location: string
  address?: string
  cuisine: string
  ownerId: string
  ownerUsername: string
  contributors: {
    id: string
    username: string
  }[]
  visits: GroupVisit[]
  visitCount: number
  averageRating: number | null
}

const groups = ref<Group[]>([])
const selectedGroup = ref<Group | null>(null)
const members = ref<Member[]>([])
const restaurants = ref<GroupRestaurant[]>([])

const groupName = ref('')
const inviteCode = ref('')
const searchQuery = ref('')

const loading = ref(false)
const detailLoading = ref(false)
const error = ref('')
const success = ref('')

const expandedRestaurants = ref<string[]>([])

// Die Gruppen-API verwendet das Sitzungscookie zur Zuordnung der Anfrage zum angemeldeten Konto.
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`/api/groups${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const data: unknown = await response.json()

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : 'Ein Fehler ist aufgetreten.'

    throw new Error(message)
  }

  return data as T
}

async function loadGroups() {
  try {
    error.value = ''
    groups.value = await request<Group[]>('')
  } catch (err) {
    showError(err)
  }
}

function showError(err: unknown) {
  error.value = err instanceof Error
    ? err.message
    : 'Ein Fehler ist aufgetreten.'
}

async function createGroup() {
  if (groupName.value.trim().length < 2) return

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const group = await request<Group>('', {
      method: 'POST',
      body: JSON.stringify({
        name: groupName.value.trim()
      })
    })

    groupName.value = ''
    await loadGroups()
    await openGroup(group)

    success.value = `Gruppe "${group.name}" erstellt!`
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}

async function joinGroup() {
  if (!inviteCode.value.trim()) return

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const group = await request<Group>('/join', {
      method: 'POST',
      body: JSON.stringify({
        inviteCode: inviteCode.value.trim()
      })
    })

    inviteCode.value = ''
    await loadGroups()
    await openGroup(group)

    success.value = `Du bist "${group.name}" beigetreten!`
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}

// Beim Wechsel die Daten, Suche und aufgeklappten Karten der vorherigen Gruppe zurücksetzen.
async function openGroup(group: Group) {
  selectedGroup.value = group
  members.value = []
  restaurants.value = []
  expandedRestaurants.value = []
  searchQuery.value = ''
  error.value = ''

  await loadGroupDetails()
}

async function loadGroupDetails() {
  if (!selectedGroup.value) return

  detailLoading.value = true
  error.value = ''

  const id = encodeURIComponent(selectedGroup.value.id)

  // Mitglieder unabhängig laden
  try {
    members.value = await request<Member[]>(`/${id}/members`)
  } catch (err) {
    showError(err)
  }

  // Restaurants separat laden
  try {
    restaurants.value = await request<GroupRestaurant[]>(
      `/${id}/restaurants`
    )
  } catch (err) {
    showError(err)
  }

  detailLoading.value = false
}

function closeGroup() {
  selectedGroup.value = null
  error.value = ''
  success.value = ''
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    success.value = 'Einladungscode kopiert!'
    error.value = ''
  } catch {
    error.value = 'Kopieren fehlgeschlagen.'
  }
}

function toggleRestaurant(key: string) {
  if (expandedRestaurants.value.includes(key)) {
    expandedRestaurants.value =
      expandedRestaurants.value.filter(id => id !== key)
  } else {
    expandedRestaurants.value.push(key)
  }
}

// Für Anzeige und Aufklappzustand den Besitzer des zusammengefassten Eintrags mit seiner Restaurant-ID kombinieren.
function restaurantKey(restaurant: GroupRestaurant): string {
  return `${restaurant.ownerId}:${restaurant.id}`
}

function formatRating(rating: number | null): string {
  return rating === null
    ? 'Noch keine Bewertung'
    : `${rating.toFixed(1).replace('.', ',')} / 5`
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)

  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('de-DE')
}

function filteredRestaurants(): GroupRestaurant[] {
  const query = searchQuery.value.trim().toLocaleLowerCase('de')

  if (!query) return restaurants.value

  return restaurants.value.filter(restaurant =>
    restaurant.name.toLocaleLowerCase('de').includes(query) ||
    restaurant.location.toLocaleLowerCase('de').includes(query) ||
    restaurant.cuisine.toLocaleLowerCase('de').includes(query) ||
    restaurant.ownerUsername.toLocaleLowerCase('de').includes(query)
  )
}

onMounted(loadGroups)
</script>

<template>
  <div class="groups-page">

    <div class="page-heading">
      <div>
        <span class="eyebrow">GEMEINSAM GENIESSEN</span>
        <h1>
          Meine Gruppen<span class="accent">.</span>
        </h1>
        <p>
          Entdecke Restaurants gemeinsam mit deinen Freunden
          und teilt eure Erfahrungen.
        </p>
      </div>
    </div>

    <div v-if="error" class="notice error" role="alert">
      {{ error }}
    </div>

    <div v-if="success" class="notice success" role="status">
      {{ success }}
    </div>

    <!-- GRUPPENÜBERSICHT -->
    <template v-if="!selectedGroup">

      <div class="action-grid">

        <form class="action-card" @submit.prevent="createGroup">
          <div class="card-icon">＋</div>
          <h2>Gruppe erstellen</h2>
          <p>
            Erstelle eine Gruppe und lade deine Freunde ein.
          </p>

          <label for="group-name">Gruppenname</label>
          <input
            id="group-name"
            v-model="groupName"
            minlength="2"
            maxlength="60"
            placeholder="z. B. Foodies"
            required
          />

          <button class="primary-button" :disabled="loading">
            Gruppe erstellen
          </button>
        </form>

        <form class="action-card" @submit.prevent="joinGroup">
          <div class="card-icon">↗</div>
          <h2>Gruppe beitreten</h2>
          <p>
            Du hast einen Einladungscode erhalten?
          </p>

          <label for="invite-code">Einladungscode</label>
          <input
            id="invite-code"
            v-model="inviteCode"
            maxlength="8"
            placeholder="z. B. A7K9P2Q4"
            required
          />

          <button class="secondary-button" :disabled="loading">
            Gruppe beitreten
          </button>
        </form>

      </div>

      <div class="section-heading">
        <h2>Deine Gruppen</h2>
        <span class="count-badge">{{ groups.length }}</span>
      </div>

      <div v-if="groups.length === 0" class="empty-state">
        <div class="empty-icon">🍽️</div>
        <h3>Noch keine Gruppen</h3>
        <p>
          Erstelle eine Gruppe oder tritt einer bestehenden bei.
        </p>
      </div>

      <div v-else class="group-grid">
        <button
          v-for="group in groups"
          :key="group.id"
          type="button"
          class="group-card"
          @click="openGroup(group)"
        >
          <div class="group-avatar">🍽️</div>

          <div class="group-info">
            <h3>{{ group.name }}</h3>
            <p>Gemeinsam Restaurants entdecken</p>
          </div>

          <span class="arrow">→</span>
        </button>
      </div>

    </template>

    <!-- EINZELNE GRUPPE -->
    <template v-else>

      <button
        type="button"
        class="back-button"
        @click="closeGroup"
      >
        ← Alle Gruppen
      </button>

      <div class="detail-card">

        <div class="detail-heading">
          <div class="group-avatar large">🍽️</div>

          <div>
            <span class="eyebrow">DEINE GRUPPE</span>
            <h2>{{ selectedGroup.name }}</h2>
            <p>
              Eure gemeinsamen Restaurant-Erlebnisse.
            </p>
          </div>
        </div>

        <div class="invite-box">
          <div>
            <span class="invite-label">EINLADUNGSCODE</span>
            <strong>{{ selectedGroup.inviteCode }}</strong>
            <p>Teile den Code mit deinen Freunden.</p>
          </div>

          <button
            type="button"
            class="secondary-button"
            @click="copyCode(selectedGroup.inviteCode)"
          >
            Code kopieren
          </button>
        </div>

        <!-- MITGLIEDER -->
        <div class="subsection-heading">
          <h3>Mitglieder ({{ members.length }})</h3>
        </div>

        <p v-if="detailLoading">
          Gruppendaten werden geladen ...
        </p>

        <div v-else class="member-list">
          <div
            v-for="member in members"
            :key="member.id"
            class="member-row"
          >
            <div class="member-avatar">
              {{ member.username.charAt(0).toUpperCase() }}
            </div>

            <span>{{ member.username }}</span>

            <span
              v-if="member.id === selectedGroup.ownerId"
              class="owner-badge"
            >
              Gründer
            </span>
          </div>
        </div>

      </div>

      <!-- GEMEINSAME RESTAURANTS -->
      <section class="shared-section">

        <div class="shared-heading">
          <div>
            <span class="eyebrow">EURE SAMMLUNG</span>
            <h2>Gemeinsame Restaurants</h2>
            <p>
              Restaurants und Bewertungen aller Gruppenmitglieder.
            </p>
          </div>

          <button
            type="button"
            class="refresh-button"
            :disabled="detailLoading"
            @click="loadGroupDetails"
          >
            ↻ Aktualisieren
          </button>
        </div>

        <div class="shared-toolbar">
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Restaurant, Ort oder Mitglied suchen ..."
            aria-label="Gemeinsame Restaurants durchsuchen"
          />

          <span class="count-badge">
            {{ restaurants.length }}
            {{ restaurants.length === 1 ? 'Eintrag' : 'Einträge' }}
          </span>
        </div>

        <p v-if="detailLoading" class="loading-message">
          Restaurants werden geladen ...
        </p>

        <div
          v-else-if="restaurants.length === 0"
          class="empty-state"
        >
          <div class="empty-icon">🍽️</div>
          <h3>Noch keine Restaurants</h3>
          <p>
            Sobald ein Mitglied ein Restaurant zu seiner
            persönlichen Sammlung hinzufügt, erscheint es hier.
          </p>
        </div>

        <div
          v-else-if="filteredRestaurants().length === 0"
          class="empty-state"
        >
          <h3>Keine passenden Restaurants</h3>
          <p>Versuche einen anderen Suchbegriff.</p>
        </div>

        <div v-else class="restaurant-grid">
          <article
            v-for="restaurant in filteredRestaurants()"
            :key="restaurantKey(restaurant)"
            class="restaurant-card"
          >
            <div class="restaurant-top">
              <span class="cuisine-tag">
                {{ restaurant.cuisine || 'Restaurant' }}
              </span>

              <span
                v-if="restaurant.averageRating !== null"
                class="rating-badge"
              >
                ★ {{ formatRating(restaurant.averageRating) }}
              </span>
            </div>

            <h3>{{ restaurant.name }}</h3>

            <p class="restaurant-location">
              📍 {{ restaurant.location }}
            </p>

            <p
              v-if="restaurant.address"
              class="restaurant-address"
            >
              {{ restaurant.address }}
            </p>

            
<div class="restaurant-contributors">
  <span class="contributors-label">
    {{ restaurant.contributors.length === 1
      ? 'Hinzugefügt von'
      : 'Bewertet / gespeichert von' }}
  </span>

  <div class="contributors-list">
    <div
      v-for="contributor in restaurant.contributors"
      :key="contributor.id"
      class="contributor"
    >
      <div class="member-avatar small">
        {{ contributor.username.charAt(0).toUpperCase() }}
      </div>

      <strong>{{ contributor.username }}</strong>
    </div>
  </div>
</div>


            <div class="restaurant-stats">
              <span>
                <strong>{{ restaurant.visitCount }}</strong>
                {{ restaurant.visitCount === 1 ? 'Besuch' : 'Besuche' }}
              </span>

              <span>
                {{ formatRating(restaurant.averageRating) }}
              </span>
            </div>

            <button
              type="button"
              class="details-button"
              @click="toggleRestaurant(restaurantKey(restaurant))"
            >
              {{
                expandedRestaurants.includes(restaurantKey(restaurant))
                  ? 'Besuche ausblenden ↑'
                  : 'Besuche anzeigen ↓'
              }}
            </button>

            <!-- BESUCHE UND BEWERTUNGEN -->
            <div
              v-if="expandedRestaurants.includes(restaurantKey(restaurant))"
              class="visits-section"
            >
              <p
                v-if="restaurant.visits.length === 0"
                class="no-visits"
              >
                Für dieses Restaurant gibt es noch keine Besuche.
              </p>

              <div
                v-for="visit in restaurant.visits"
                :key="visit.id"
                class="visit-entry"
              >
                
<div class="visit-heading">
  <div class="visit-author">
    <strong>{{ visit.ownerUsername }}</strong>
    <span class="visit-date">
      {{ formatDate(visit.date) }}
    </span>
  </div>

  <span>★ {{ formatRating(visit.rating) }}</span>
</div>


                <div class="rating-details">
                  <span v-if="visit.foodRating !== undefined">
                    Essen: {{ visit.foodRating }}/5
                  </span>

                  <span v-if="visit.serviceRating !== undefined">
                    Service: {{ visit.serviceRating }}/5
                  </span>

                  <span v-if="visit.ambienceRating !== undefined">
                    Ambiente: {{ visit.ambienceRating }}/5
                  </span>

                  <span v-if="visit.valueRating !== undefined">
                    Preis-Leistung: {{ visit.valueRating }}/5
                  </span>
                </div>

                <p v-if="visit.note" class="visit-note">
                  {{ visit.note }}
                </p>
              </div>
            </div>
          </article>
        </div>

      </section>

    </template>

  </div>
</template>

<style scoped>
.groups-page {
  padding: 32px 0 70px;
}

.page-heading {
  margin-bottom: 38px;
}

.page-heading h1 {
  font-size: clamp(32px, 5vw, 52px);
  letter-spacing: -2px;
  margin: 0 0 12px;
}

.page-heading p,
.action-card p,
.detail-card p,
.shared-heading p {
  color: #829087;
  line-height: 1.6;
}

.accent {
  color: #286b50;
}

.action-grid,
.group-grid,
.restaurant-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.action-card,
.group-card,
.detail-card,
.empty-state,
.restaurant-card {
  background: white;
  border: 1px solid #e8e9e2;
  border-radius: 20px;
  padding: 26px;
}

.action-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: #e8f1e9;
  border-radius: 14px;
  color: #286b50;
  font-size: 27px;
}

.action-card h2 {
  margin: 4px 0 0;
  font-size: 21px;
}

.action-card p {
  margin: 0 0 10px;
  font-size: 14px;
}

.action-card label {
  font-size: 13px;
  font-weight: 700;
}

.action-card input,
.shared-toolbar input {
  width: 100%;
  min-width: 0;
  border: 1px solid #dce3da;
  border-radius: 10px;
  padding: 13px;
  background: white;
  font: inherit;
  outline-color: #286b50;
}

.action-card button {
  margin-top: auto;
}

.primary-button,
.secondary-button,
.refresh-button {
  border-radius: 10px;
  padding: 12px 18px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  border: 1px solid #286b50;
  background: #286b50;
  color: white;
}

.secondary-button,
.refresh-button {
  border: 1px solid #dce3da;
  background: white;
  color: #286b50;
}

button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 42px 0 18px;
}

.section-heading h2 {
  margin: 0;
}

.count-badge {
  display: inline-block;
  background: #e8f1e9;
  color: #286b50;
  border-radius: 30px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.group-card {
  display: flex;
  align-items: center;
  gap: 15px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.group-card:hover,
.restaurant-card:hover {
  border-color: #b3d2bc;
}

.group-avatar {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  background: #f0f5ed;
  border-radius: 15px;
  font-size: 25px;
  flex-shrink: 0;
}

.group-avatar.large {
  width: 72px;
  height: 72px;
  font-size: 35px;
}

.group-info {
  flex: 1;
}

.group-info h3 {
  margin: 0 0 5px;
}

.group-info p {
  margin: 0;
  font-size: 12px;
  color: #829087;
}

.arrow {
  color: #286b50;
  font-size: 24px;
}

.empty-state {
  text-align: center;
  padding: 50px 20px;
}

.empty-icon {
  font-size: 40px;
}

.empty-state p {
  color: #829087;
}

.back-button {
  border: none;
  background: transparent;
  color: #286b50;
  font-weight: 700;
  cursor: pointer;
  padding: 0 0 20px;
}

.detail-heading {
  display: flex;
  align-items: center;
  gap: 20px;
}

.detail-heading h2 {
  font-size: 30px;
  margin: 0;
}

.invite-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: #f0f5ed;
  padding: 22px;
  border-radius: 14px;
  margin: 28px 0;
}

.invite-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #508269;
}

.invite-box strong {
  display: block;
  font-size: 26px;
  letter-spacing: 3px;
  margin-top: 8px;
}

.invite-box p {
  margin: 5px 0 0;
  font-size: 13px;
}

.subsection-heading {
  margin-bottom: 14px;
}

.member-list {
  display: grid;
  gap: 10px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e8e9e2;
  border-radius: 12px;
  padding: 12px;
}

.member-avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  background: #e8f1e9;
  color: #286b50;
  border-radius: 50%;
  font-weight: 800;
  flex-shrink: 0;
}

.member-avatar.small {
  width: 30px;
  height: 30px;
  font-size: 12px;
}

.owner-badge {
  margin-left: auto;
  font-size: 12px;
  color: #286b50;
  background: #e8f1e9;
  padding: 5px 10px;
  border-radius: 20px;
}

.shared-section {
  margin-top: 44px;
}

.shared-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 22px;
}

.shared-heading h2 {
  margin: 7px 0;
  font-size: 27px;
}

.shared-heading p {
  margin: 0;
}

.shared-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}

.shared-toolbar input {
  flex: 1;
}

.restaurant-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.restaurant-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.cuisine-tag {
  background: #f0f5ed;
  color: #286b50;
  border-radius: 30px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
}

.rating-badge {
  color: #b47a21;
  background: #fff7e7;
  border-radius: 30px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 800;
}

.restaurant-card h3 {
  font-size: 23px;
  margin: 0;
}

.restaurant-location,
.restaurant-address {
  color: #829087;
  font-size: 14px;
  margin: 0;
}

.restaurant-owner {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #6e7c72;
}

.restaurant-stats {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid #edf0e9;
  border-bottom: 1px solid #edf0e9;
  font-size: 13px;
}

.details-button {
  width: 100%;
  border: 1px solid #dce3da;
  background: #f6faf5;
  color: #286b50;
  border-radius: 10px;
  padding: 12px;
  font-weight: 700;
  cursor: pointer;
}

.visits-section {
  border-top: 1px solid #edf0e9;
  padding-top: 14px;
}

.visit-entry {
  background: #fafbf8;
  border-radius: 12px;
  padding: 14px;
  margin-top: 10px;
}

.visit-heading {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.visit-heading span {
  color: #b47a21;
  font-weight: 800;
}

.rating-details {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 14px;
  margin-top: 12px;
  color: #6e7c72;
  font-size: 12px;
}

.visit-note {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.6;
}

.no-visits,
.loading-message {
  color: #829087;
  font-size: 14px;
}

.notice {
  padding: 13px 17px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.notice.error {
  background: #fff0ef;
  color: #b83b3b;
}

.notice.success {
  background: #e8f1e9;
  color: #286b50;
}

@media (max-width: 700px) {
  .action-grid,
  .group-grid,
  .restaurant-grid {
    grid-template-columns: 1fr;
  }

  .shared-heading,
  .invite-box {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-heading {
    align-items: flex-start;
  }

  .shared-toolbar {
    flex-wrap: wrap;
  }
}

.restaurant-contributors {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contributors-label {
  color: #829087;
  font-size: 12px;
}

.contributors-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.contributor {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: #286b50;
}

.visit-author {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.visit-date {
  color: #829087 !important;
  font-size: 12px;
  font-weight: 400 !important;
}

</style>