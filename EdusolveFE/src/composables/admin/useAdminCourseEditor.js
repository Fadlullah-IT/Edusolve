import { computed, ref } from 'vue'
import { adminApi } from '@/api/admin.api'

export function useAdminCourseEditor(courseId) {
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')

  const course = ref(null) // {id,title,description,status}
  const lessons = ref([]) // [{id,course_id,title,content,order}]

  const nextOrder = computed(() => {
    if (!lessons.value.length) return 1
    return Math.max(...lessons.value.map((l) => Number(l.order || 0))) + 1
  })

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const c = await adminApi.getCourse(courseId)

      course.value = {
        id: c.id,
        title: c.title ?? '',
        description: c.description ?? '',
        status: c.status ?? 'draft',
      }

      lessons.value = Array.isArray(c.lessons)
        ? c.lessons.slice().sort((a, b) => Number(a.order) - Number(b.order))
        : []
    } catch (e) {
      error.value = e?.response?.data?.message || 'Failed to load course.'
    } finally {
      loading.value = false
    }
  }

  async function saveCourse() {
    if (!course.value) return
    saving.value = true
    error.value = ''
    try {
      await adminApi.updateCourse(courseId, {
        title: course.value.title,
        description: course.value.description,
        status: course.value.status,
      })
    } catch (e) {
      error.value = e?.response?.data?.message || 'Failed to save course.'
    } finally {
      saving.value = false
    }
  }

  async function upsertLesson(editingLessonId, payload) {
    // payload: { title, content, order }
    if (editingLessonId) {
      const updated = await adminApi.updateLesson(editingLessonId, payload)
      const idx = lessons.value.findIndex((l) => l.id === editingLessonId)
      if (idx !== -1) lessons.value[idx] = { ...lessons.value[idx], ...updated }
      lessons.value.sort((a, b) => Number(a.order) - Number(b.order))
      return
    }

    const created = await adminApi.createLesson(courseId, payload)
    lessons.value.push(created)
    lessons.value.sort((a, b) => Number(a.order) - Number(b.order))
  }

  async function removeLesson(lessonId) {
    await adminApi.deleteLesson(lessonId)
    lessons.value = lessons.value.filter((l) => l.id !== lessonId)
  }

  return {
    loading,
    saving,
    error,
    course,
    lessons,
    nextOrder,
    load,
    saveCourse,
    upsertLesson,
    removeLesson,
  }
}
