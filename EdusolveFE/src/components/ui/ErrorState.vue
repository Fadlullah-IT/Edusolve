<script setup>
defineProps({
  message: { type: String, default: 'Something went wrong.' },
})
</script>

<template>
  <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
    {{ message }}
  </div>
</template>
