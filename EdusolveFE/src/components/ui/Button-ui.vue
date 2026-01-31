<script setup>
defineProps({
  isLoading: { type: Boolean, default: false },
  label: { type: String, required: true },
});
</script>

<template>
  <button
    :disabled="isLoading"
    class="relative flex w-full items-center justify-center rounded-lg bg-primary py-3 text-base font-bold text-white shadow-sm hover:bg-[#116bcc] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-80 disabled:cursor-not-allowed"
  >
    <span :class="{ 'opacity-0': isLoading }">{{ label }}</span>

    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
      <svg
        class="animate-spin h-6 w-6 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  </button>
</template>
