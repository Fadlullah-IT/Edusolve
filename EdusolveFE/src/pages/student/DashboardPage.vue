<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { studentApi } from '@/api/student.api'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const error = ref('')
const enrollments = ref([])

// --- helpers ---
const safeName = computed(() => auth.user?.name?.split(' ')[0] || 'Student')

// derive "in progress" and "completed" from progress_percent
const inProgress = computed(() => enrollments.value.filter((e) => (e.progress_percent ?? 0) < 100))
const completed = computed(() => enrollments.value.filter((e) => (e.progress_percent ?? 0) >= 100))

// stats in the top cards || certs not in API, just placeholder
const stats = computed(() => ({
  inProgress: inProgress.value.length,
  completed: completed.value.length,
  certificates: 0,
}))

const formatLastLesson = (e) => {
  if (!e?.last_completed_lesson) return 'Not started yet'
  return `Last lesson: ${e.last_completed_lesson.title}`
}

const cardButtonLabel = (e) => {
  const p = e.progress_percent ?? 0
  if (p >= 100) return 'Review Course'
  if (p > 0) return 'Resume'
  return 'Start'
}

const cardButtonIcon = (e) => {
  const p = e.progress_percent ?? 0
  return p >= 100 ? 'replay' : 'play_arrow'
}

const goToCourses = () => router.push({ name: 'student.courses' })
const goClassroom = (courseId) =>
  router.push({ name: 'student.course.classroom', params: { id: courseId } })

const logout = async () => {
  await auth.logout()
  router.push({ name: 'login' })
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    enrollments.value = await studentApi.getDashboard()
  } catch (e) {
    error.value = e?.normalized?.message || 'Failed to load dashboard.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// simple  placeholder image based on course id
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
</script>

<template>
  <div class="bg-[#f6f7f8] text-[#111418] min-h-screen h-screen overflow-hidden flex font-display">
    <!-- Sidebar ex -->
    <aside
      class="w-72 bg-white border-r border-[#e5e7eb] flex-col shrink-0 h-full overflow-y-auto no-scrollbar hidden md:flex"
    >
      <div class="p-6">
        <div class="flex items-center gap-3 mb-8">
          <div
            class="size-10 rounded-full bg-[#137fec] flex items-center justify-center text-white"
          >
            <span class="material-symbols-outlined">school</span>
          </div>
          <div>
            <h1 class="text-lg font-bold leading-tight">Edusolve</h1>
            <p class="text-xs text-[#617589]">Dashboard</p>
          </div>
        </div>

        <!-- mini profile -->
        <div class="flex items-center gap-3 p-3 rounded-xl bg-[#f6f7f8] mb-6">
          <div
            class="bg-center bg-no-repeat bg-cover rounded-full size-10"
            style="
              background-image: url('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop');
            "
          ></div>
          <div class="flex flex-col overflow-hidden">
            <h2 class="text-sm font-semibold truncate">
              {{ auth.user?.name || 'Student' }}
            </h2>
            <p class="text-xs text-[#617589] truncate">
              {{ auth.user?.email || 'Welcome back' }}
            </p>
          </div>
        </div>

        <nav class="flex flex-col gap-2">
          <button
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#137fec]/10 text-[#137fec] transition-colors text-left"
          >
            <span class="material-symbols-outlined text-[22px] filled">menu_book</span>
            <span class="text-sm font-medium">My Dashboard</span>
          </button>

          <button
            @click="goToCourses"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#617589] hover:bg-[#f6f7f8] hover:text-[#111418] transition-colors text-left"
          >
            <span class="material-symbols-outlined text-[22px]">search</span>
            <span class="text-sm font-medium">All courses</span>
          </button>

          <button
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#617589] hover:bg-[#f6f7f8] hover:text-[#111418] transition-colors text-left"
            disabled
            title="Not part of assessment scope"
          >
            <span class="material-symbols-outlined text-[22px]">calendar_month</span>
            <span class="text-sm font-medium">Schedule</span>
          </button>

          <div class="h-px bg-[#e5e7eb] my-2"></div>

          <button
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#617589] hover:bg-[#f6f7f8] hover:text-[#111418] transition-colors text-left"
            disabled
          >
            <span class="material-symbols-outlined text-[22px]">person</span>
            <span class="text-sm font-medium">Profile</span>
          </button>

          <button
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#617589] hover:bg-[#f6f7f8] hover:text-[#111418] transition-colors text-left"
            disabled
          >
            <span class="material-symbols-outlined text-[22px]">settings</span>
            <span class="text-sm font-medium">Settings</span>
          </button>
        </nav>
      </div>

      <div class="mt-auto p-6">
        <div
          class="p-4 rounded-xl bg-gradient-to-br from-[#137fec] to-blue-600 text-white shadow-lg shadow-blue-500/20"
        >
          <p class="text-sm font-semibold mb-1">Weekly Goal</p>
          <p class="text-xs text-blue-100 mb-3">Keep learning — small steps every day.</p>
          <div class="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
            <div class="h-full bg-white rounded-full" style="width: 60%"></div>
          </div>
        </div>

        <button
          @click="logout"
          class="mt-4 w-full rounded-xl h-10 px-4 bg-[#137fec]/10 hover:bg-[#137fec]/20 text-[#137fec] text-sm font-semibold transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 h-full overflow-y-auto relative flex flex-col">
      <!-- Mobile header -->
      <header
        class="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#e5e7eb] sticky top-0 z-20"
      >
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#137fec]">school</span>
          <span class="font-bold">Edusolve</span>
        </div>
        <button @click="logout" class="text-[#137fec] font-semibold">Logout</button>
      </header>

      <div class="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-8 lg:p-12">
        <!-- Top heading -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div class="flex flex-col gap-2">
            <h1 class="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
              Welcome back, {{ safeName }}!
            </h1>
            <p class="text-[#617589] text-base">
              Pick up where you left off on your learning journey.
            </p>
          </div>

          <button
            @click="goToCourses"
            class="flex shrink-0 items-center justify-center gap-2 rounded-xl h-10 px-5 bg-white border border-[#e5e7eb] text-[#111418] text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <span class="material-symbols-outlined text-[20px]">search</span>
            <span>Browse New Courses</span>
          </button>
        </div>

        <!-- Error -->
        <div v-if="error" class="mb-6 bg-white border border-red-200 rounded-xl p-4 text-red-700">
          <div class="flex items-start justify-between gap-4">
            <p class="font-medium">{{ error }}</p>
            <button @click="load" class="text-[#137fec] hover:underline font-semibold">
              Retry
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div
            class="bg-white p-5 rounded-xl border border-[#e5e7eb] shadow-sm flex items-center gap-4"
          >
            <div
              class="size-12 rounded-full bg-blue-50 flex items-center justify-center text-[#137fec]"
            >
              <span class="material-symbols-outlined">auto_stories</span>
            </div>
            <div>
              <p class="text-[#617589] text-sm">Courses in Progress</p>
              <p class="text-2xl font-bold">{{ stats.inProgress }}</p>
            </div>
          </div>

          <div
            class="bg-white p-5 rounded-xl border border-[#e5e7eb] shadow-sm flex items-center gap-4"
          >
            <div
              class="size-12 rounded-full bg-green-50 flex items-center justify-center text-green-600"
            >
              <span class="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p class="text-[#617589] text-sm">Completed</p>
              <p class="text-2xl font-bold">{{ stats.completed }}</p>
            </div>
          </div>

          <div
            class="bg-white p-5 rounded-xl border border-[#e5e7eb] shadow-sm flex items-center gap-4"
          >
            <div
              class="size-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"
            >
              <span class="material-symbols-outlined">emoji_events</span>
            </div>
            <div>
              <p class="text-[#617589] text-sm">Certificates</p>
              <p class="text-2xl font-bold">{{ stats.certificates }}</p>
            </div>
          </div>
        </div>

        <!-- In Progress -->
        <div class="flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold">In Progress</h2>
            <button
              v-if="inProgress.length > 0"
              @click="goCatalog"
              class="text-[#137fec] text-sm font-medium hover:underline"
            >
              View all
            </button>
          </div>

          <!-- Loading skeletons -->
          <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div
              v-for="i in 3"
              :key="i"
              class="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden"
            >
              <div class="h-48 bg-gray-200 animate-pulse"></div>
              <div class="p-5 space-y-3">
                <div class="h-5 w-2/3 bg-gray-200 animate-pulse rounded"></div>
                <div class="h-4 w-1/2 bg-gray-200 animate-pulse rounded"></div>
                <div class="h-2 w-full bg-gray-200 animate-pulse rounded-full mt-6"></div>
                <div class="h-10 w-full bg-gray-200 animate-pulse rounded-lg"></div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="!error && enrollments.length === 0"
            class="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center"
          >
            <span class="material-symbols-outlined text-5xl text-[#617589]">school</span>
            <h3 class="mt-3 text-lg font-bold">No courses yet</h3>
            <p class="text-[#617589] mt-1">Browse the catalog and enroll in your first course.</p>
            <button
              @click="goCatalog"
              class="mt-5 inline-flex items-center justify-center gap-2 rounded-xl h-10 px-5 bg-[#137fec] hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
            >
              <span class="material-symbols-outlined text-[18px]">search</span>
              Browse Catalog
            </button>
          </div>

          <!-- Cards -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div
              v-for="e in enrollments"
              :key="e.course.id"
              class="group flex flex-col bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e5e7eb] overflow-hidden hover:shadow-lg hover:border-[#137fec]/30 transition-all duration-300"
            >
              <div class="relative h-48 w-full bg-gray-200 overflow-hidden">
                <div
                  class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  :style="{ backgroundImage: `url('${imageForCourse(e.course.id)}')` }"
                ></div>

                <!-- small category placeholder  -->
                <div
                  class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-[#111418]"
                >
                  Course
                </div>
              </div>

              <div class="flex flex-col flex-1 p-5 gap-4">
                <div class="flex flex-col gap-1">
                  <h3 class="text-lg font-bold leading-tight">{{ e.course.title }}</h3>
                  <p class="text-[#617589] text-sm line-clamp-1">
                    {{ formatLastLesson(e) }}
                  </p>
                </div>

                <div class="flex flex-col gap-2 mt-auto">
                  <div class="flex justify-between text-sm items-end">
                    <span class="text-[#617589] font-medium text-xs">Progress</span>

                    <span
                      v-if="(e.progress_percent ?? 0) >= 100"
                      class="text-green-600 font-bold flex items-center gap-1"
                    >
                      <span class="material-symbols-outlined text-[16px]">check_circle</span>
                      100%
                    </span>
                    <span v-else class="text-[#111418] font-bold">
                      {{ e.progress_percent ?? 0 }}%
                    </span>
                  </div>

                  <div class="h-2 w-full bg-[#f0f2f4] rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :class="(e.progress_percent ?? 0) >= 100 ? 'bg-green-500' : 'bg-[#137fec]'"
                      :style="{ width: `${e.progress_percent ?? 0}%` }"
                    ></div>
                  </div>
                </div>

                <button
                  @click="goClassroom(e.course.id)"
                  class="w-full cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 text-sm font-medium transition-colors mt-2"
                  :class="
                    (e.progress_percent ?? 0) >= 100
                      ? 'bg-white border border-[#e5e7eb] hover:bg-gray-50 text-[#111418]'
                      : 'bg-[#137fec] hover:bg-blue-600 text-white'
                  "
                >
                  <span class="material-symbols-outlined text-[18px]">{{ cardButtonIcon(e) }}</span>
                  {{ cardButtonLabel(e) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Recommended section  -->
        <div class="mt-12 mb-8">
          <h2 class="text-xl font-bold mb-6">Recommended for you</h2>
          <div
            class="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-white border border-[#e5e7eb]"
          >
            <div
              class="w-full sm:w-48 h-32 bg-cover bg-center rounded-lg shrink-0"
              style="
                background-image: url('https://images.unsplash.com/photo-1557825835-70d97c4aa567?q=80&w=1200&auto=format&fit=crop');
              "
            ></div>
            <div class="flex flex-col justify-center gap-2 grow">
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold"
                  >New</span
                >
                <span class="text-xs text-[#617589]">Product Design</span>
              </div>
              <h3 class="text-lg font-bold">Mastering Product Strategy</h3>
              <p class="text-[#617589] text-sm line-clamp-1">
                Learn how to build products users love with real-world case studies.
              </p>
            </div>
            <div class="flex items-center sm:self-center mt-2 sm:mt-0">
              <button
                @click="goCatalog"
                class="whitespace-nowrap rounded-lg h-9 px-4 bg-[#f0f2f4] hover:bg-[#e1e4e8] text-[#111418] text-sm font-medium transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
