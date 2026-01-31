<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '@/api/admin.api'

const route = useRoute()
const router = useRouter()

// Safe opt id conversion
const courseId = computed(() => {
  const raw = route.params.id
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

const isEditMode = computed(() => !!courseId.value)

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const course = ref({
  id: null,
  title: '',
  description: '',
  status: 'draft',
})

const lessons = ref([])

const descriptionCount = computed(() => (course.value.description || '').length)
const lessonsCountText = computed(() => `${lessons.value.length} Lessons`)

const toast = ref({ show: false, type: 'success', msg: '' })

function showToast(type, msg) {
  toast.value = { show: true, type, msg }
  window.setTimeout(() => (toast.value.show = false), 2200)
}

function setFriendlyError(e, fallback = 'Something went wrong. Please try again.') {
  const status = e?.response?.status

  if (status === 404) {
    error.value = 'This course no longer exists.'
    return
  }
  if (status === 422) {
    error.value = 'Please check your inputs and try again.'
    return
  }
  if (status === 401 || status === 403) {
    error.value = 'You are not authorized to perform this action.'
    return
  }

  error.value = fallback
  console.error('Admin CourseManagement error:', e)
}

function resetCreateState() {
  course.value = { id: null, title: '', description: '', status: 'draft' }
  lessons.value = []
}

// Norm course payload from GET /admin/courses/:id
function normalizeCoursePayload(apiCourse) {
  course.value = {
    id: apiCourse.id,
    title: apiCourse.title ?? '',
    description: apiCourse.description ?? '',
    status: apiCourse.status ?? 'draft',
  }

  lessons.value = Array.isArray(apiCourse.lessons)
    ? apiCourse.lessons.slice().sort((a, b) => Number(a.order) - Number(b.order))
    : []
}

async function fetchCourse() {
  error.value = ''

  if (!isEditMode.value) {
    resetCreateState()
    loading.value = false
    return
  }

  loading.value = true
  try {
    const data = await adminApi.getCourse(courseId.value)
    normalizeCoursePayload(data)
  } catch (e) {
    setFriendlyError(e, 'Failed to load course.')
  } finally {
    loading.value = false
  }
}

async function saveCourse() {
  if (saving.value) return

  saving.value = true
  error.value = ''

  try {
    if (!course.value.title.trim()) {
      error.value = 'Course title is required.'
      return
    }

    if (isEditMode.value) {
      await adminApi.updateCourse(courseId.value, {
        title: course.value.title,
        description: course.value.description,
        status: course.value.status,
      })

      showToast('success', 'Changes saved.')
      return
    }

    // CREATE
    const created = await adminApi.createCourse({
      title: course.value.title,
      description: course.value.description,
      status: course.value.status,
    })

    showToast('success', 'Course created.')

    await router.replace({
      name: 'admin.course',
      params: { id: String(created.id) },
    })
  } catch (e) {
    setFriendlyError(e, 'Couldn’t save the course. Please try again.')
  } finally {
    saving.value = false
  }
}

function toggleStatus(checked) {
  course.value.status = checked ? 'published' : 'draft'
}

function lessonPreview(content) {
  if (!content) return ''
  return String(content)
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 90)
}

// Lesson Modal create/Edit + Rich Text Editor

const lessonModalOpen = ref(false)
const lessonModalMode = ref('create') // 'create' | 'edit'
const lessonSaving = ref(false)
const lessonError = ref('')

const lessonForm = ref({
  id: null,
  title: '',
  order: 1,
  content: '',
})

const editorEl = ref(null)

const lessonModalTitle = computed(() =>
  lessonModalMode.value === 'edit' ? 'Edit Lesson' : 'Add New Lesson',
)

function openCreateLessonModal() {
  if (!isEditMode.value) {
    error.value = 'Create the course first, then you can add lessons.'
    return
  }

  lessonModalMode.value = 'create'
  lessonError.value = ''

  const nextOrder =
    lessons.value.length > 0 ? Math.max(...lessons.value.map((l) => Number(l.order) || 0)) + 1 : 1

  lessonForm.value = {
    id: null,
    title: '',
    order: nextOrder,
    content: '',
  }

  lessonModalOpen.value = true

  requestAnimationFrame(() => {
    if (editorEl.value) editorEl.value.innerHTML = ''
  })
}

function openEditLessonModal(lesson) {
  if (!isEditMode.value) return

  lessonModalMode.value = 'edit'
  lessonError.value = ''

  lessonForm.value = {
    id: lesson.id,
    title: lesson.title ?? '',
    order: Number(lesson.order) || 1,
    content: lesson.content ?? '',
  }

  lessonModalOpen.value = true

  requestAnimationFrame(() => {
    if (editorEl.value) editorEl.value.innerHTML = lessonForm.value.content || ''
  })
}

function closeLessonModal() {
  if (lessonSaving.value) return
  lessonModalOpen.value = false
  lessonError.value = ''
}

function syncEditorToModel() {
  if (!editorEl.value) return
  lessonForm.value.content = editorEl.value.innerHTML || ''
}

function cmd(command, value = null) {
  if (!editorEl.value) return
  editorEl.value.focus()
  document.execCommand(command, false, value)
  syncEditorToModel()
}

function addLink() {
  const url = window.prompt('Enter URL (https://...)')
  if (!url) return
  cmd('createLink', url)
}

function addImage() {
  const url = window.prompt('Enter image URL (https://...)')
  if (!url) return
  cmd('insertImage', url)
}

async function saveLesson() {
  if (lessonSaving.value) return

  lessonError.value = ''
  error.value = ''
  syncEditorToModel()

  if (!lessonForm.value.title.trim()) {
    lessonError.value = 'Lesson title is required.'
    return
  }

  const orderNum = Number(lessonForm.value.order)
  if (!Number.isFinite(orderNum) || orderNum <= 0) {
    lessonError.value = 'Order must be a valid number greater than 0.'
    return
  }

  lessonSaving.value = true

  try {
    if (lessonModalMode.value === 'create') {
      const created = await adminApi.createLesson(courseId.value, {
        title: lessonForm.value.title,
        content: lessonForm.value.content,
        order: orderNum,
      })

      lessons.value = [...lessons.value, created].sort((a, b) => Number(a.order) - Number(b.order))

      showToast('success', 'Lesson created.')
      lessonModalOpen.value = false
      return
    }

    const updated = await adminApi.updateLesson(lessonForm.value.id, {
      title: lessonForm.value.title,
      content: lessonForm.value.content,
      order: orderNum,
    })

    lessons.value = lessons.value
      .map((l) => (l.id === updated.id ? updated : l))
      .sort((a, b) => Number(a.order) - Number(b.order))

    showToast('success', 'Lesson updated.')
    lessonModalOpen.value = false
  } catch (e) {
    const status = e?.response?.status
    if (status === 422) lessonError.value = 'Please check your inputs and try again.'
    else if (status === 401 || status === 403)
      lessonError.value = 'You are not authorized to perform this action.'
    else lessonError.value = 'Couldn’t save the lesson. Please try again.'

    console.error('Lesson modal error:', e)
  } finally {
    lessonSaving.value = false
  }
}

// Del Lesson Confirm Modal
const lessonToDelete = ref(null)
const deletingLessonId = ref(null)

function requestDeleteLesson(lesson) {
  if (!isEditMode.value) return
  lessonToDelete.value = lesson
}

function cancelDeleteLesson() {
  if (deletingLessonId.value) return
  lessonToDelete.value = null
}

async function confirmDeleteLesson() {
  if (!lessonToDelete.value) return
  if (deletingLessonId.value) return

  const lesson = lessonToDelete.value
  deletingLessonId.value = lesson.id
  error.value = ''

  try {
    await adminApi.deleteLesson(lesson.id)
    lessons.value = lessons.value.filter((l) => l.id !== lesson.id)
    showToast('success', 'Lesson deleted.')
    lessonToDelete.value = null
  } catch (e) {
    setFriendlyError(e, 'Failed to delete lesson.')
  } finally {
    deletingLessonId.value = null
  }
}

function onAddNewLesson() {
  openCreateLessonModal()
}

function onEditLesson(lesson) {
  openEditLessonModal(lesson)
}

function onDeleteLesson(lesson) {
  requestDeleteLesson(lesson)
}

onMounted(fetchCourse)
watch(() => route.params.id, fetchCourse)
</script>

<template>
  <div class="bg-background-light text-[#111418] font-display overflow-hidden">
    <div class="flex h-screen w-full">
      <!-- Sidebar -->
      <aside
        class="w-64 bg-white border-r border-[#dbe0e6] hidden md:flex flex-col flex-shrink-0 transition-colors duration-200"
      >
        <div class="p-6">
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-full bg-[#137fec] flex items-center justify-center text-white"
            >
              <span class="material-symbols-outlined">school</span>
            </div>
            <h1 class="text-xl font-bold tracking-tight text-[#111418]">EduSolve</h1>
          </div>
        </div>

        <nav class="flex-1 px-4 flex flex-col gap-2 overflow-y-auto">
          <a
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#617589] hover:bg-[#f0f2f4] transition-colors group"
            href="#"
            @click.prevent="router.push('/admin/dashboard')"
          >
            <span class="material-symbols-outlined group-hover:text-primary transition-colors"
              >dashboard</span
            >
            <span class="font-medium text-sm">Dashboard</span>
          </a>
          <a
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#617589] hover:bg-[#f0f2f4] transition-colors group"
            href="#"
            @click.prevent="router.push('/admin/dashboard')"
          >
            <span class="material-symbols-outlined group-hover:text-primary transition-colors"
              >book_2</span
            >
            <span class="font-medium text-sm">All Courses</span>
          </a>

          <a
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary transition-colors"
            href="#"
            @click.prevent="router.push('/admin/dashboard')"
          >
            <span class="material-symbols-outlined fill-1">tune</span>
            <span class="font-medium text-sm">Course Management</span>
          </a>

          <a
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#617589] hover:bg-[#f0f2f4] transition-colors group"
            href="#"
          >
            <span class="material-symbols-outlined group-hover:text-primary transition-colors"
              >settings</span
            >
            <span class="font-medium text-sm">Settings</span>
          </a>
        </nav>

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

      <!-- Main Content -->
      <main class="flex-1 flex flex-col h-full overflow-hidden relative">
        <!-- Header -->
        <header
          class="bg-white border-b border-[#dbe0e6] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 z-10"
        >
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2 text-sm text-[#617589]">
              <a
                class="hover:text-primary transition-colors"
                href="#"
                @click.prevent="router.push('/admin/dashboard')"
                >Courses</a
              >
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              <span class="text-[#111418] font-medium">
                {{ isEditMode ? course.title || '...' : 'New Course' }}
              </span>
            </div>
            <h2 class="text-2xl font-bold text-[#111418] leading-tight">
              {{ isEditMode ? 'Edit Course' : 'Create Course' }}
            </h2>
          </div>

          <div class="flex items-center gap-3">
            <button
              class="px-6 py-2 rounded-lg bg-primary hover:bg-blue-600 text-black hover:text-white border border-primary font-bold shadow-sm transition-all hover:shadow-md text-sm flex items-center gap-2 disabled:opacity-60"
              type="button"
              :disabled="saving || loading"
              @click="saveCourse"
            >
              <span v-if="saving" class="material-symbols-outlined animate-spin text-[18px]">
                progress_activity
              </span>
              <span v-else class="material-symbols-outlined text-[18px]">save</span>

              {{ saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Course' }}
            </button>
          </div>
        </header>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6 md:p-10">
          <div class="max-w-[960px] mx-auto flex flex-col gap-8 pb-20">
            <div
              v-if="error"
              class="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm"
            >
              {{ error }}
            </div>

            <div v-if="loading" class="text-sm text-[#617589]">Loading...</div>

            <template v-else>
              <!-- Course Details -->
              <section
                class="bg-white rounded-xl border border-[#dbe0e6] shadow-sm overflow-hidden"
              >
                <div
                  class="px-6 py-4 border-b border-[#dbe0e6] flex items-center justify-between bg-gray-50/50"
                >
                  <h3 class="text-lg font-bold text-[#111418]">Course Details</h3>

                  <div class="flex items-center gap-3">
                    <span class="text-sm font-medium text-[#617589]">Status:</span>

                    <label class="relative inline-flex items-center cursor-pointer group">
                      <input
                        class="sr-only peer"
                        type="checkbox"
                        :checked="course.status === 'published'"
                        @change="toggleStatus($event.target.checked)"
                      />
                      <div
                        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"
                      ></div>
                      <span
                        class="ms-3 text-sm font-medium"
                        :class="course.status === 'published' ? 'text-primary' : 'text-[#617589]'"
                      >
                        {{ course.status === 'published' ? 'Published' : 'Draft' }}
                      </span>
                    </label>
                  </div>
                </div>

                <div class="p-6 flex flex-col gap-6">
                  <div class="flex flex-col gap-2">
                    <label class="text-[#111418] text-sm font-medium leading-normal"
                      >Course Title</label
                    >
                    <input
                      v-model="course.title"
                      class="form-input w-full rounded-lg border border-[#dbe0e6] bg-white text-[#111418] placeholder-[#617589] focus:border-primary focus:ring-1 focus:ring-primary p-3 text-base font-normal transition-shadow"
                      type="text"
                      placeholder="e.g., UX Design 101"
                    />
                  </div>

                  <div class="flex flex-col gap-2">
                    <label class="text-[#111418] text-sm font-medium leading-normal"
                      >Description</label
                    >
                    <textarea
                      v-model="course.description"
                      maxlength="500"
                      class="form-input w-full rounded-lg border border-[#dbe0e6] bg-white text-[#111418] placeholder-[#617589] focus:border-primary focus:ring-1 focus:ring-primary p-3 min-h-[120px] text-base font-normal resize-y transition-shadow"
                      placeholder="Write a short description..."
                    />
                    <p class="text-xs text-[#617589] text-right">
                      {{ descriptionCount }} / 500 characters
                    </p>
                  </div>
                </div>
              </section>

              <!-- Curriculum -->
              <section class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-xl font-bold text-[#111418]">Curriculum</h3>
                  <span class="text-sm font-medium text-[#617589]">{{ lessonsCountText }}</span>
                </div>

                <div
                  class="bg-white rounded-xl border border-[#dbe0e6] shadow-sm overflow-hidden flex flex-col"
                >
                  <div
                    class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#dbe0e6] bg-gray-50/50 text-xs font-semibold text-[#617589] uppercase tracking-wider"
                  >
                    <div class="col-span-1"></div>
                    <div class="col-span-8">Lesson Title</div>
                    <div class="col-span-3 text-right">Actions</div>
                  </div>

                  <div class="flex flex-col divide-y divide-[#dbe0e6]">
                    <div
                      v-for="l in lessons"
                      :key="l.id"
                      class="group relative grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      @click="openEditLessonModal(l)"
                    >
                      <div class="col-span-1 flex items-center justify-start text-[#9ca3af]">
                        <span
                          class="material-symbols-outlined cursor-grab hover:text-[#111418] transition-colors"
                          >drag_indicator</span
                        >
                      </div>

                      <div class="col-span-8 flex flex-col justify-center">
                        <div class="flex items-center gap-2">
                          <span
                            class="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded"
                          >
                            {{ l.order }}
                          </span>
                          <p class="text-[#111418] font-medium text-base">
                            {{ l.title }}
                          </p>
                        </div>
                        <p class="text-sm text-[#617589] mt-1 pl-10 truncate">
                          {{ lessonPreview(l.content) }}
                        </p>
                      </div>

                      <div
                        class="col-span-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <button
                          class="size-8 flex items-center justify-center rounded-lg text-[#617589] hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit"
                          type="button"
                          :disabled="!isEditMode"
                          @click.stop="onEditLesson(l)"
                        >
                          <span class="material-symbols-outlined text-[20px]">edit</span>
                        </button>

                        <button
                          class="size-8 flex items-center justify-center rounded-lg text-[#617589] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                          type="button"
                          :disabled="!isEditMode"
                          @click.stop="onDeleteLesson(l)"
                        >
                          <span class="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>

                    <div v-if="!isEditMode" class="p-6 text-sm text-[#617589]">
                      Create the course first to start adding lessons.
                    </div>

                    <div v-else-if="!lessons.length" class="p-6 text-sm text-[#617589]">
                      No lessons yet.
                    </div>
                  </div>

                  <div class="p-4 bg-gray-50 border-t border-[#dbe0e6]">
                    <button
                      class="w-full py-4 border-2 border-dashed border-[#dbe0e6] rounded-xl flex flex-col items-center justify-center gap-2 text-[#617589] hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                      type="button"
                      :disabled="!isEditMode"
                      @click="onAddNewLesson"
                    >
                      <div
                        class="size-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform"
                      >
                        <span class="material-symbols-outlined text-2xl">add</span>
                      </div>
                      <span class="font-bold text-sm">Add New Lesson</span>
                    </button>
                  </div>
                </div>
              </section>
            </template>
          </div>
        </div>
      </main>

      <!-- Toaster -->
      <div
        v-if="toast.show"
        class="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium"
        :class="
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-700'
        "
      >
        {{ toast.msg }}
      </div>

      <!-- Lesson Modal -->
      <div
        v-if="lessonModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        @click.self="closeLessonModal"
      >
        <div
          class="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-[#dbe0e6] flex flex-col max-h-[90vh]"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-[#dbe0e6]">
            <h3 class="text-lg font-bold text-[#111418]">{{ lessonModalTitle }}</h3>
            <button
              class="text-[#617589] hover:text-[#111418] transition-colors disabled:opacity-50"
              :disabled="lessonSaving"
              @click="closeLessonModal"
              type="button"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 flex flex-col gap-6 overflow-y-auto">
            <div
              v-if="lessonError"
              class="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm"
            >
              {{ lessonError }}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div class="sm:col-span-3 flex flex-col gap-2">
                <label class="text-[#111418] text-sm font-medium">Lesson Title</label>
                <input
                  v-model="lessonForm.title"
                  class="form-input w-full rounded-lg border border-[#dbe0e6] bg-white text-[#111418] p-3 focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                  placeholder="e.g., Understanding Typography"
                  type="text"
                />
              </div>

              <div class="sm:col-span-1 flex flex-col gap-2">
                <label class="text-[#111418] text-sm font-medium">Order</label>
                <input
                  v-model="lessonForm.order"
                  class="form-input w-full rounded-lg border border-[#dbe0e6] bg-white text-[#111418] p-3 focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                  type="number"
                  min="1"
                  step="1"
                />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[#111418] text-sm font-medium">Lesson Content</label>

              <div
                class="border border-[#dbe0e6] rounded-lg overflow-hidden bg-white flex flex-col focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-shadow"
              >
                <!-- Toolbar -->
                <div class="flex items-center gap-1 p-2 border-b border-[#dbe0e6] bg-gray-50">
                  <button
                    class="p-1.5 rounded hover:bg-[#dbe0e6] text-[#617589] disabled:opacity-50"
                    type="button"
                    :disabled="lessonSaving"
                    @click="cmd('bold')"
                    title="Bold"
                  >
                    <span class="material-symbols-outlined text-[20px]">format_bold</span>
                  </button>

                  <button
                    class="p-1.5 rounded hover:bg-[#dbe0e6] text-[#617589] disabled:opacity-50"
                    type="button"
                    :disabled="lessonSaving"
                    @click="cmd('italic')"
                    title="Italic"
                  >
                    <span class="material-symbols-outlined text-[20px]">format_italic</span>
                  </button>

                  <button
                    class="p-1.5 rounded hover:bg-[#dbe0e6] text-[#617589] disabled:opacity-50"
                    type="button"
                    :disabled="lessonSaving"
                    @click="cmd('underline')"
                    title="Underline"
                  >
                    <span class="material-symbols-outlined text-[20px]">format_underlined</span>
                  </button>

                  <div class="w-px h-5 bg-[#dbe0e6] mx-1"></div>

                  <button
                    class="p-1.5 rounded hover:bg-[#dbe0e6] text-[#617589] disabled:opacity-50"
                    type="button"
                    :disabled="lessonSaving"
                    @click="cmd('insertUnorderedList')"
                    title="Bullets"
                  >
                    <span class="material-symbols-outlined text-[20px]">format_list_bulleted</span>
                  </button>

                  <button
                    class="p-1.5 rounded hover:bg-[#dbe0e6] text-[#617589] disabled:opacity-50"
                    type="button"
                    :disabled="lessonSaving"
                    @click="addLink"
                    title="Link"
                  >
                    <span class="material-symbols-outlined text-[20px]">link</span>
                  </button>

                  <button
                    class="p-1.5 rounded hover:bg-[#dbe0e6] text-[#617589] disabled:opacity-50"
                    type="button"
                    :disabled="lessonSaving"
                    @click="addImage"
                    title="Image URL"
                  >
                    <span class="material-symbols-outlined text-[20px]">image</span>
                  </button>
                </div>

                <!-- Editor -->
                <div class="relative">
                  <div
                    ref="editorEl"
                    class="w-full p-4 min-h-[220px] bg-transparent outline-none text-[#111418]"
                    contenteditable="true"
                    role="textbox"
                    aria-label="Lesson content editor"
                    @input="syncEditorToModel"
                  ></div>

                  <div
                    v-if="!(lessonForm.content && lessonForm.content.trim())"
                    class="absolute top-4 left-4 text-[#617589] pointer-events-none"
                  >
                    Start writing your lesson content...
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="px-6 py-4 border-t border-[#dbe0e6] bg-gray-50 rounded-b-xl flex justify-end gap-3"
          >
            <button
              class="px-4 py-2 rounded-lg text-[#617589] font-medium hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
              type="button"
              :disabled="lessonSaving"
              @click="closeLessonModal"
            >
              Cancel
            </button>

            <button
              class="px-6 py-2 rounded-lg bg-primary hover:bg-blue-600 text-black font-bold text-sm shadow-sm transition-all hover:shadow-md disabled:opacity-60 flex items-center gap-2"
              type="button"
              :disabled="lessonSaving"
              @click="saveLesson"
            >
              <span v-if="lessonSaving" class="material-symbols-outlined animate-spin text-[18px]">
                progress_activity
              </span>
              <span v-else class="material-symbols-outlined text-[18px]">save</span>
              {{ lessonSaving ? 'Saving...' : 'Save Lesson' }}
            </button>
          </div>
        </div>
      </div>
      <!-- /Lesson Modal -->

      <!--  Del Lesson Confirm Modal -->
      <div v-if="lessonToDelete" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="cancelDeleteLesson"></div>

        <div
          class="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#dbe0e6] overflow-hidden"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-[#dbe0e6] flex items-center justify-between">
            <h3 class="text-lg font-bold text-[#111418]">Delete Lesson</h3>
            <button
              class="text-[#617589] hover:text-[#111418] transition-colors disabled:opacity-50"
              :disabled="!!deletingLessonId"
              type="button"
              @click="cancelDeleteLesson"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6">
            <p class="text-sm text-[#617589]">
              Are you sure you want to delete
              <span class="font-semibold text-[#111418]">“{{ lessonToDelete.title }}”</span>? This
              action cannot be undone.
            </p>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-gray-50 border-t border-[#dbe0e6] flex justify-end gap-3">
            <button
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[#dbe0e6] text-[#617589] hover:bg-gray-50 transition-colors disabled:opacity-50"
              type="button"
              :disabled="!!deletingLessonId"
              @click="cancelDeleteLesson"
            >
              Cancel
            </button>

            <button
              class="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 flex items-center gap-2"
              type="button"
              :disabled="!!deletingLessonId"
              @click="confirmDeleteLesson"
            >
              <span
                v-if="deletingLessonId"
                class="material-symbols-outlined animate-spin text-[18px]"
              >
                progress_activity
              </span>
              <span v-else class="material-symbols-outlined text-[18px]">delete</span>
              {{ deletingLessonId ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
      <!-- /Delete Lesson Confirm Modal -->
    </div>
  </div>
</template>
