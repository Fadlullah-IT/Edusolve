import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import LoginPage from '../pages/auth/LoginPage.vue'

const StudentAllCoursesPage = () => import('../pages/student/AllCoursesPage.vue')
const StudentDashboardPage = () => import('../pages/student/DashboardPage.vue')
const StudentClassroomPage = () => import('../pages/student/CoursePage.vue')
const AdminDashboardPage = () => import('../pages/admin/AdminDashboardPage.vue')
const AdminCoursePage = () => import('../pages/admin/AdminCourseManagement.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginPage },

    // Student
    {
      path: '/student/courses',
      name: 'student.courses',
      component: StudentAllCoursesPage,
      meta: { requiresAuth: true, role: 'student' },
    },
    {
      path: '/student/dashboard',
      name: 'student.dashboard',
      component: StudentDashboardPage,
      meta: { requiresAuth: true, role: 'student' },
    },
    {
      path: '/student/courses/:id',
      name: 'student.course.classroom',
      component: StudentClassroomPage,
      props: true,
      meta: { requiresAuth: true, role: 'student' },
    },
    //Admin
    {
      path: '/admin/dashboard',
      name: 'admin.dashboard',
      component: AdminDashboardPage,
      meta: { requiresAuth: true, role: 'admin' },
    },
    {
      path: '/admin/course/:id?',
      name: 'admin.course',
      component: AdminCoursePage,
      meta: { requiresAuth: true, role: 'admin' },
    },

    // Catch-all
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // if route requires auth
  if (to.meta?.requiresAuth) {
    if (!auth.isAuthed) return { name: 'login' }
    if (to.meta?.role && auth.role !== to.meta.role) {
      // redirect to correct home
      return auth.isAdmin ? { name: 'admin.dashboard' } : { name: 'student.courses' }
    }
  }

  // if user is auth and tries to go login
  if (to.name === 'login' && auth.isAuthed) {
    return auth.isAdmin ? { name: 'admin.dashboard' } : { name: 'student.courses' }
  }

  return true
})

export default router
