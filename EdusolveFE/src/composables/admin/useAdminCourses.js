import { ref } from 'vue'
import { adminApi } from '@/api/admin.api'

export function useAdminCourses() {
  const loading = ref(false)
  const error = ref('')
  const courses = ref([])
  const meta = ref(null)
  const links = ref(null)

  async function fetchCourses(params = {}) {
    loading.value = true
    error.value = ''
    try {
      const res = await adminApi.getCourses(params)
      courses.value = res?.data ?? []
      meta.value = res?.meta ?? null
      links.value = res?.links ?? null
    } catch (e) {
      error.value = e?.response?.data?.message || 'Failed to load courses.'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, courses, meta, links, fetchCourses }
}
