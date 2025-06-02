<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'
import Switch from '@/components/ui/switch/Switch.vue'
import Textarea from '@/components/ui/textarea/Textarea.vue'

const props = defineProps<{
  modelValue: any
  mode?: 'create' | 'edit'
  loading?: boolean
}>()
const emit = defineEmits(['update:modelValue', 'submit'])

const local = ref({
  name: '',
  description: '',
  is_default: false,
  ...(props.modelValue || {}),
})

watch(
  () => props.modelValue,
  (val) => {
    local.value = {
      name: '',
      description: '',
      is_default: false,
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

const isDisabled = computed(() => props.modelValue.is_default === true)
</script>

<template>
  <form @submit="handleSubmit" class="space-y-6">
    <div class="space-y-2">
      <Label for="source-name">Name</Label>
      <Input id="source-name" v-model="local.name" :disabled="isDisabled || props.loading" required placeholder="Source name" @input="(e: Event) => handleInput('name', (e.target as HTMLInputElement).value)" :class="isDisabled ? 'pointer-events-none opacity-50' : ''" />
    </div>
    <div class="space-y-2">
      <Label for="source-description">Description</Label>
      <Textarea id="source-description" v-model="local.description" :disabled="isDisabled || props.loading" placeholder="Description (optional)" @input="(e: Event) => handleInput('description', (e.target as HTMLTextAreaElement).value)" :class="isDisabled ? 'pointer-events-none opacity-50' : ''" />
    </div>
    <div class="flex items-center gap-2">
      <Switch id="source-default" :checked="!!local.is_default" disabled />
      <Label for="source-default">Default (cannot be changed)</Label>
    </div>
    <div class="flex justify-end gap-2">
      <Button type="submit" :loading="props.loading" :disabled="isDisabled || props.loading">
        {{ isEdit ? 'Save Changes' : 'Create Source' }}
      </Button>
    </div>
  </form>
</template> 