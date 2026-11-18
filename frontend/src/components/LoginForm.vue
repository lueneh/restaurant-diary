<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  login: [username: string, password: string]
  switchToRegister: []
}>()

const username = ref('')
const password = ref('')

// Die Eingaben an App.vue übergeben. Dort werden die Anfrage und der Sitzungszustand verwaltet.
function submit() {
  if (!username.value.trim() || !password.value) return

  emit('login', username.value.trim(), password.value)
}
</script>

<template>
  <form class="auth-form" @submit.prevent="submit">
    <span class="eyebrow">WILLKOMMEN ZURÜCK</span>
    <h2>Anmelden</h2>
    <p class="description">
      Melde dich an und entdecke deine Restaurants.
    </p>

    <label for="login-username">Benutzername</label>
    <input
      id="login-username"
      v-model="username"
      type="text"
      autocomplete="username"
      placeholder="Dein Benutzername"
      required
    />

    <label for="login-password">Passwort</label>
    <input
      id="login-password"
      v-model="password"
      type="password"
      autocomplete="current-password"
      placeholder="Dein Passwort"
      required
    />

    <p v-if="error" class="error-message" role="alert">
      {{ error }}
    </p>

    <button type="submit" :disabled="loading">
      {{ loading ? 'Anmeldung läuft ...' : 'Anmelden' }}
    </button>

    <p class="switch-text">
      Noch keinen Account?
      <button
        type="button"
        class="text-button"
        @click="emit('switchToRegister')"
      >
        Jetzt registrieren
      </button>
    </p>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.eyebrow {
  color: #39825c;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

h2 {
  margin: 0;
  font-size: 32px;
  letter-spacing: -1px;
}

.description {
  color: #6e7c72;
  margin: 0 0 12px;
  line-height: 1.6;
}

label {
  font-size: 13px;
  font-weight: 700;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border: 1px solid #d5dfd5;
  border-radius: 11px;
  background: #fff;
  font: inherit;
}

input:focus {
  outline: 2px solid #39825c;
  outline-offset: 1px;
}

button[type="submit"] {
  margin-top: 12px;
  padding: 15px;
  border: none;
  border-radius: 11px;
  background: #39825c;
  color: white;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.error-message {
  color: #b42318;
  font-size: 13px;
}

.switch-text {
  text-align: center;
  color: #6e7c72;
  font-size: 13px;
}

.text-button {
  border: none;
  background: none;
  color: #39825c;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
</style>