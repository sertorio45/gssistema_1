<script setup lang="ts">
import { toast } from 'vue-sonner'

import Badge from '@/components/ui/badge/Badge.vue'
import Button from '@/components/ui/button/Button.vue'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTenant } from '~/composables/useTenant'

export interface MetaSyncCandidate {
  id: string
  name: string | null
  value: number
  currency: 'BRL'
  closed_at: string | null
  event_time: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  already_sent: boolean
  eligible: boolean
  blocking_reasons: string[]
}

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  synced: []
}>()

const { tenantId } = useTenant()
const loading = ref(false)
const sending = ref(false)
const candidates = ref<MetaSyncCandidate[]>([])
const selected = ref<Set<string>>(new Set())

const eligible = computed(() => candidates.value.filter(c => c.eligible))
const selectedCount = computed(() => selected.value.size)

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDate(value?: string | null) {
  if (!value)
    return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function toggle(id: string, checked: boolean | 'indeterminate') {
  const next = new Set(selected.value)
  if (checked === true)
    next.add(id)
  else
    next.delete(id)
  selected.value = next
}

function selectAllEligible() {
  selected.value = new Set(eligible.value.map(c => c.id))
}

function clearSelection() {
  selected.value = new Set()
}

async function loadCandidates() {
  if (!tenantId.value)
    return
  loading.value = true
  try {
    const res = await $fetch<{ data: MetaSyncCandidate[] }>('/api/crm/meta-capi/won-candidates', {
      query: { tenant_id: tenantId.value },
    })
    candidates.value = res.data || []
    selected.value = new Set((res.data || []).filter(c => c.eligible).map(c => c.id))
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao carregar ganhos')
    candidates.value = []
    selected.value = new Set()
  }
  finally {
    loading.value = false
  }
}

async function confirmSend() {
  if (!tenantId.value || !selectedCount.value)
    return
  sending.value = true
  try {
    const res = await $fetch<{
      data: { enqueued: number, sent: number, skipped: number, candidates: number }
    }>('/api/crm/meta-capi/sync-pending', {
      method: 'POST',
      body: {
        tenant_id: tenantId.value,
        lead_ids: [...selected.value],
      },
    })
    const { enqueued, sent, skipped } = res.data
    if (enqueued === 0 && sent === 0)
      toast.info(skipped ? `${skipped} lead(s) ignorados — confira telefone e status` : 'Nenhum lead enviado')
    else
      toast.success(`Meta: ${enqueued} enfileirados, ${sent} enviados${skipped ? `, ${skipped} ignorados` : ''}`)
    open.value = false
    emit('synced')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Falha ao enviar à Meta')
  }
  finally {
    sending.value = false
  }
}

watch(open, (value) => {
  if (value)
    loadCandidates()
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader class="border-b px-6 py-4">
        <DialogTitle>Enviar ganhos à Meta</DialogTitle>
        <DialogDescription>
          Selecione apenas leads em Ganho que vieram de campanha (ou qualificáveis).
          Telefone do contato é obrigatório. Enviamos valor (BRL), data/hora e dados do contato.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div v-if="loading" class="py-10 text-center text-sm text-muted-foreground">
          Carregando ganhos pendentes...
        </div>

        <div v-else-if="!candidates.length" class="py-10 text-center text-sm text-muted-foreground">
          Nenhum lead em Ganho pendente de envio.
        </div>

        <template v-else>
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-muted-foreground">
              {{ eligible.length }} elegível(is) · {{ selectedCount }} selecionado(s)
            </p>
            <div class="flex gap-2">
              <Button variant="ghost" size="sm" @click="selectAllEligible">
                Selecionar elegíveis
              </Button>
              <Button variant="ghost" size="sm" @click="clearSelection">
                Limpar
              </Button>
            </div>
          </div>

          <ul class="divide-y border rounded-xl">
            <li
              v-for="row in candidates"
              :key="row.id"
              class="flex items-start gap-3 px-3 py-3"
              :class="{ 'opacity-60': !row.eligible }"
            >
              <Checkbox
                class="mt-1"
                :checked="selected.has(row.id)"
                :disabled="!row.eligible"
                @update:checked="toggle(row.id, $event)"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-medium">
                    {{ row.name || 'Sem nome' }}
                  </p>
                  <Badge v-if="row.already_sent" variant="secondary">
                    Já enviado
                  </Badge>
                  <Badge v-else-if="!row.eligible" variant="destructive">
                    Incompleto
                  </Badge>
                </div>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  {{ formatMoney(row.value) }} · {{ formatDate(row.event_time) }}
                </p>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  Tel: {{ row.contact_phone || '—' }}
                  <span v-if="row.contact_email"> · {{ row.contact_email }}</span>
                </p>
                <p
                  v-if="row.blocking_reasons.length"
                  class="mt-1 text-xs text-amber-700 dark:text-amber-400"
                >
                  {{ row.blocking_reasons.join(' · ') }}
                </p>
              </div>
            </li>
          </ul>
        </template>
      </div>

      <DialogFooter class="border-t px-6 py-4">
        <Button variant="outline" :disabled="sending" @click="open = false">
          Cancelar
        </Button>
        <Button :disabled="sending || !selectedCount || loading" @click="confirmSend">
          <Icon name="lucide:share-2" class="mr-2 h-4 w-4" :class="{ 'animate-pulse': sending }" />
          {{ sending ? 'Enviando...' : `Enviar ${selectedCount || ''} à Meta` }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
