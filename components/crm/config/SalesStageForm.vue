<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ColorPicker from '@/components/crm/config/ColorPicker.vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'
import Switch from '@/components/ui/switch/Switch.vue'
import Textarea from '@/components/ui/textarea/Textarea.vue'

const props = defineProps<{
  modelValue: any
  mode?: 'create' | 'edit'
  loading?: boolean
  nameError?: string
}>()
const emit = defineEmits(['update:modelValue', 'submit'])

const local = ref({
  name: '',
  order: 1,
  color: '',
  description: '',
  is_default: false,
  ...(props.modelValue || {}),
})

// Gera cor aleatória em HEX
function randomColor() {
  const h = Math.floor(Math.random() * 360)
  const s = 60 + Math.floor(Math.random() * 30) // saturação 60-90%
  const l = 40 + Math.floor(Math.random() * 30) // luminosidade 40-70%
  return hslToHex(h, s, l)
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const color = l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1)
    return Math.round(255 * color)
  }
  return `#${[f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

onMounted(() => {
  if (props.mode === 'create' && !local.value.color) {
    local.value.color = randomColor()
  }
})

watch(
  () => props.modelValue,
  (val) => {
    local.value = {
      name: '',
      order: 1,
      color: '',
      description: '',
      is_default: false,
      ...(val || {}),
    }
    if (props.mode === 'create' && !local.value.color) {
      local.value.color = randomColor()
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
      <Label for="stage-name">Name</Label>
      <Input id="stage-name" v-model="local.name" :disabled="isDisabled || props.loading" required placeholder="Stage name" @input="(e: Event) => handleInput('name', (e.target as HTMLInputElement).value)" :class="isDisabled ? 'pointer-events-none opacity-50' : ''" />
      <p v-if="props.nameError" class="text-xs text-red-500 mt-1">{{ props.nameError }}</p>
    </div>
    <div class="space-y-2">
      <Label for="stage-order">Order</Label>
      <Input id="stage-order" type="number" min="1" v-model.number="local.order" :disabled="isDisabled || props.loading" required placeholder="Order" @input="(e: Event) => handleInput('order', Number((e.target as HTMLInputElement).value))" :class="isDisabled ? 'pointer-events-none opacity-50' : ''" />
    </div>
    <div class="space-y-2">
      <Label for="stage-description">Description</Label>
      <Textarea id="stage-description" v-model="local.description" :disabled="isDisabled || props.loading" placeholder="Description (optional)" @input="(e: Event) => handleInput('description', (e.target as HTMLTextAreaElement).value)" :class="isDisabled ? 'pointer-events-none opacity-50' : ''" />
    </div>
    <div class="flex items-center gap-2">
      <Switch id="stage-default" :checked="!!local.is_default" disabled />
      <Label for="stage-default">Default (cannot be changed)</Label>
    </div>
    <div class="flex justify-end gap-2">
      <Button type="submit" :loading="props.loading" :disabled="isDisabled || props.loading">
        {{ isEdit ? 'Save Changes' : 'Create Stage' }}
      </Button>
    </div>
  </form>
</template> 