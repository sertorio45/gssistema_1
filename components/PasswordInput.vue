<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'

defineProps<{
  id?: string
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const showPassword = ref(false)

function updateValue(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      :type="showPassword ? 'text' : 'password'"
      :value="modelValue"
      class="h-10 w-full flex border border-input rounded-md bg-transparent px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed file:border-0 file:bg-transparent file:text-sm placeholder:text-muted-foreground file:font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
      @input="updateValue"
    >
    <button
      type="button"
      class="absolute right-3 top-1/2 -translate-y-1/2"
      tabindex="-1"
      @click="togglePasswordVisibility"
    >
      <Eye v-if="!showPassword" class="h-4 w-4 text-muted-foreground" />
      <EyeOff v-else class="h-4 w-4 text-muted-foreground" />
      <span class="sr-only">{{ showPassword ? 'Hide password' : 'Show password' }}</span>
    </button>
  </div>
</template>
