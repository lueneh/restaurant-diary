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

const groups = ref<Group[]>([])
const selectedGroup = ref<Group | null>(null)
const members = ref<Member[]>([])

const groupName = ref('')
const inviteCode = ref('')
const loading = ref(false)
const membersLoading = ref(false)
const error = ref('')
const success = ref('')

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
    error.value = err instanceof Error
      ? err.message
      : 'Gruppen konnten nicht geladen werden.'
  }
}

async function createGroup() {
  if (!groupName.value.trim()) return

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const group = await request<Group>('', {
      method: 'POST',
      body: JSON.stringify({ name: groupName.value })
    })

    groupName.value = ''
    await loadGroups()
    success.value = `Die Gruppe "${group.name}" wurde erstellt.`
    await openGroup(group)
  } catch (err) {
    error.value = err instanceof Error
      ? err.message
      : 'Gruppe konnte nicht erstellt werden.'
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
    success.value = `Du bist jetzt Mitglied von "${group.name}".`
    await openGroup(group)
  } catch (err) {
    error.value = err instanceof Error
      ? err.message
      : 'Beitritt fehlgeschlagen.'
  } finally {
    loading.value = false
  }
}

async function openGroup(group: Group) {
  selectedGroup.value = group
  members.value = []
  membersLoading.value = true
  error.value = ''

  try {
    members.value = await request<Member[]>(
      `/${encodeURIComponent(group.id)}/members`
    )
  } catch (err) {
    error.value = err instanceof Error
      ? err.message
      : 'Mitglieder konnten nicht geladen werden.'
  } finally {
    membersLoading.value = false
  }
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    success.value = 'Einladungscode kopiert!'
    error.value = ''
  } catch {
    error.value = 'Kopieren fehlgeschlagen. Bitte Code manuell kopieren.'
  }
}

onMounted(loadGroups)
</script>

<template>
  <div class="groups-page">
    <div class="groups-heading">
      <div>
        <span class="eyebrow">GEMEINSAM GENIESSEN</span>
        <h1>Meine Gruppen<span class="accent">.</span></h1>
        <p>
          Erstelle eine Gruppe mit deinen Freunden und entdeckt
          eure Lieblingsrestaurants gemeinsam.
        </p>
      </div>
    </div>

    <div v-if="error" class="notice error" role="alert">
      {{ error }}
    </div>

    <div v-if="success" class="notice success" role="status">
      {{ success }}
    </div>

    <template v-if="!selectedGroup">
      <div class="action-grid">
        <form class="action-card" @submit.prevent="createGroup">
          <div class="card-icon">＋</div>
          <h2>Gruppe erstellen</h2>
          <p>Starte eine neue Restaurant-Sammlung mit Freunden.</p>

          <label for="group-name">Gruppenname</label>
          <input
            id="group-name"
            v-model="groupName"
            maxlength="60"
            minlength="2"
            placeholder="z. B. Foodies 🍕"
            required
          />

          <button class="primary-button" :disabled="loading">
            Gruppe erstellen
          </button>
        </form>

        <form class="action-card" @submit.prevent="joinGroup">
          <div class="card-icon">↗</div>
          <h2>Gruppe beitreten</h2>
          <p>Du hast einen Einladungscode erhalten?</p>

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
        <span class="group-count">{{ groups.length }}</span>
      </div>

      <div v-if="groups.length === 0" class="empty-state">
        <div class="empty-icon">♡</div>
        <h3>Noch keine Gruppen</h3>
        <p>
          Erstelle deine erste Gruppe oder tritt einer bestehenden bei.
        </p>
      </div>

      <div v-else class="group-grid">
        <button
          v-for="group in groups"
          :key="group.id"
          class="group-card"
          type="button"
          @click="openGroup(group)"
        >
          <div class="group-avatar">🍽️</div>
          <div class="group-info">
            <h3>{{ group.name }}</h3>
            <p>Gemeinsame Restaurant-Sammlung</p>
          </div>
          <span class="arrow">→</span>
        </button>
      </div>
    </template>

    <template v-else>
      <button
        type="button"
        class="back-button"
        @click="selectedGroup = null; success = ''; error = ''"
      >
        ← Alle Gruppen
      </button>

      <div class="detail-card">
        <div class="detail-heading">
          <div class="group-avatar large">🍽️</div>
          <div>
            <span class="eyebrow">DEINE GRUPPE</span>
            <h2>{{ selectedGroup.name }}</h2>
            <p>Gemeinsam Restaurants entdecken und bewerten.</p>
          </div>
        </div>

        <div class="invite-box">
          <div>
            <span class="invite-label">EINLADUNGSCODE</span>
            <strong>{{ selectedGroup.inviteCode }}</strong>
            <p>Teile diesen Code mit deinen Freunden.</p>
          </div>

          <button
            type="button"
            class="secondary-button"
            @click="copyCode(selectedGroup.inviteCode)"
          >
            Code kopieren
          </button>
        </div>

        <h3>Mitglieder ({{ members.length }})</h3>

        <p v-if="membersLoading">Mitglieder werden geladen ...</p>

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

        <div class="coming-next">
          <strong>Als Nächstes: gemeinsame Restaurants</strong>
          <p>
            Hier erscheinen später automatisch die Restaurants und
            Bewertungen aller Gruppenmitglieder – ohne doppelte Eingabe.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.groups-page {
  padding: 32px 0 70px;
}

.groups-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 38px;
}

.groups-heading h1 {
  font-size: clamp(32px, 5vw, 52px);
  letter-spacing: -2px;
  margin: 0 0 12px;
}

.groups-heading p,
.action-card p,
.detail-card p {
  color: #829087;
  line-height: 1.6;
}

.accent {
  color: #286b50;
}

.heading-icon {
  font-size: 58px;
  color: #286b50;
}

.action-grid,
.group-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.action-card,
.group-card,
.detail-card,
.empty-state {
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
  font-weight: 700;
  font-size: 13px;
}

.action-card input {
  width: 100%;
  border: 1px solid #dce3da;
  border-radius: 10px;
  padding: 13px;
  outline-color: #286b50;
  background: #fff;
}

.action-card button {
  margin-top: auto;
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

.group-count {
  background: #e8f1e9;
  color: #286b50;
  border-radius: 30px;
  padding: 5px 12px;
  font-weight: 700;
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

.group-card:hover {
  border-color: #286b50;
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
  color: #286b50;
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
}

.owner-badge {
  margin-left: auto;
  font-size: 12px;
  color: #286b50;
  background: #e8f1e9;
  padding: 5px 10px;
  border-radius: 20px;
}

.coming-next {
  background: #faf9f5;
  border-radius: 14px;
  padding: 22px;
  margin-top: 28px;
}

.coming-next p {
  margin-bottom: 0;
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
  .group-grid {
    grid-template-columns: 1fr;
  }

  .groups-heading {
    align-items: flex-start;
  }

  .heading-icon {
    display: none;
  }

  .invite-box {
    align-items: flex-start;
    flex-direction: column;
  }

  .detail-heading {
    align-items: flex-start;
  }
}
</style>