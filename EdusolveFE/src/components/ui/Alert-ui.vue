<script setup>
defineProps({
  message: { type: String, required: true },
  type: { type: String, default: "error" }, // 'error', 'success'
});
</script>

<template>
  <div
    v-if="message"
    class="flex items-start gap-3 p-3 text-sm font-medium rounded-lg border transition-all animate-in fade-in slide-in-from-top-1"
    :class="[
      type === 'error'
        ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30'
        : '',
      type === 'success'
        ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/30'
        : '',
    ]"
  >
    <span
      class="material-symbols-outlined text-[20px] leading-none shrink-0"
      :class="type === 'error' ? 'text-red-500' : 'text-green-500'"
    >
      {{ type === "error" ? "error" : "check_circle" }}
    </span>
    <span class="leading-tight pt-0.5">{{ message }}</span>
  </div>
</template>
