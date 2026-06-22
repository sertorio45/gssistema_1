<script setup lang="ts">
import { useFetch } from '#app'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import { toast } from '~/components/ui/toast/use-toast'
import { useTenant } from '~/composables/useTenant'

const router = useRouter()
const { tenantId } = useTenant()

const form = ref({
  name: '',
  description: '',
  is_active: true,
  priority: 0,
})

// Cores fixas para os stages default
const defaultStageColors = {
  new: '#3b82f6', // azul
  won: '#10b981', // verde
  lost: '#6b7280', // cinza
}

const defaultStages = ref([
  { key: 'new', label: 'Novo', name: 'Novo', color: defaultStageColors.new },
  { key: 'won', label: 'Ganho', name: 'Ganho', color: defaultStageColors.won },
  { key: 'lost', label: 'Perdido', name: 'Perdido', color: defaultStageColors.lost },
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
    console.warn('Tenant não identificado. Selecione um tenant antes de criar o funil.')
    return
  }
  // 1. Cria funil e stages customizados juntos
  const validCustomStages = customStages.value.filter(stage => stage.name && stage.name.trim() && stage.color)
  const { data, error } = await useFetch('/api/crm/funnel', {
    method: 'POST',
    body: {
      name: form.value.name,
      description: form.value.description,
      is_active: form.value.is_active,
      priority: form.value.priority,
      tenant_id: currentTenantId,
      customStages: validCustomStages,
    },
    watch: false,
    immediate: true,
  })
  if (error.value || !data.value?.body?.funnel?.id) {
    toast({ title: 'Erro ao criar funil', description: error.value?.data?.message || error.value?.message || 'Erro ao criar funil. Tente novamente.' })
    return
  }
  toast({ title: 'Funil criado com sucesso!' })
  setTimeout(() => {
    router.push('/crm/config/funnel')
  }, 800)
}
function goBack() {
  router.push('/crm/config/funnel')
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Funis
        </h1>
        <p class="text-muted-foreground">
          Gerencie todos os funis do seu CRM.
        </p>
      </div>
      <Button variant="outline" @click="goBack">
        <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
        Voltar à lista
      </Button>
    </div>
    <Card class="p-6">
      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <div class="flex items-center gap-4">
          <div class="w-64 flex flex-col gap-1">
            <Label for="funil-name">Nome *</Label>
            <Input id="funil-name" v-model="form.name" placeholder="Nome" required />
          </div>
          <div class="w-96 flex flex-col gap-1">
            <Label for="funil-description">Descrição</Label>
            <Input id="funil-description" v-model="form.description" placeholder="Descrição (opcional)" />
          </div>
          <Button type="submit" class="ml-auto">
            Salvar funil
          </Button>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-64 flex flex-col gap-1">
            <Label for="funil-priority">Prioridade</Label>
            <Input id="funil-priority" v-model="form.priority" type="number" placeholder="0" />
            <p class="mt-1 text-xs text-muted-foreground">
              Número maior = maior prioridade
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <input
              id="funil-active"
              v-model="form.is_active"
              type="checkbox"
              class="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
            >
            <Label for="funil-active" class="text-sm font-medium">
              Funil ativo
            </Label>
          </div>
        </div>
        <CardContent class="mt-6 flex gap-4 overflow-x-auto pb-2">
          <template v-for="(stage, idx) in [defaultStages[0], ...customStages, ...defaultStages.slice(1)]" :key="stage.key || idx">
            <div class="min-w-[260px] flex flex-1 flex-col gap-3 border rounded-lg bg-card p-6">
              <h3 class="mb-2 text-base font-semibold">
                {{ 'label' in stage ? stage.label : 'Estágio personalizado' }}
              </h3>
              <div class="flex flex-col gap-2">
                <Label>Nome *</Label>
                <Input v-if="!('label' in stage)" v-model="stage.name" placeholder="Nome do estágio" required />
                <Input v-else :value="stage.name" disabled />
              </div>
              <Button v-if="!('label' in stage)" type="button" variant="destructive" class="mt-2 w-fit self-end" @click="removeStage(idx - 1)">
                Remover
              </Button>
            </div>
          </template>
          <div class="min-w-[260px] flex flex-1 flex-col items-center justify-center border rounded-lg bg-card p-6 text-center">
            <h3 class="mb-2 text-base font-semibold">
              Adicionar estágios
            </h3>
            <p class="mb-3 text-sm text-muted-foreground">
              Adicione novos estágios ao seu funil
            </p>
            <Button type="button" variant="outline" @click="addStage">
              Adicionar estágio
            </Button>
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
