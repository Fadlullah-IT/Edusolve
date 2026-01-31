<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import Alert from '@/components/ui/Alert-ui.vue'
import Button from '@/components/ui/Button-ui.vue'

// 1. Component State
const email = ref('')
3
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false) //  for visibility toggle

const auth = useAuthStore()
const router = useRouter()

// 2. The Toggle Handler
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

// 3. Login Handler
const handleLogin = async () => {
  auth.error = ''

  if (!email.value || !password.value) {
    auth.error = 'Please enter both email and password.'
    return
  }

  try {
    const user = await auth.login(email.value, password.value)
    if (user.role === 'admin') {
      router.push({ name: 'admin.dashboard' })
    } else {
      router.push({ name: 'student.dashboard' })
    }
  } catch (err) {
    // Errors handled by store
  }
}

// Helper function for demo accts
const fillDemo = (role) => {
  if (role === 'student') {
    email.value = 'student1@edusolve.test'
    password.value = 'password'
  } else if (role === 'admin') {
    email.value = 'admin@edusolve.test'
    password.value = 'password'
  }
}
</script>

<template>
  <div
    class="flex min-h-screen w-full bg-white dark:bg-[#101922] font-display text-[#111418] dark:text-white antialiased"
  >
    <div
      class="hidden lg:flex w-1/2 relative bg-[#137fec] flex-col justify-between overflow-hidden"
    >
      <div
        class="absolute inset-0 bg-cover bg-center"
        style="
          background-image: url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop');
        "
      ></div>
      <div
        class="absolute inset-0 bg-gradient-to-t from-[#0b4b8c] via-[#137fec]/80 to-[#137fec]/60"
      ></div>

      <div class="relative z-10 p-12 flex flex-col h-full justify-between text-white">
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center h-10 w-10 rounded-lg bg-white/20 backdrop-blur-md shadow-sm"
          >
            <span class="material-symbols-outlined text-white text-2xl">school</span>
          </div>
          <span class="text-2xl font-bold tracking-tight">EduSolve</span>
        </div>

        <div class="max-w-md">
          <h1 class="text-5xl font-bold leading-tight mb-4">
            Empower your learning journey today.
          </h1>
          <p class="text-white/80 text-xl">
            Access world-class courses, track your progress, and learn from industry experts all in
            one place.
          </p>
        </div>

        <div class="text-base font-medium text-white/60">
          © 2026 EduSolve Learning Management System.
        </div>
      </div>
    </div>

    <div
      class="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 bg-[#f6f7f8] dark:bg-[#101922]"
    >
      <div class="w-full max-w-[460px] flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <h2 class="text-4xl font-bold tracking-tight text-[#111418] dark:text-white">
            Welcome Back
          </h2>
          <p class="text-lg font-normal text-[#617589] dark:text-[#9AA8B7]">
            Sign in to access your courses
          </p>
        </div>

        <Alert :message="auth.error" type="error" />

        <form @submit.prevent="handleLogin" class="flex flex-col gap-5">
          <div class="flex flex-col gap-2">
            <label class="text-base font-semibold text-[#111418] dark:text-[#E0E0E0]" for="email"
              >Email</label
            >
            <div
              class="flex w-full items-stretch rounded-lg group focus-within:ring-2 focus-within:ring-[#137fec]/50 transition-all bg-white dark:bg-[#1A232E] shadow-sm"
            >
              <input
                v-model="email"
                id="email"
                type="email"
                placeholder="student@example.com"
                class="flex-1 w-full h-14 rounded-l-lg border border-r-0 border-[#dbe0e6] dark:border-[#3E4C59] bg-transparent px-4 text-lg text-[#111418] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#137fec] dark:focus:border-[#137fec] transition-colors"
                required
              />
              <div
                class="flex items-center justify-center w-14 rounded-r-lg border border-l-0 border-[#dbe0e6] dark:border-[#3E4C59] text-[#617589] dark:text-[#9AA8B7]"
              >
                <span class="material-symbols-outlined text-[24px]">mail</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-base font-semibold text-[#111418] dark:text-[#E0E0E0]" for="password"
              >Password</label
            >
            <div
              class="flex w-full items-stretch rounded-lg group focus-within:ring-2 focus-within:ring-[#137fec]/50 transition-all bg-white dark:bg-[#1A232E] shadow-sm"
            >
              <input
                v-model="password"
                id="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="•••••••••"
                class="flex-1 w-full h-14 rounded-l-lg border border-r-0 border-[#dbe0e6] dark:border-[#3E4C59] bg-transparent px-4 text-lg text-[#111418] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#137fec] dark:focus:border-[#137fec] transition-colors"
                required
              />
              <button
                type="button"
                @click="togglePassword"
                class="flex items-center justify-center w-14 rounded-r-lg border border-l-0 border-[#dbe0e6] dark:border-[#3E4C59] text-[#617589] dark:text-[#9AA8B7] hover:text-[#137fec] transition-colors focus:outline-none"
              >
                <span class="material-symbols-outlined text-[24px]">
                  {{ showPassword ? 'visibility' : 'visibility_off' }}
                </span>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label class="flex items-center gap-3 cursor-pointer group">
              <div class="relative flex items-center">
                <input
                  v-model="rememberMe"
                  type="checkbox"
                  class="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-[#dbe0e6] dark:border-[#3E4C59] bg-transparent checked:bg-[#137fec] checked:border-[#137fec] transition-all focus:ring-0 focus:ring-offset-0"
                />
                <span
                  class="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 pointer-events-none text-white"
                >
                  <span class="material-symbols-outlined text-[16px] font-bold">check</span>
                </span>
              </div>
              <span
                class="text-base font-medium text-[#111418] dark:text-[#E0E0E0] group-hover:text-[#137fec] transition-colors"
                >Remember Me</span
              >
            </label>
            <a
              href="#"
              class="text-base font-semibold text-[#137fec] hover:text-[#116bcc] hover:underline transition-colors"
              >Forgot Password?</a
            >
          </div>

          <Button :isLoading="auth.loading" label="Log in to your account" type="submit" />
        </form>

        <div class="mt-2 pt-6 border-t border-[#dbe0e6] dark:border-[#3E4C59]">
          <p
            class="text-sm font-semibold text-[#617589] dark:text-[#9AA8B7] uppercase tracking-wider mb-4 text-center"
          >
            Demo Accounts (Click to Fill)
          </p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              @click="fillDemo('student')"
              class="flex flex-col items-center p-3 bg-white dark:bg-[#1A232E] border border-[#dbe0e6] dark:border-[#3E4C59] rounded-lg hover:border-[#137fec] dark:hover:border-[#137fec] hover:bg-[#f0f7ff] dark:hover:bg-[#137fec]/10 transition-all cursor-pointer group shadow-sm"
            >
              <span
                class="text-sm font-bold text-[#111418] dark:text-white group-hover:text-[#137fec] transition-colors"
                >Student</span
              >
              <span class="text-xs text-[#617589] dark:text-[#9AA8B7] mt-1 font-mono"
                >student1@edusolve.test</span
              >
            </button>

            <button
              @click="fillDemo('admin')"
              class="flex flex-col items-center p-3 bg-white dark:bg-[#1A232E] border border-[#dbe0e6] dark:border-[#3E4C59] rounded-lg hover:border-[#137fec] dark:hover:border-[#137fec] hover:bg-[#f0f7ff] dark:hover:bg-[#137fec]/10 transition-all cursor-pointer group shadow-sm"
            >
              <span
                class="text-sm font-bold text-[#111418] dark:text-white group-hover:text-[#137fec] transition-colors"
                >Admin</span
              >
              <span class="text-xs text-[#617589] dark:text-[#9AA8B7] mt-1 font-mono"
                >admin@edusolve.test</span
              >
            </button>
          </div>
          <p class="text-center text-xs text-[#617589] dark:text-[#9AA8B7] mt-3">
            Demo Password:
            <span class="font-mono text-[#111418] dark:text-white font-medium">password</span>
          </p>
        </div>

        <div class="text-center pt-2">
          <p class="text-base text-[#617589] dark:text-[#9AA8B7]">
            Don't have an account?
            <a
              class="font-semibold text-[#137fec] hover:text-[#116bcc] hover:underline ml-1"
              href="#"
              >Contact Administrator</a
            >
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
