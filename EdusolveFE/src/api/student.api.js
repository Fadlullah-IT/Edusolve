import { http } from '../api/http'

export const studentApi = {
  // Get all published courses
  async getCatalog(params = {}) {
    const { data } = await http.get('/courses', { params })
    return data // return { data: [...], meta: {...}, links: {...} }
  },

  // Get single course details + its lessons
  async getCourse(courseId) {
    const { data } = await http.get(`/courses/${courseId}`)
    return data.data // return course object
  },

  // Enroll the student in a course
  async enroll(courseId) {
    const { data } = await http.post(`/courses/${courseId}/enroll`)
    return data
  },

  // Mark a specific lesson as completed
  async completeLesson(lessonId) {
    const { data } = await http.post(`/lessons/${lessonId}/complete`)
    return data
  },

  // Get student dashboard enrolled courses + progress
  async getDashboard() {
    const { data } = await http.get('/student/enrollments')
    return data.data // returns array of enrolled courses with progress
  },
}
