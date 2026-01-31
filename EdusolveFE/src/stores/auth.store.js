import { defineStore } from 'pinia'
import { authApi } from '../api/auth.api'

const LS_TOKEN = 'edusolve_token'
const LS_USER = 'edusolve_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(LS_TOKEN) || '',
    user: JSON.parse(localStorage.getItem(LS_USER) || 'null'),
    loading: false,
    error: '',
  }),

  getters: {
    isAuthed: (s) => !!s.token,
    role: (s) => s.user?.role || null,
    isAdmin: (s) => s.user?.role === 'admin',
    isStudent: (s) => s.user?.role === 'student',
  },

  actions: {
    setSession(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem(LS_TOKEN, token)
      localStorage.setItem(LS_USER, JSON.stringify(user))
    },

    clearSession() {
      this.token = ''
      this.user = null
      localStorage.removeItem(LS_TOKEN)
      localStorage.removeItem(LS_USER)
    },

    async login(email, password) {
      this.loading = true
      this.error = ''
      try {
        const data = await authApi.login({ email, password })
        this.setSession(data.token, data.user)
        return data.user
      } catch (e) {
        this.error = e?.normalized?.message || 'Login failed.'
        throw e
      } finally {
        this.loading = false
      }
    },

    async logout() {
      // Even if API fails, we clear local session
      try {
        await authApi.logout()
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        /* empty */
      }
      this.clearSession()
    },
  },
})
