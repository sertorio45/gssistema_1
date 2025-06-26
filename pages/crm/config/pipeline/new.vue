<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTenant } from '~/composables/useTenant'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import { useFetch } from '#app'
import { toast } from '~/components/ui/toast/use-toast'

const router = useRouter()
const { tenantId } = useTenant()

const form = ref({
  name: '',
  description: '',
})

// Cores fixas para os stages default
const defaultStageColors = {
  new: '#3b82f6', // azul
  won: '#10b981', // verde
  lost: '#6b7280', // cinza
}

const defaultStages = ref([
  { key: 'new', label: 'New', name: 'New', color: defaultStageColors.new },
  { key: 'won', label: 'Won', name: 'Won', color: defaultStageColors.won },
  { key: 'lost', label: 'Lost', name: 'Lost', color: defaultStageColors.lost },
])

interface CustomStage {
  name: string
  color: string
  description?: string
}
const customStages = ref<CustomStage[]>([])

function randomColor() {
  // Gera cor aleatória em HEX
  const h = Math.floor(Math.random() * 360)
  const s = 60 + Math.floor(Math.random() * 30)
  const l = 40 + Math.floor(Math.random() * 30)
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

function addStage() {
  customStages.value.unshift({ name: '', color: randomColor(), description: '' })
}
function removeStage(idx: number) {
  customStages.value.splice(idx, 1)
}

async function handleSubmit() {
  // Obter tenant_id do contexto ou localStorage
  let currentTenantId = tenantId?.value
  if (!currentTenantId && typeof window !== 'undefined') {
    currentTenantId = localStorage.getItem('tenantId')
  }
  if (!currentTenantId) {
    console.warn('Tenant não identificado. Selecione um tenant antes de criar o pipeline.')
    return
  }
  // Debug: logar dados enviados
  console.log('Enviando pipeline:', {
    name: form.value.name,
    description: form.value.description,
    tenant_id: currentTenantId,
  })
  // 1. Cria pipeline e stages customizados juntos
  const validCustomStages = customStages.value.filter(stage => stage.name && stage.name.trim() && stage.color)
  const { data, error } = await useFetch('/api/crm/pipeline', {
    method: 'POST',
    body: {
      name: form.value.name,
      description: form.value.description,
      tenant_id: currentTenantId,
      customStages: validCustomStages,
    },
    watch: false,
    immediate: true,
  })
  if (error.value || !data.value?.body?.pipeline?.id) {
    toast({ title: 'Erro ao criar pipeline', description: error.value?.data?.message || error.value?.message || 'Erro ao criar pipeline. Tente novamente.' })
    return
  }
  toast({ title: 'Pipeline created successfully!' })
  setTimeout(() => {
    router.push('/crm/config/pipeline')
  }, 800)
}
function goBack() {
  router.push('/crm/config/pipeline')
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Pipelines</h1>
        <p class="text-muted-foreground">Manage all pipelines for your CRM.</p>
      </div>
      <Button variant="outline" @click="goBack">
        <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
        Back to List
      </Button>
    </div>
    <Card class="p-6">
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <div class="flex gap-4 items-center">
          <div class="flex flex-col gap-1 w-64">
            <Label for="pipeline-name">Name *</Label>
            <Input id="pipeline-name" v-model="form.name" placeholder="Name" required />
          </div>
          <div class="flex flex-col gap-1 w-96">
            <Label for="pipeline-description">Description</Label>
            <Input id="pipeline-description" v-model="form.description" placeholder="Description (optional)" />
          </div>
          <Button type="submit" class="ml-auto">Save Pipeline</Button>
        </div>
        <CardContent class="flex gap-4 mt-6 overflow-x-auto pb-2">
          <template v-for="(stage, idx) in [defaultStages[0], ...customStages, ...defaultStages.slice(1)]" :key="stage.key || idx">
            <div class="bg-card rounded-lg border p-6 flex-1 min-w-[260px] flex flex-col gap-3">
              <h3 class="font-semibold text-base mb-2">{{ 'label' in stage ? stage.label : 'Custom Stage' }}</h3>
              <div class="flex flex-col gap-2">
                <Label>Name *</Label>
                <Input v-if="!('label' in stage)" v-model="stage.name" placeholder="Stage name" required />
                <Input v-else :value="stage.name" disabled />
              </div>
              <Button v-if="!('label' in stage)" type="button" variant="destructive" class="mt-2 w-fit self-end" @click="removeStage(idx - 1)">Remove</Button>
            </div>
          </template>
          <div class="bg-card rounded-lg border p-6 flex-1 min-w-[260px] flex flex-col items-center justify-center text-center">
            <h3 class="font-semibold text-base mb-2">Add New Stages</h3>
            <p class="text-sm text-muted-foreground mb-3">Add new stage for your Pipeline</p>
            <Button type="button" variant="outline" @click="addStage">Add Stage</Button>
          </div>
        </CardContent>
      </form>
    </Card>
  </div>
</template>

<style scoped>
.input {
  @apply border rounded px-3 py-2 text-sm bg-white;
}
.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition;
}
.btn-outline {
  @apply border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50 transition;
}
</style> 