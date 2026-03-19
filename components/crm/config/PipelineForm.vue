<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
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
  is_active: true,
  priority: 0,
  ...(props.modelValue || {}),
})

watch(
  () => props.modelValue,
  (val) => {
    local.value = {
      name: '',
      description: '',
      is_active: true,
      priority: 0,
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
  <form class="flex flex-col gap-4" @submit="handleSubmit">
    <div class="flex items-center gap-4">
      <div class="w-64 flex flex-col gap-1">
        <Label for="pipeline-name">Nome *</Label>
        <Input id="pipeline-name" v-model="local.name" :disabled="props.loading" required placeholder="Nome" @input="(e: Event) => handleInput('name', (e.target as HTMLInputElement).value)" />
        <p v-if="props.nameError" class="mt-1 text-xs text-red-500">
          {{ props.nameError }}
        </p>
      </div>
      <div class="w-96 flex flex-col gap-1">
        <Label for="pipeline-description">Descrição</Label>
        <Input id="pipeline-description" v-model="local.description" :disabled="props.loading" placeholder="Descrição (opcional)" @input="(e: Event) => handleInput('description', (e.target as HTMLInputElement).value)" />
      </div>
      <Button type="submit" class="ml-auto" :loading="props.loading">
        {{ isEdit ? 'Salvar Pipeline' : 'Criar Pipeline' }}
      </Button>
    </div>

    <!-- Additional fields for is_active and priority -->
    <div class="flex items-center gap-4">
      <div class="w-64 flex flex-col gap-1">
        <Label for="pipeline-priority">Prioridade</Label>
        <Input
          id="pipeline-priority"
          v-model="local.priority"
          :disabled="props.loading"
          type="number"
          placeholder="0"
          @input="(e: Event) => handleInput('priority', Number((e.target as HTMLInputElement).value))"
        />
        <p class="mt-1 text-xs text-muted-foreground">
          Número maior = maior prioridade
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <Checkbox
          id="pipeline-active"
          :checked="local.is_active"
          :disabled="props.loading"
          @update:checked="(checked: boolean) => handleInput('is_active', checked)"
        />
        <Label for="pipeline-active" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Pipeline ativo
        </Label>
      </div>
    </div>
  </form>
</template>
