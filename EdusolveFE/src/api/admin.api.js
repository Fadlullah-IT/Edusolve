import { http } from './http'

export const adminApi = {
  // Admin Dashboard stats
  async getDashboard() {
    const { data } = await http.get('/admin/dashboard')
    return data // { total_courses, total_students, top_course }
  },

  //  COURSE MANAGEMENT

  async getCourses(params = {}) {
    const { data } = await http.get('/admin/courses', { params })
    return data // Includes pagination meta
  },

  async getCourse(courseId) {
    const { data } = await http.get(`/admin/courses/${courseId}`)
    return data.data
  },

  async createCourse(payload) {
    // payload: { title, description, status }
    const { data } = await http.post('/admin/courses', payload)
    return data.data
  },

  async updateCourse(courseId, payload) {
    const { data } = await http.put(`/admin/courses/${courseId}`, payload)
    return data.data
  },

  async deleteCourse(courseId) {
    const { data } = await http.delete(`/admin/courses/${courseId}`)
    return data
  },

  // LESSON MANAGEMENT

  async createLesson(courseId, payload) {
    // { title, content, order }
    const { data } = await http.post(`/admin/courses/${courseId}/lessons`, payload)
    return data.data
  },

  async updateLesson(lessonId, payload) {
    const { data } = await http.put(`/admin/lessons/${lessonId}`, payload)
    return data.data
  },

  async deleteLesson(lessonId) {
    const { data } = await http.delete(`/admin/lessons/${lessonId}`)
    return data
  },
}
