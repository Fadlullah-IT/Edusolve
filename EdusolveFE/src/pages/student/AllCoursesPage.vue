<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { studentApi } from '@/api/student.api'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

const courses = ref([])
const enrollments = ref([]) // GET /student/enrollments
const searchQuery = ref('')

const isLoadingCourses = ref(true)
const isLoadingEnrollments = ref(true)
const isEnrollingId = ref(null)
const error = ref('')

// enrollment map for lookup
const enrollmentByCourseId = computed(() => {
  const map = {}
  for (const e of enrollments.value) map[e.course.id] = e
  return map
})

const isEnrolled = (courseId) => !!enrollmentByCourseId.value[courseId]
const courseProgress = (courseId) => enrollmentByCourseId.value[courseId]?.progress_percent ?? 0

// UX: spinner in search cat
const isSearching = computed(() => isLoadingCourses.value)

const goToCourse = (courseId) => {
  router.push({ name: 'student.course.classroom', params: { id: courseId } })
}

const imageForCourse = (courseId) => {
  const imgs = [
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1200&auto=format&fit=crop',
  ]
  return imgs[courseId % imgs.length]
}

// API
const fetchCourses = async () => {
  isLoadingCourses.value = true
  error.value = ''
  try {
    const response = await studentApi.getCatalog({ search: searchQuery.value })
    courses.value = response?.data || []
  } catch (e) {
    error.value = e?.normalized?.message || 'Failed to load catalog.'
  } finally {
    isLoadingCourses.value = false
  }
}

const fetchEnrollments = async () => {
  isLoadingEnrollments.value = true
  try {
    enrollments.value = await studentApi.getDashboard()
  } catch (e) {
    console.warn('Failed to load enrollments:', e)
  } finally {
    isLoadingEnrollments.value = false
  }
}

// when search debounce
let searchTimeout
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchCourses, 350)
})

// handle enroll
const handleEnroll = async (course) => {
  if (isEnrollingId.value) return
  if (isEnrolled(course.id)) return

  isEnrollingId.value = course.id
  error.value = ''

  // put enroll (only if not already present)
  enrollments.value = [
    {
      course: { id: course.id, title: course.title, description: course.description },
      progress_percent: 0,
      last_completed_lesson: null,
    },
    ...enrollments.value.filter((e) => e.course.id !== course.id),
  ]

  try {
    await studentApi.enroll(course.id)
    // success:  opt state, no extra request
  } catch (e) {
    const msg = e?.normalized?.message?.toLowerCase?.() || ''

    // when backend already enrolled | keep  state (as success)
    if (msg.includes('already') || msg.includes('enrolled')) {
      return
    }

    // rollback
    enrollments.value = enrollments.value.filter((en) => en.course.id !== course.id)
    error.value = e?.normalized?.message || 'Enrollment failed.'
  } finally {
    isEnrollingId.value = null
  }
}

const gotoDashboard = () => router.push({ name: 'student.dashboard' })
const goToCourses = () => router.push({ name: 'student.courses' })

const logout = async () => {
  await auth.logout()
  router.push({ name: 'login' })
}

onMounted(async () => {
  await Promise.all([fetchCourses(), fetchEnrollments()])
})
</script>

<template>
  <div
    class="bg-[#f6f7f8] font-display text-[#111418] min-h-screen flex flex-col overflow-x-hidden"
  >
    <!-- Top Nav-->
    <header
      class="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f0f2f4] bg-white px-4 md:px-10 py-3 sticky top-0 z-50"
    >
      <div class="flex items-center gap-4 text-[#111418]">
        <div class="size-10 rounded-full bg-[#137fec] flex items-center justify-center text-white">
          <span class="material-symbols-outlined">school</span>
        </div>

        <h2 class="text-lg font-bold leading-tight tracking-[-0.015em]">EduSolve</h2>
      </div>

      <div class="hidden md:flex items-center gap-9 flex-1 justify-center">
        <a
          class="text-[#111418] text-sm font-bold leading-normal border-b-2 border-[#137fec]"
          href="#"
          @click.prevent="goToCourses"
        >
          All Courses
        </a>
        <a
          class="text-[#617589] text-sm font-medium leading-normal hover:text-[#137fec] transition-colors"
          href="#"
          @click.prevent="gotoDashboard"
        >
          My Dashboard
        </a>
      </div>

      <div class="flex items-center justify-end gap-4 md:gap-8">
        <div class="flex gap-2 items-center">
          <button
            @click="logout"
            class="hidden md:flex min-w-[84px] items-center justify-center rounded-lg h-9 px-4 bg-[#137fec]/10 hover:bg-[#137fec]/20 text-[#137fec] text-sm font-bold transition-colors"
          >
            Logout
          </button>
          <button
            class="flex size-9 items-center justify-center rounded-full hover:bg-[#f0f2f4] transition-colors"
          >
            <span class="material-symbols-outlined text-[20px]">notifications</span>
          </button>
        </div>

        <div
          class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 ring-2 ring-white shadow-sm cursor-pointer"
          style="
            background-image: url('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop');
          "
        />
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <div class="w-full max-w-[1200px] flex flex-col gap-8">
        <!-- Heading -->
        <div class="flex flex-col gap-3">
          <h1
            class="text-[#111418] text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]"
          >
            Browse Courses
          </h1>
          <p class="text-[#617589] text-base font-normal leading-normal max-w-2xl">
            Explore new skills and advance your career with our curated courses. From coding to
            design, find the perfect path for you.
          </p>
        </div>

        <!-- Toolbar -->
        <div
          class="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 rounded-xl shadow-sm border border-[#f0f2f4]"
        >
          <label class="flex flex-col w-full lg:w-96">
            <div
              class="flex w-full items-center rounded-lg h-11 bg-[#f0f2f4] overflow-hidden focus-within:ring-2 focus-within:ring-[#137fec]/40 transition-shadow"
            >
              <div class="flex items-center justify-center pl-4 text-[#617589]">
                <span v-if="isSearching" class="material-symbols-outlined animate-spin text-[20px]"
                  >progress_activity</span
                >
                <span v-else class="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                v-model="searchQuery"
                class="w-full h-full bg-transparent border-none focus:ring-0 text-[#111418] placeholder:text-[#617589] px-3 text-base font-normal leading-normal"
                placeholder="Search courses, topics..."
              />
            </div>
          </label>

          <div class="flex gap-2 flex-wrap items-center">
            <span class="text-sm font-medium text-gray-500 mr-1 hidden sm:block">Filter by:</span>
            <button
              class="group flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#137fec] text-white pl-4 pr-3 transition-colors"
            >
              <span class="text-sm font-medium leading-normal">All Levels</span>
              <span class="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
            </button>
            <button
              class="group flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] hover:bg-gray-200 pl-4 pr-3 transition-colors"
            >
              <span class="text-[#111418] text-sm font-medium leading-normal">Category</span>
              <span class="material-symbols-outlined text-[18px] text-[#111418]"
                >keyboard_arrow_down</span
              >
            </button>
            <button
              class="group flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] hover:bg-gray-200 pl-4 pr-3 transition-colors"
            >
              <span class="text-[#111418] text-sm font-medium leading-normal">Duration</span>
              <span class="material-symbols-outlined text-[18px] text-[#111418]"
                >keyboard_arrow_down</span
              >
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-white border border-red-200 rounded-xl p-4 text-red-700">
          {{ error }}
        </div>

        <!-- Loading / empty -->
        <div
          v-if="(isLoadingCourses || isLoadingEnrollments) && courses.length === 0"
          class="flex justify-center items-center py-24"
        >
          <span class="material-symbols-outlined animate-spin text-4xl text-[#137fec]"
            >progress_activity</span
          >
        </div>

        <div
          v-else-if="!isLoadingCourses && courses.length === 0"
          class="text-center py-24 text-[#617589]"
        >
          <span class="material-symbols-outlined text-5xl mb-3">search_off</span>
          <p class="text-base font-medium">No courses found matching your search.</p>
        </div>

        <!-- Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="course in courses"
            :key="course.id"
            class="flex flex-col bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden group h-full border border-[#f0f2f4] relative"
            :class="isEnrolled(course.id) ? 'cursor-pointer' : ''"
            @click="isEnrolled(course.id) ? goToCourse(course.id) : null"
          >
            <div
              class="w-full h-48 bg-center bg-cover bg-no-repeat relative"
              :style="{
                backgroundImage: `url(${course.image_url || imageForCourse(course.id)})`,
              }"
            >
              <div
                class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold uppercase tracking-wide text-[#137fec] shadow-sm"
              >
                {{ course.category?.name || 'General' }}
              </div>

              <div
                v-if="isEnrolled(course.id)"
                class="absolute bottom-0 left-0 w-full h-1.5 bg-gray-200/30"
              >
                <div
                  class="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all duration-500"
                  :style="{ width: `${courseProgress(course.id)}%` }"
                ></div>
              </div>
            </div>

            <div class="p-5 flex flex-col flex-1 gap-4">
              <div class="flex flex-col gap-2 flex-1">
                <h3
                  class="text-[#111418] text-lg font-bold leading-tight group-hover:text-[#137fec] transition-colors"
                >
                  {{ course.title }}
                </h3>
                <p class="text-[#617589] text-sm font-normal leading-relaxed line-clamp-2">
                  {{ course.description }}
                </p>
              </div>

              <div
                class="flex items-center gap-4 text-[#617589] text-xs font-medium border-t border-gray-100 pt-4 mt-2"
              >
                <div class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>{{ course.lessons_count || null }} Lessons</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">schedule</span>
                  <span>{{ course.duration || 'N/A' }}</span>
                </div>
              </div>

              <!-- enrolled \/ Continue button -->
              <button
                v-if="isEnrolled(course.id)"
                @click.stop="goToCourse(course.id)"
                class="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-green-50 text-green-700 text-sm font-bold border border-green-100 hover:bg-green-100/70 transition-colors focus:outline-none focus:ring-2 focus:ring-green-300"
                title="Continue this course"
              >
                <span class="material-symbols-outlined text-[20px]">play_circle</span>
                Continue ({{ courseProgress(course.id) }}%)
              </button>

              <!-- enroll button -->
              <button
                v-else
                @click.stop="handleEnroll(course)"
                :disabled="isEnrollingId === course.id"
                class="w-full rounded-lg h-10 bg-[#137fec] hover:bg-blue-600 disabled:bg-blue-400 text-white text-sm font-bold transition-colors shadow-sm shadow-blue-200"
              >
                <span
                  v-if="isEnrollingId === course.id"
                  class="material-symbols-outlined animate-spin mr-2 text-[18px]"
                >
                  progress_activity
                </span>
                {{ isEnrollingId === course.id ? 'Enrolling...' : 'Enroll Now' }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex justify-center py-6">
          <button
            class="text-sm font-semibold text-[#137fec] hover:text-blue-700 transition-colors flex items-center gap-2"
          >
            Show More Courses
            <span class="material-symbols-outlined text-[18px]">expand_more</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700&display=swap');

.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
