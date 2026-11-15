<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  register: [username: string, password: string]
  switchToLogin: []
}>()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref('')

function submit() {
  validationError.value = ''

  if (password.value !== confirmPassword.value) {
    validationError.value = 'Die Passwörter stimmen nicht überein.'
    return
  }

  if (password.value.length < 12 || password.value.length > 128) {
    validationError.value = 'Das Passwort muss 12–128 Zeichen lang sein.'
    return
  }

  emit('register', username.value.trim(), password.value)
}
</script>

<template>
  <form class="auth-form" @submit.prevent="submit">
    <span class="eyebrow">DEIN RESTAURANT-TAGEBUCH</span>
    <h2>Account erstellen</h2>
    <p class="description">
      Registriere dich und halte deine Restaurantbesuche fest.
    </p>

    <label for="register-username">Benutzername</label>
    <input
      id="register-username"
      v-model="username"
      type="text"
      minlength="3"
      maxlength="20"
      pattern="[a-zA-Z0-9_-]{3,20}"
      autocomplete="username"
      placeholder="3–20 Zeichen"
      required
    />

    <label for="register-password">Passwort</label>
    <input
      id="register-password"
      v-model="password"
      type="password"
      minlength="12"
      maxlength="128"
      autocomplete="new-password"
      placeholder="Mindestens 12 Zeichen"
      required
    />

    <label for="register-confirm">Passwort bestätigen</label>
    <input
      id="register-confirm"
      v-model="confirmPassword"
      type="password"
      autocomplete="new-password"
      placeholder="Passwort wiederholen"
      required
    />

    <p
      v-if="validationError || error"
      class="error-message"
      role="alert"
    >
      {{ validationError || error }}
    </p>

    <button type="submit" :disabled="loading">
      {{ loading ? 'Registrierung läuft ...' : 'Registrieren' }}
    </button>

    <p class="switch-text">
      Bereits registriert?
      <button
        type="button"
        class="text-button"
        @click="emit('switchToLogin')"
      >
        Zur Anmeldung
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