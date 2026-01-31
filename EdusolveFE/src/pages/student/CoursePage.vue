<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { studentApi } from '@/api/student.api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const completing = ref(false)
const error = ref('')

const course = ref({ id: null, title: '', description: '' })
const lessons = ref([])
const currentLessonId = ref(null)

const enrollments = ref([]) // from /student/enrollments
const isLessonsDrawerOpen = ref(false)


// Enrollment lookup for this course

const enrollmentForThisCourse = computed(() => {
  const cid = Number(route.params.id)
  return enrollments.value.find((e) => Number(e?.course?.id) === cid) || null
})

// Order + navigatin hlp

const orderedLessons = computed(() =>
  [...lessons.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
)

const completedCount = computed(() => orderedLessons.value.filter((l) => l.is_completed).length)
const totalLessons = computed(() => orderedLessons.value.length)

const progressPercentage = computed(() => {
  const p = enrollmentForThisCourse.value?.progress_percent
  if (typeof p === 'number') return p
  if (!totalLessons.value) return 0
  return Math.round((completedCount.value / totalLessons.value) * 100)
})

const currentLesson = computed(() => {
  return orderedLessons.value.find((l) => String(l.id) === String(currentLessonId.value)) || null
})

const currentIndex = computed(() =>
  currentLesson.value ? orderedLessons.value.findIndex((l) => l.id === currentLesson.value.id) : -1,
)

const previousLesson = computed(() =>
  currentIndex.value > 0 ? orderedLessons.value[currentIndex.value - 1] : null,
)

const nextLesson = computed(() => {
  if (currentIndex.value < 0) return null
  if (currentIndex.value >= orderedLessons.value.length - 1) return null
  return orderedLessons.value[currentIndex.value + 1]
})

// Unlock rule: 1st always unlocked; others unlock when previous is completed /or self completed
const isLessonUnlocked = (lesson) => {
  const idx = orderedLessons.value.findIndex((l) => l.id === lesson.id)
  if (idx <= 0) return true
  const prev = orderedLessons.value[idx - 1]
  return !!prev?.is_completed || !!lesson?.is_completed
}


// API loaders // defensive parsing

const fetchEnrollments = async () => {
  try {
    const res = await studentApi.getDashboard()
    //  wrapper may return array directly or {data:[...]}
    enrollments.value = Array.isArray(res) ? res : res?.data || []
  } catch (e) {
    console.warn('Failed to fetch enrollments:', e)
  }
}



 // completedLessonsCount from progress_percent * totalLessons
 // Also use last_completed_lesson.order
// Use max() so progress matches reality for 33/67/100 cases.

const normalizeLessonsUsingEnrollment = () => {
  const enr = enrollmentForThisCourse.value
  if (!enr) return

  const lastOrder = enr.last_completed_lesson?.order ?? 0
  const total = orderedLessons.value.length || lessons.value.length || 0

  let inferredCompleted = 0
  const p = enr.progress_percent
  if (typeof p === 'number' && total > 0) {
    inferredCompleted = Math.round((p / 100) * total)
  }

  const completedUpToOrder = Math.max(lastOrder, inferredCompleted)

  lessons.value = lessons.value.map((l) => ({
    ...l,
    is_completed: completedUpToOrder > 0 ? (l.order ?? 0) <= completedUpToOrder : false,
  }))
}

const selectInitialLesson = () => {
  const queryLessonId = route.query.lesson

  if (queryLessonId) {
    const found = orderedLessons.value.find((l) => String(l.id) === String(queryLessonId))
    if (found && isLessonUnlocked(found)) {
      currentLessonId.value = found.id
      return
    }
  }

  const resume =
    orderedLessons.value.find((l) => !l.is_completed && isLessonUnlocked(l)) ||
    orderedLessons.value[orderedLessons.value.length - 1] ||
    orderedLessons.value[0] ||
    null

  currentLessonId.value = resume?.id ?? null
}

const loadCourse = async () => {
  loading.value = true
  error.value = ''

  try {
    // 1 enrollments first to mark completion
    await fetchEnrollments()

    // 2) fetch course + lessons
    const courseId = route.params.id
    const res = await studentApi.getCourse(courseId)

    // defensive parsing: wrapper might return {data:{...}} or {...}
    const data = res?.data || res

    course.value = {
      id: data?.id,
      title: data?.title || '',
      description: data?.description || '',
    }
    lessons.value = Array.isArray(data?.lessons) ? data.lessons : []

    // 3) apply complet derived from enrollment
    normalizeLessonsUsingEnrollment()

    // 4) pick lesson
    selectInitialLesson()
  } catch (e) {
    error.value = e?.normalized?.message || 'Failed to load course content.'
  } finally {
    loading.value = false
  }
}


// Actions
const selectLesson = async (lesson) => {
  if (!lesson) return
  if (!isLessonUnlocked(lesson)) return

  currentLessonId.value = lesson.id
  router.replace({ query: { ...route.query, lesson: lesson.id } })

  // UX:  drawer close on mobile
  isLessonsDrawerOpen.value = false

  // UX: scroll top to lesson body on change
  await nextTick()
  const body = document.querySelector('[data-lesson-body]')
  if (body) body.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const prevLesson = () => {
  if (previousLesson.value) selectLesson(previousLesson.value)
}

const nextLessonAction = () => {
  // normal then next
  if (nextLesson.value) {
    if (!isLessonUnlocked(nextLesson.value)) return
    selectLesson(nextLesson.value)
    return
  }

  // finish action || end of course
  if (progressPercentage.value === 100) {
    router.push({ name: 'student.dashboard' })
  } else {
    router.push({ name: 'student.courses' })
  }
}

const markAsComplete = async () => {
  if (!currentLesson.value || currentLesson.value.is_completed) return

  completing.value = true
  error.value = ''

  try {
    await studentApi.completeLesson(currentLesson.value.id)

    //then update local state immedtely
    const idx = lessons.value.findIndex((l) => l.id === currentLesson.value.id)
    if (idx !== -1) lessons.value[idx] = { ...lessons.value[idx], is_completed: true }

    // refresh enrollments for sidebar % + unlocks stay accurate
    await fetchEnrollments()
    normalizeLessonsUsingEnrollment()

    // auto-advance
    if (nextLesson.value && isLessonUnlocked(nextLesson.value)) {
      setTimeout(() => selectLesson(nextLesson.value), 250)
    }
  } catch (e) {
    const rawMsg = e?.normalized?.message || 'Could not save progress.'
    const msg = rawMsg.toLowerCase()

    // treat "already completed" as success UX-wise
    if (msg.includes('already') && msg.includes('completed')) {
      const idx = lessons.value.findIndex((l) => l.id === currentLesson.value.id)
      if (idx !== -1) lessons.value[idx] = { ...lessons.value[idx], is_completed: true }
      await fetchEnrollments()
      normalizeLessonsUsingEnrollment()
      return
    }

    error.value = rawMsg
  } finally {
    completing.value = false
  }
}


// route helpers

const gotoCourses = () => router.push({ name: 'student.courses' })
const goDashboard = () => router.push({ name: 'student.dashboard' })

const breadcrumbLessonTitle = computed(() => currentLesson.value?.title || 'Lesson')

const getLessonListClass = (lesson) => {
  const active = currentLesson.value?.id === lesson.id
  const unlocked = isLessonUnlocked(lesson)

  if (active) return 'relative bg-[#137fec]/10 border border-[#137fec]/20'
  if (!unlocked) return 'relative opacity-60'
  return 'relative hover:bg-[#f6f7f8]'
}

// Hero images: determine by id no backend
const heroImageFor = (seed) => {
  const images = [
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop',
  ]
  const n = Number(seed) || 0
  return images[Math.abs(n) % images.length]
}

const copyFirstCodeBlock = async () => {
  try {
    const el = document.querySelector('[data-lesson-body] pre code')
    const text = el?.textContent?.trim()
    if (!text) return
    await navigator.clipboard.writeText(text)
  } catch (e) {
    console.warn('Copy failed:', e)
  }
}

// Lifecycle / route changes
onMounted(loadCourse)

// Reload course when route course id change
watch(
  () => route.params.id,
  () => loadCourse(),
)

// If user changes ?lesson= in URL manually
watch(
  () => route.query.lesson,
  (val) => {
    if (!val) return
    const found = orderedLessons.value.find((l) => String(l.id) === String(val))
    if (found && isLessonUnlocked(found)) currentLessonId.value = found.id
  },
)
</script>

<template>
  <div
    class="flex flex-col h-screen w-full bg-[#f6f7f8] font-display text-[#111418] overflow-hidden"
  >
    <!-- Loading overlay -->
    <div v-if="loading" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#137fec]"></div>
    </div>

    <!-- Error overlay -->
    <div
      v-else-if="error && !currentLessonId"
      class="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center"
    >
      <p class="text-red-600 font-medium mb-4">{{ error }}</p>
      <div class="flex gap-3">
        <button @click="loadCourse" class="px-4 py-2 rounded-lg bg-[#137fec] text-white font-bold">
          Retry
        </button>
        <button @click="gotoCourses" class="px-4 py-2 rounded-lg bg-gray-100 font-bold">
          Back to Courses
        </button>
      </div>
    </div>

    <template v-else>
      <!-- Top Navigation -->
      <header
        class="flex-none flex items-center justify-between whitespace-nowrap border-b border-solid border-[#f0f2f4] bg-white px-4 md:px-10 py-3 z-20"
      >
        <div class="flex items-center gap-4">
          <div class="size-10 flex items-center justify-center bg-blue-500 rounded-full text-white">
            <span class="material-symbols-outlined">school</span>
          </div>
          <h2 class="text-lg font-bold leading-tight tracking-[-0.015em]">EduSolve</h2>
        </div>

        <div class="flex flex-1 justify-end gap-4 items-center">
          <button
            @click="goDashboard"
            class="hidden md:flex items-center justify-center h-10 px-4 rounded-full bg-[#f0f2f4] hover:bg-[#e1e4e8] transition-colors"
          >
            <span class="text-sm font-medium">Dashboard</span>
          </button>
          <div
            class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-white shadow-sm"
            style="
              background-image: url('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop');
            "
          ></div>
        </div>
      </header>

      <!-- Main Layout -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <aside class="hidden md:flex w-80 flex-col border-r border-[#f0f2f4] bg-white z-10">
          <!-- Sidebar header -->
          <div class="p-6 border-b border-[#f0f2f4]">
            <!-- Back to courses button\ -->
            <button
              @click="gotoCourses"
              class="text-xs text-gray-500 hover:text-[#137fec] mb-3 flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-sm">arrow_back</span>
              Back to Courses
            </button>

            <h3 class="text-lg font-bold mb-4 leading-tight">
              {{ course.title || 'Course' }}
            </h3>

            <div class="flex flex-col gap-2">
              <div class="flex gap-6 justify-between items-end">
                <p class="text-sm font-medium leading-normal">
                  {{ progressPercentage }}% Completed
                </p>
                <p class="text-xs font-normal leading-normal text-[#617589]">
                  {{ completedCount }}/{{ totalLessons }} Lessons
                </p>
              </div>

              <div class="rounded-full bg-[#dbe0e6] h-2 overflow-hidden">
                <div
                  class="h-full rounded-full bg-[#137fec] transition-all duration-500"
                  :style="{ width: `${progressPercentage}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Lesson list -->
          <div class="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            <div
              v-for="(lesson, idx) in orderedLessons"
              :key="lesson.id"
              @click="selectLesson(lesson)"
              class="group flex items-center gap-3 p-3 rounded-lg transition-colors"
              :class="[
                getLessonListClass(lesson),
                isLessonUnlocked(lesson) ? 'cursor-pointer' : 'cursor-not-allowed',
              ]"
            >
              <div
                v-if="currentLesson?.id === lesson.id"
                class="absolute left-0 top-2 bottom-2 w-1 bg-[#137fec] rounded-r"
              ></div>

              <div class="flex-none pl-2">
                <span
                  v-if="lesson.is_completed"
                  class="material-symbols-outlined text-[#137fec] text-[22px]"
                >
                  check_circle
                </span>
                <span
                  v-else-if="currentLesson?.id === lesson.id"
                  class="material-symbols-outlined text-[#137fec] text-[22px]"
                >
                  radio_button_unchecked
                </span>
                <span
                  v-else-if="isLessonUnlocked(lesson)"
                  class="material-symbols-outlined text-[#dbe0e6] text-[22px]"
                >
                  radio_button_unchecked
                </span>
                <span v-else class="material-symbols-outlined text-[#dbe0e6] text-[22px]"
                  >lock</span
                >
              </div>

              <div class="flex flex-col">
                <span
                  class="text-sm font-medium"
                  :class="{
                    'line-through text-[#617589]':
                      lesson.is_completed && currentLesson?.id !== lesson.id,
                    'text-[#111418] font-bold': currentLesson?.id === lesson.id,
                    'text-[#111418]': !lesson.is_completed && currentLesson?.id !== lesson.id,
                  }"
                >
                  {{ idx + 1 }}. {{ lesson.title }}
                </span>

                <span
                  class="text-xs"
                  :class="
                    currentLesson?.id === lesson.id
                      ? 'text-[#137fec] font-medium'
                      : 'text-[#9aaabb]'
                  "
                >
                  {{
                    currentLesson?.id === lesson.id
                      ? 'Currently Viewing'
                      : lesson.duration || '10 min'
                  }}
                </span>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-[#f0f2f4]">
            <button
              class="w-full flex items-center justify-center gap-2 text-sm font-medium text-[#617589] hover:text-[#137fec] transition-colors"
            >
              <span class="material-symbols-outlined text-lg">help</span>
              Need Help?
            </button>
          </div>
        </aside>

        <!-- Main content -->
        <main class="flex-1 flex flex-col bg-[#f6f7f8] overflow-y-auto relative custom-scrollbar">
          <!-- Breadcrumbs -->
          <div class="w-full px-6 py-4 md:px-12 md:py-6 max-w-5xl mx-auto">
            <div class="flex flex-wrap gap-2 items-center">
              <button
                class="text-[#617589] text-sm font-medium hover:text-[#137fec] transition-colors"
                @click="goDashboard"
              >
                My Courses
              </button>

              <span class="material-symbols-outlined text-[#617589] text-sm">chevron_right</span>

              <button
                class="text-[#617589] text-sm font-medium hover:text-[#137fec] transition-colors"
                @click="gotoCourses"
              >
                {{ course.title || 'Course' }}
              </button>

              <span class="material-symbols-outlined text-[#617589] text-sm">chevron_right</span>

              <span class="text-[#111418] text-sm font-medium bg-gray-200 px-2 py-0.5 rounded">
                {{ breadcrumbLessonTitle }}
              </span>
            </div>
          </div>

          <!-- Error  -->
          <div v-if="error" class="px-4 md:px-12 w-full max-w-5xl mx-auto -mt-2 mb-4">
            <div class="bg-white border border-red-200 rounded-xl p-4 text-red-700">
              {{ error }}
            </div>
          </div>

          <!-- Lesson Card -->
          <div class="flex-1 px-4 md:px-12 pb-12 w-full max-w-5xl mx-auto">
            <div class="bg-white rounded-xl shadow-sm border border-[#f0f2f4] overflow-hidden">
              <!-- Hero -->
              <div
                class="h-48 w-full bg-cover bg-center relative"
                :style="{
                  backgroundImage: `url(${heroImageFor(currentLesson?.id || course.id)})`,
                }"
              >
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div class="absolute bottom-6 left-8">
                  <span
                    class="inline-block px-3 py-1 mb-2 text-xs font-bold tracking-wider text-white uppercase bg-[#137fec] rounded-full"
                  >
                    Module 1
                  </span>
                  <h1 class="text-3xl font-bold text-white leading-tight">
                    {{ currentLesson?.title || 'Lesson' }}
                  </h1>
                </div>
              </div>

              <!-- Body -->
              <div class="px-8 py-10 md:px-12">
                <div
                  data-lesson-body
                  class="prose max-w-none text-[#111418] leading-relaxed text-lg"
                >

                  <div v-if="currentLesson?.content" v-html="currentLesson.content"></div>

                  <!--  fallback content  -->
                  <div v-else>
                    <p class="mb-6">
                      This lesson covers the core concepts of
                      <strong>{{ currentLesson?.title }}</strong
                      >. You’ll learn the key ideas, patterns, and best practices.
                    </p>

                    <h3 class="text-xl font-bold mb-3 mt-8">Key Concept</h3>
                    <p class="mb-4 text-base text-gray-600">
                      Short explanation paragraph goes here. Keep it scannable and practical.
                    </p>

                    <!-- Code block with copy -->
                    <div
                      class="bg-[#101922] rounded-lg p-5 my-6 font-mono text-sm text-gray-300 shadow-inner border border-gray-800 relative group"
                    >
                      <div
                        class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <button
                          @click="copyFirstCodeBlock"
                          class="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded"
                        >
                          Copy
                        </button>
                      </div>
                      <div class="flex gap-2 mb-2 border-b border-gray-700 pb-2">
                        <div class="size-3 rounded-full bg-red-500"></div>
                        <div class="size-3 rounded-full bg-yellow-500"></div>
                        <div class="size-3 rounded-full bg-green-500"></div>
                      </div>
                      <pre><code>if 5 &gt; 2:
    print("Five is greater than two!")</code></pre>
                    </div>

                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r">
                      <div class="flex gap-3">
                        <span class="material-symbols-outlined text-blue-500">info</span>
                        <p class="text-sm text-blue-900">
                          <strong>Pro Tip:</strong> Small tips like this make the lesson feel
                          “alive” and helpful.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Footer actions -->
                <div
                  class="mt-12 pt-8 border-t border-[#f0f2f4] flex flex-col md:flex-row items-center justify-between gap-6"
                >
                  <!-- Previous -->
                  <button
                    @click="prevLesson"
                    :disabled="!previousLesson"
                    class="flex items-center gap-3 group disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div
                      class="size-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-[#137fec] group-hover:text-white transition-colors"
                    >
                      <span class="material-symbols-outlined">chevron_left</span>
                    </div>
                    <div class="flex flex-col items-start">
                      <span class="text-xs text-gray-500 uppercase tracking-wide">Previous</span>
                      <span class="text-sm font-medium text-[#111418]">
                        {{ previousLesson?.title || 'Start' }}
                      </span>
                    </div>
                  </button>

                  <!-- Mark complete -->
                  <div class="flex-1 w-full md:w-auto flex justify-center">
                    <button
                      @click="markAsComplete"
                      :disabled="completing || currentLesson?.is_completed"
                      class="w-full md:w-auto px-8 py-3 bg-[#137fec] hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none disabled:transform-none"
                    >
                      <span
                        v-if="completing"
                        class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                      ></span>
                      <span v-else class="material-symbols-outlined">check_circle</span>

                      {{
                        currentLesson?.is_completed
                          ? 'Completed'
                          : completing
                            ? 'Saving...'
                            : 'Mark as Completed'
                      }}
                    </button>
                  </div>

                  <!-- Next -->
                  <button
                    @click="nextLessonAction"
                    :disabled="!nextLesson || !isLessonUnlocked(nextLesson)"
                    class="flex items-center gap-3 text-right group disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div class="flex flex-col items-end">
                      <span class="text-xs text-gray-500 uppercase tracking-wide">Next</span>
                      <span class="text-sm font-medium text-[#111418]">
                        {{ nextLesson?.title || 'Finished' }}
                      </span>
                    </div>
                    <div
                      class="size-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-[#137fec] group-hover:text-white transition-colors"
                    >
                      <span class="material-symbols-outlined">chevron_right</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- Mobile bottom bar  -->
        <div
          class="md:hidden flex-none bg-white border-t border-[#f0f2f4] p-4 flex justify-between items-center z-30"
        >
          <button
            @click="isLessonsDrawerOpen = true"
            class="flex flex-col items-center justify-center gap-1 text-gray-500 w-16"
          >
            <span class="material-symbols-outlined">menu_book</span>
            <span class="text-[10px]">Lessons</span>
          </button>

          <button
            @click="markAsComplete"
            :disabled="completing || currentLesson?.is_completed"
            class="flex-1 mx-4 bg-[#137fec] disabled:bg-gray-300 text-white py-2 rounded-lg font-medium text-sm"
          >
            {{
              currentLesson?.is_completed ? 'Completed' : completing ? 'Saving...' : 'Mark Complete'
            }}
          </button>

          <button
            @click="nextLessonAction"
            :disabled="!nextLesson || !isLessonUnlocked(nextLesson)"
            class="flex flex-col items-center justify-center gap-1 text-gray-500 w-16 disabled:opacity-40"
          >
            <span class="material-symbols-outlined">arrow_forward</span>
            <span class="text-[10px]">Next</span>
          </button>
        </div>

        <!-- Mobile Lessons Drawer -->
        <div v-if="isLessonsDrawerOpen" class="md:hidden fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/30" @click="isLessonsDrawerOpen = false"></div>
          <div
            class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[75vh] overflow-hidden"
          >
            <div class="p-4 border-b border-[#f0f2f4] flex items-center justify-between">
              <div class="flex flex-col">
                <p class="text-sm font-bold">{{ course.title }}</p>
                <p class="text-xs text-[#617589]">
                  {{ progressPercentage }}% completed • {{ completedCount }}/{{ totalLessons }}
                </p>
              </div>
              <button class="p-2 rounded-lg hover:bg-gray-100" @click="isLessonsDrawerOpen = false">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <div class="p-3 overflow-y-auto custom-scrollbar">
              <div
                v-for="(lesson, idx) in orderedLessons"
                :key="lesson.id"
                class="flex items-center gap-3 p-3 rounded-lg"
                :class="[
                  currentLesson?.id === lesson.id
                    ? 'bg-[#137fec]/10 border border-[#137fec]/20'
                    : 'hover:bg-[#f6f7f8]',
                  isLessonUnlocked(lesson) ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed',
                ]"
                @click="
                  () => {
                    if (isLessonUnlocked(lesson)) {
                      selectLesson(lesson)
                      isLessonsDrawerOpen = false
                    }
                  }
                "
              >
                <span
                  v-if="lesson.is_completed"
                  class="material-symbols-outlined text-[#137fec] text-[22px]"
                  >check_circle</span
                >
                <span
                  v-else-if="currentLesson?.id === lesson.id"
                  class="material-symbols-outlined text-[#137fec] text-[22px]"
                  >radio_button_unchecked</span
                >
                <span
                  v-else-if="isLessonUnlocked(lesson)"
                  class="material-symbols-outlined text-[#dbe0e6] text-[22px]"
                >
                  radio_button_unchecked
                </span>
                <span v-else class="material-symbols-outlined text-[#dbe0e6] text-[22px]"
                  >lock</span
                >

                <div class="flex flex-col">
                  <span class="text-sm font-medium">{{ idx + 1 }}. {{ lesson.title }}</span>
                  <span class="text-xs text-[#617589]">{{ lesson.duration || '10 min' }}</span>
                </div>
              </div>
            </div>

            <div class="p-4 border-t border-[#f0f2f4]">
              <button
                @click="gotoCourses"
                class="w-full h-10 rounded-lg bg-gray-100 font-bold text-sm"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
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

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 20px;
}
</style>
