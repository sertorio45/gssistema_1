<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'

const props = defineProps<{
  modelValue: any
  mode?: 'create' | 'edit'
  loading?: boolean
  nameError?: string
}>()
const emit = defineEmits(['update:modelValue', 'submit'])

const local = ref({
  name: '',
  description: '',
  ...(props.modelValue || {}),
})

watch(
  () => props.modelValue,
  (val) => {
    local.value = {
      name: '',
      description: '',
      ...(val || {}),
    }
  },
  { immediate: true },
)

function handleInput(key: string, value: any) {
  local.value[key] = value
  emit('update:modelValue', { ...local.value })
}

function handleSubmit(e: Event) {
  e.preventDefault()
  emit('submit', { ...local.value })
}

const isEdit = computed(() => props.mode === 'edit')
</script>

<template>
  <form @submit="handleSubmit" class="flex flex-col gap-4">
    <div class="flex gap-4 items-center">
      <div class="flex flex-col gap-1 w-64">
        <Label for="pipeline-name">Name *</Label>
        <Input id="pipeline-name" v-model="local.name" :disabled="props.loading" required placeholder="Name" @input="(e: Event) => handleInput('name', (e.target as HTMLInputElement).value)" />
        <p v-if="props.nameError" class="text-xs text-red-500 mt-1">{{ props.nameError }}</p>
      </div>
      <div class="flex flex-col gap-1 w-96">
        <Label for="pipeline-description">Description</Label>
        <Input id="pipeline-description" v-model="local.description" :disabled="props.loading" placeholder="Description (optional)" @input="(e: Event) => handleInput('description', (e.target as HTMLInputElement).value)" />
      </div>
      <Button type="submit" class="ml-auto" :loading="props.loading">{{ isEdit ? 'Save Pipeline' : 'Create Pipeline' }}</Button>
    </div>
  </form>
</template> 