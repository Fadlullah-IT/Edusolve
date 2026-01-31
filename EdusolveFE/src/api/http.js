import axios from 'axios'
import { useAuthStore } from '../stores/auth.store'

export const http = axios.create({
  baseURL: 'http://edusolve.test/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Attach token if present
http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

// Normalize API errors
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status ?? 0
    const data = error?.response?.data

    //  Laravel validation errors
    if (status === 422 && data?.errors) {
      error.normalized = {
        type: 'validation',
        message: data.message || 'Validation error.',
        errors: data.errors,
        status,
      }
      return Promise.reject(error)
    }

    error.normalized = {
      type: 'http',
      message:
        data?.message ||
        (status === 401 ? 'Unauthenticated. Please login again.' : 'Request failed.'),
      status,
      raw: data,
    }

    return Promise.reject(error)
  },
)
