<script setup lang="ts">
import type { Product } from '~/types/crm'
import type { WhatsAppConversationLead } from '~/types/whatsapp'

import { formatLeadCurrency, formatLeadValueInput, parseLeadValueInput } from '~/composables/crm/useCrmLeadValue'
import { Button } from '~/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { toast } from 'vue-sonner'

const props = defineProps<{
  conversationId: string
  leadId: string | null
  lead: WhatsAppConversationLead | null
  products: Product[]
  productsLoading?: boolean
}>()

const emit = defineEmits<{
  updated: [lead: WhatsAppConversationLead]
}>()

const { updateConversationLead } = useWhatsAppConversations()

const expanded = ref(false)
const selectedProductId = ref<string | null>(null)
const valueInput = ref('R$ 0,00')
const saving = ref(false)

const toolbarButtonClass = 'h-8 gap-1.5'
const fieldClass = 'h-8 text-xs'

watch(
  () => props.lead,
  (lead) => {
    if (!lead)
      return
    valueInput.value = formatLeadValueInput(lead.value)
    const matchedProduct = props.products.find(product => product.name === lead.serviceName)
    selectedProductId.value = matchedProduct?.id ?? null
  },
  { immediate: true },
)

watch(
  () => props.products,
  () => {
    if (!props.lead)
      return
    const matchedProduct = props.products.find(product => product.name === props.lead?.serviceName)
    selectedProductId.value = matchedProduct?.id ?? null
  },
)

function handleValueInput(event: Event) {
  const input = event.target as HTMLInputElement
  valueInput.value = formatLeadValueInput(input.value)
}

function handleProductSelect(productId: string) {
  selectedProductId.value = productId
  const product = props.products.find(item => item.id === productId)
  if (product)
    valueInput.value = formatLeadValueInput(product.price)
}

async function handleSave() {
  if (!props.leadId)
    return

  saving.value = true
  try {
    const selectedProduct = props.products.find(item => item.id === selectedProductId.value)
    const response = await updateConversationLead(props.conversationId, {
      value: parseLeadValueInput(valueInput.value),
      serviceName: selectedProduct?.name ?? props.lead?.serviceName ?? null,
      productId: selectedProductId.value,
    })
    emit('updated', response)
    toast.success('Lead atualizado')
    expanded.value = false
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao atualizar lead')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Collapsible
    v-if="leadId && lead"
    v-model:open="expanded"
    class="border-b bg-background"
  >
    <CollapsibleTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="h-9 w-full justify-start gap-2 rounded-none px-4 text-xs font-normal"
      >
        <span
          class="i-lucide-chevron-right h-4 w-4 shrink-0 text-muted-foreground transition-transform"
          :class="expanded && 'rotate-90'"
        />
        <span class="text-muted-foreground">Lead</span>
        <span class="truncate font-medium text-foreground">
          {{ lead.funnelName || 'Funil' }}
        </span>
        <span v-if="lead.serviceName" class="hidden truncate text-muted-foreground sm:inline">
          · {{ lead.serviceName }}
        </span>
        <span v-if="lead.value" class="ml-auto shrink-0 text-muted-foreground">
          {{ formatLeadCurrency(lead.value) }}
        </span>
      </Button>
    </CollapsibleTrigger>

    <CollapsibleContent class="border-t px-4 pb-3 pt-3">
      <p class="mb-3 text-xs text-muted-foreground">
        {{ lead.funnelName || 'Funil' }} · {{ lead.name }}
      </p>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label class="text-xs">Serviço / produto</Label>
          <Select
            :model-value="selectedProductId || undefined"
            :disabled="productsLoading || saving"
            @update:model-value="handleProductSelect(String($event))"
          >
            <SelectTrigger :class="fieldClass">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="product in products"
                :key="product.id"
                :value="product.id"
              >
                {{ product.name }} · {{ formatLeadCurrency(product.price) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1.5">
          <Label class="text-xs">Valor</Label>
          <Input
            :model-value="valueInput"
            :class="fieldClass"
            inputmode="numeric"
            placeholder="R$ 0,00"
            :disabled="saving"
            @input="handleValueInput"
          />
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-end gap-2">
        <NuxtLink to="/crm/funnel">
          <Button variant="outline" size="sm" :class="toolbarButtonClass">
            Abrir funil
          </Button>
        </NuxtLink>
        <Button
          variant="outline"
          size="sm"
          :class="toolbarButtonClass"
          :disabled="saving"
          @click="handleSave"
        >
          Salvar
        </Button>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
