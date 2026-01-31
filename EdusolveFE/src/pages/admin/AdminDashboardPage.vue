<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin.api'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

const loadingDashboard = ref(true)
const loadingTable = ref(true)
const error = ref('')

// Dashboard stats from /admin/dashboard
const stats = ref({
  total_courses: 0,
  total_students: 0,
  most_enrolled_course: null, // { id, title, enrollments_count }
})

// Courses table from /admin/courses
const courses = ref([])
const meta = ref(null)

const page = ref(1)
const search = ref('')
const debouncedSearch = ref('')

let searchTimer
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = search.value.trim()
    page.value = 1
  }, 300)
})

watch([page, debouncedSearch], () => {
  fetchCourses()
})

const total = computed(() => meta.value?.total ?? 0)
const from = computed(() => meta.value?.from ?? 0)
const to = computed(() => meta.value?.to ?? 0)
const lastPage = computed(() => meta.value?.last_page ?? 1)

const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < lastPage.value)

const prevPage = () => {
  if (!canPrev.value) return
  page.value -= 1
}
const nextPage = () => {
  if (!canNext.value) return
  page.value += 1
}

const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

// Simple cons thumbnails
const thumbForCourse = (courseId) => {
  const images = [
    'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?q=80&w=120&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=120&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=120&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=120&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526498460520-4c246339dccb?q=80&w=120&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=120&auto=format&fit=crop',
  ]
  const idx = Math.abs(Number(courseId || 0)) % images.length
  return images[idx]
}

const statusPillClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'published') {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
}

const statusDotClass = (status) => {
  const s = String(status || '').toLowerCase()
  return s === 'published' ? 'bg-green-500' : 'bg-gray-500'
}

// Scroll-to Courses
const contentScrollEl = ref(null)
const coursesSectionEl = ref(null)

const scrollToCourses = async () => {
  await nextTick()
  if (!contentScrollEl.value || !coursesSectionEl.value) return

  const container = contentScrollEl.value
  const target = coursesSectionEl.value

  // Scroll inside the main content container for all courses
  const top = target.offsetTop - 24
  container.scrollTo({ top, behavior: 'smooth' })
}

// Routes Actions

const gotoCourseManagement = () => {
  // create/ Course Management (create blank by default)
  router.push({ name: 'admin.course' })
}

const editCourse = (course) => {
  // edit/ Course Management page, load course by id
  router.push({ name: 'admin.course', params: { id: course.id } })
}

// clicking the row title also open management
const openCourse = (course) => editCourse(course)

const gotoSettings = () => router.push({ name: 'admin.settings' })

//  in-app modal for Del action

const courseToDelete = ref(null)
const busyDeleteId = ref(null)

const requestDeleteCourse = (course) => {
  courseToDelete.value = course
}

const cancelDelete = () => {
  courseToDelete.value = null
}

const confirmDeleteCourse = async () => {
  if (!courseToDelete.value) return
  if (busyDeleteId.value) return

  const course = courseToDelete.value
  busyDeleteId.value = course.id

  try {
    await adminApi.deleteCourse(course.id)
    await fetchCourses()
    await fetchDashboard()
  } catch (e) {
    error.value = e?.normalized?.message || 'Failed to delete course.'
  } finally {
    busyDeleteId.value = null
    courseToDelete.value = null
  }
}

const logout = async () => {
  await auth.logout()
  router.push({ name: 'login' })
}

// API
const fetchDashboard = async () => {
  loadingDashboard.value = true
  try {
    const res = await adminApi.getDashboard()
    stats.value = {
      total_courses: res?.total_courses ?? 0,
      total_students: res?.total_students ?? 0,
      most_enrolled_course: res?.most_enrolled_course ?? null,
    }
  } catch (e) {
    console.warn('Dashboard stats failed:', e)
  } finally {
    loadingDashboard.value = false
  }
}

const fetchCourses = async () => {
  loadingTable.value = true
  error.value = ''
  try {
    const res = await adminApi.getCourses({
      page: page.value,
      search: debouncedSearch.value || undefined,
    })

    courses.value = res?.data || []
    meta.value = res?.meta || null
  } catch (e) {
    error.value = e?.normalized?.message || 'Failed to load courses.'
  } finally {
    loadingTable.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchDashboard(), fetchCourses()])
})
</script>

<template>
  <div class="bg-white text-white font-display overflow-hidden">
    <div class="flex h-screen w-full overflow-hidden">
      <!-- Sidebar -->
      <aside
        class="w-64 flex-shrink-0 bg-white border-r border-[#51555c] text-black flex flex-col transition-colors duration-200"
      >
        <!-- Logo -->
        <div class="h-16 flex items-center px-6 border-b border-[#e5e7eb] dark:border-[#2d3b4a]">
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-full bg-[#137fec] flex items-center justify-center text-white"
            >
              <span class="material-symbols-outlined">school</span>
            </div>
            <h1 class="text-lg font-bold tracking-tight text-[#111418]">Edusolve</h1>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          <button
            class="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#137fec]/10 text-[#137fec] group transition-colors text-left"
          >
            <span class="material-symbols-outlined text-[24px]">dashboard</span>
            <span class="text-sm font-medium">Dashboard</span>
          </button>

          <!-- scroll to All Courses-->
          <button
            @click="scrollToCourses"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-[#617589] hover:bg-[#f0f2f4] transition-colors text-left"
          >
            <span class="material-symbols-outlined text-[24px]">book_2</span>
            <span class="text-sm font-medium">All Courses</span>
          </button>

          <!-- Course Management under All Courses -->

          <button
            @click="gotoCourseManagement"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-[#617589] hover:bg-[#f0f2f4] transition-colors text-left"
          >
            <span class="material-symbols-outlined text-[24px]">tune</span>
            <span class="text-sm font-medium">Course Management</span>
          </button>

          <button
            @click="gotoSettings"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-[#617589] hover:bg-[#f0f2f4] transition-colors text-left"
          >
            <span class="material-symbols-outlined text-[24px]">settings</span>
            <span class="text-sm font-medium">Settings</span>
          </button>
        </nav>

        <!-- User -->
        <div class="p-4 border-t border-[#e5e7eb] dark:border-[#2d3b4a]">
          <div class="flex items-center gap-3">
            <div
              class="bg-center bg-no-repeat bg-cover rounded-full size-10 flex-shrink-0"
              style="
                background-image: url('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop');
              "
            />
            <div class="flex flex-col overflow-hidden">
              <p class="text-sm font-medium text-black truncate">Admin User</p>
              <p class="text-xs text-black truncate">admin@edusolve.test</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main -->
      <main class="flex-1 flex flex-col h-full overflow-hidden bg-white text-black">
        <!-- Header -->
        <header
          class="h-16 flex-shrink-0 bg-white border-b border-[#e5e7eb] dark:border-[#2d3b4a] flex items-center justify-between px-8"
        >
          <div class="flex items-center gap-2">
            <span class="text-black text-sm">Home</span>
            <span
              class="text-[#637588] dark:text-[#9ca3af] text-sm material-symbols-outlined text-[16px] leading-none pt-0.5"
              >chevron_right</span
            >
            <span class="text-[#111418] font-medium text-sm">Dashboard</span>
          </div>

          <div class="flex items-center gap-4">
            <button
              class="flex items-center justify-center size-10 rounded-full hover:bg-[#f3f4f6] dark:hover:bg-[#2d3b4a] text-[#637588] dark:text-[#9ca3af] transition-colors"
              title="Notifications"
            >
              <span class="material-symbols-outlined">notifications</span>
            </button>

            <button
              @click="logout"
              class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#111418] bg-[#f3f4f6] dark:bg-[#273848] rounded-lg hover:bg-[#e5e7eb] dark:hover:bg-[#374151] transition-colors"
            >
              <span class="material-symbols-outlined text-[20px] text-white">logout</span>
              <span class="text-white">Logout</span>
            </button>
          </div>
        </header>

        <!-- Content (scroll container) -->
        <div ref="contentScrollEl" class="flex-1 overflow-y-auto p-8 bg-white text-black">
          <div class="max-w-6xl mx-auto space-y-8">
            <!-- Heading -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 class="text-2xl font-bold text-[#111418] tracking-tight">Dashboard Overview</h2>
                <p class="text-[#121415] mt-1 text-sm">
                  Welcome back! Here's what's happening with your courses today.
                </p>
              </div>

              <!-- Create route to Course Management (blank) -->
              <button
                @click="gotoCourseManagement"
                class="flex items-center gap-2 bg-[#137fec] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm transition-all duration-200 font-medium"
              >
                <span class="material-symbols-outlined text-[20px]">add</span>
                Create New Course
              </button>
            </div>

            <!-- Error -->
            <div
              v-if="error"
              class="bg-white dark:bg-[#1a2632] border border-red-200 dark:border-red-900/40 rounded-xl p-4 text-red-700 dark:text-red-300"
            >
              {{ error }}
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                class="bg-white dark:bg-[#1a2632] rounded-xl p-6 border border-[#e5e7eb] dark:border-[#2d3b4a] shadow-sm flex flex-col justify-between h-full"
              >
                <div class="flex justify-between items-start mb-4">
                  <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span class="material-symbols-outlined text-[#137fec] text-[24px]"
                      >library_books</span
                    >
                  </div>
                  <span
                    class="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium px-2 py-1 rounded-full"
                  >
                    +2 this week
                  </span>
                </div>
                <div>
                  <p class="text-[#637588] dark:text-[#9ca3af] text-sm font-medium mb-1">
                    Total Courses
                  </p>
                  <p class="text-3xl font-bold text-[#111418] dark:text-white">
                    {{ loadingDashboard ? '—' : stats.total_courses }}
                  </p>
                </div>
              </div>

              <div
                class="bg-white dark:bg-[#1a2632] rounded-xl p-6 border border-[#e5e7eb] dark:border-[#2d3b4a] shadow-sm flex flex-col justify-between h-full"
              >
                <div class="flex justify-between items-start mb-4">
                  <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span
                      class="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[24px]"
                      >group</span
                    >
                  </div>
                  <span
                    class="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium px-2 py-1 rounded-full"
                  >
                    +12% growth
                  </span>
                </div>
                <div>
                  <p class="text-[#637588] dark:text-[#9ca3af] text-sm font-medium mb-1">
                    Total Students
                  </p>
                  <p class="text-3xl font-bold text-[#111418] dark:text-white">
                    {{ loadingDashboard ? '—' : stats.total_students }}
                  </p>
                </div>
              </div>

              <div
                class="bg-white dark:bg-[#1a2632] rounded-xl p-6 border border-[#e5e7eb] dark:border-[#2d3b4a] shadow-sm flex flex-col justify-between h-full"
              >
                <div class="flex justify-between items-start mb-4">
                  <div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <span
                      class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[24px]"
                      >star</span
                    >
                  </div>
                </div>
                <div>
                  <p class="text-[#637588] dark:text-[#9ca3af] text-sm font-medium mb-1">
                    Top Performer
                  </p>
                  <p
                    class="text-xl font-bold text-[#111418] dark:text-white truncate"
                    :title="stats.most_enrolled_course?.title || '—'"
                  >
                    {{ loadingDashboard ? '—' : stats.most_enrolled_course?.title || '—' }}
                  </p>
                  <p
                    v-if="stats.most_enrolled_course"
                    class="text-xs text-[#637588] dark:text-[#9ca3af] mt-2"
                  >
                    {{ stats.most_enrolled_course.enrollments_count }} enrollments
                  </p>
                </div>
              </div>
            </div>

            <!-- Course List (scroll target) -->
            <div
              ref="coursesSectionEl"
              class="bg-white dark:bg-[#1a2632] rounded-xl border border-[#e5e7eb] dark:border-[#2d3b4a] shadow-sm overflow-hidden flex flex-col"
            >
              <!-- Toolbar -->
              <div
                class="p-5 border-b border-[#e5e7eb] dark:border-[#2d3b4a] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <h3 class="text-lg font-bold text-[#111418] dark:text-white">Course List</h3>

                <div class="relative w-full sm:w-72">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="material-symbols-outlined text-[#9ca3af] text-[20px]">search</span>
                  </div>
                  <input
                    v-model="search"
                    class="block w-full pl-10 pr-3 py-2 border border-[#e5e7eb] dark:border-[#374151] rounded-lg leading-5 bg-white dark:bg-[#111922] text-[#111418] dark:text-white placeholder-[#9ca3af] focus:outline-none focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] sm:text-sm transition duration-150 ease-in-out"
                    placeholder="Search courses..."
                    type="text"
                  />
                </div>
              </div>

              <!-- Table -->
              <div class="overflow-x-auto">
                <table class="min-w-full whitespace-nowrap text-left">
                  <thead class="bg-[#f9fafb] dark:bg-[#111922]">
                    <tr>
                      <th
                        class="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9ca3af] uppercase tracking-wider"
                      >
                        Course Title
                      </th>
                      <th
                        class="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9ca3af] uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        class="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9ca3af] uppercase tracking-wider"
                      >
                        Last Updated
                      </th>
                      <th
                        class="px-6 py-4 text-xs font-semibold text-[#637588] dark:text-[#9ca3af] uppercase tracking-wider text-right"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody class="divide-y divide-[#e5e7eb] dark:divide-[#2d3b4a]">
                    <tr v-if="loadingTable">
                      <td class="px-6 py-8" colspan="4">
                        <div class="flex items-center gap-3 text-[#637588] dark:text-[#9ca3af]">
                          <span class="material-symbols-outlined animate-spin"
                            >progress_activity</span
                          >
                          Loading courses...
                        </div>
                      </td>
                    </tr>

                    <tr v-else-if="courses.length === 0">
                      <td class="px-6 py-10" colspan="4">
                        <div class="text-center text-[#637588] dark:text-[#9ca3af]">
                          No courses found.
                        </div>
                      </td>
                    </tr>

                    <tr
                      v-else
                      v-for="c in courses"
                      :key="c.id"
                      class="hover:bg-[#f9fafb] dark:hover:bg-[#1f2d3a] transition-colors"
                    >
                      <td class="px-6 py-4">
                        <button class="w-full text-left" @click="openCourse(c)">
                          <div class="flex items-center gap-3">
                            <div
                              class="size-10 rounded-lg bg-cover bg-center flex-shrink-0"
                              :style="{
                                backgroundImage: `url('${thumbForCourse(c.id)}')`,
                              }"
                            ></div>
                            <div class="flex flex-col min-w-0">
                              <span
                                class="text-sm font-semibold text-[#111418] dark:text-white truncate"
                              >
                                {{ c.title }}
                              </span>
                              <span class="text-xs text-[#637588] dark:text-[#9ca3af] truncate">
                                {{ c.description }}
                              </span>
                            </div>
                          </div>
                        </button>
                      </td>

                      <td class="px-6 py-4">
                        <span
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          :class="statusPillClass(c.status)"
                        >
                          <span
                            class="size-1.5 rounded-full"
                            :class="statusDotClass(c.status)"
                          ></span>
                          {{
                            String(c.status || 'draft')
                              .charAt(0)
                              .toUpperCase() + String(c.status || 'draft').slice(1)
                          }}
                        </span>
                      </td>

                      <td class="px-6 py-4 text-sm text-[#637588] dark:text-[#9ca3af]">
                        {{ formatDate(c.updated_at) }}
                      </td>

                      <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <button
                            class="p-1.5 text-[#637588] hover:text-[#137fec] dark:text-[#9ca3af] dark:hover:text-[#137fec] transition-colors rounded-md hover:bg-[#137fec]/10"
                            title="Manage"
                            @click="editCourse(c)"
                          >
                            <span class="material-symbols-outlined text-[20px]">edit</span>
                          </button>

                          <button
                            class="p-1.5 text-[#637588] hover:text-red-600 dark:text-[#9ca3af] dark:hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                            :disabled="busyDeleteId === c.id"
                            @click="requestDeleteCourse(c)"
                          >
                            <span class="material-symbols-outlined text-[20px]">
                              {{ busyDeleteId === c.id ? 'progress_activity' : 'delete' }}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              <div
                class="px-6 py-4 border-t border-[#e5e7eb] dark:border-[#2d3b4a] flex items-center justify-between"
              >
                <p class="text-sm text-[#637588] dark:text-[#9ca3af]">
                  Showing
                  <span class="font-medium text-[#111418] dark:text-white">{{ from }}</span>
                  to
                  <span class="font-medium text-[#111418] dark:text-white">{{ to }}</span>
                  of
                  <span class="font-medium text-[#111418] dark:text-white">{{ total }}</span>
                  results
                </p>

                <div class="flex gap-2">
                  <button
                    class="px-3 py-1 text-sm font-medium rounded-md border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#111922] text-[#637588] dark:text-[#9ca3af] hover:bg-[#f9fafb] dark:hover:bg-[#1f2d3a] disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!canPrev"
                    @click="prevPage"
                  >
                    Previous
                  </button>

                  <button
                    class="px-3 py-1 text-sm font-medium rounded-md border border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#111922] text-[#111418] dark:text-white hover:bg-[#f9fafb] dark:hover:bg-[#1f2d3a] disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!canNext"
                    @click="nextPage"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Del Confirm Modal -->
    <div v-if="courseToDelete" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="cancelDelete"></div>

      <div
        class="relative w-full max-w-md mx-4 bg-white dark:bg-[#1a2632] rounded-xl shadow-xl border border-[#e5e7eb] dark:border-[#2d3b4a] p-6"
      >
        <div class="flex items-start gap-3">
          <div
            class="size-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center"
          >
            <span class="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
          </div>

          <div class="flex-1">
            <h3 class="text-lg font-bold text-[#111418] dark:text-white">Delete Course</h3>
            <p class="text-sm text-[#637588] dark:text-[#9ca3af] mt-1">
              Are you sure you want to delete
              <strong class="text-[#111418] dark:text-white">“{{ courseToDelete.title }}”</strong>?
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="cancelDelete"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-[#f3f4f6] dark:bg-[#2d3b4a] text-[#111418] dark:text-white hover:bg-[#e5e7eb] dark:hover:bg-[#374151] transition-colors"
          >
            Cancel
          </button>

          <button
            @click="confirmDeleteCourse"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!!busyDeleteId"
          >
            <span v-if="busyDeleteId" class="inline-flex items-center gap-2">
              <span class="material-symbols-outlined animate-spin text-[18px]"
                >progress_activity</span
              >
              Deleting...
            </span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}
</style>
