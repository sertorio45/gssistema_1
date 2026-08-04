<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  formatLeadValueInput,
  formatLeadValueInputMask,
} from '~/composables/crm/useCrmLeadValue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  /** When lead is won, also allow setting the closed metric amount. */
  closedValue?: string
  showClosedValue?: boolean
  idPrefix?: string
}>(), {
  closedValue: '',
  showClosedValue: false,
  idPrefix: 'lead-value',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:closedValue': [value: string]
}>()

const values = computed({
  get: () => (props.modelValue?.length ? props.modelValue : ['']),
  set: (next: string[]) => emit('update:modelValue', next.length ? next : ['']),
})

function onInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const next = [...values.value]
  next[index] = formatLeadValueInputMask(input.value)
  values.value = next
}

function addValue() {
  values.value = [...values.value, formatLeadValueInput(0)]
}

function removeValue(index: number) {
  if (values.value.length <= 1)
    return
  const next = values.value.filter((_, i) => i !== index)
  values.value = next.length ? next : ['']
}

function onClosedInput(event: Event) {
  const input = event.target as HTMLInputElement
  emit('update:closedValue', formatLeadValueInputMask(input.value))
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <Label :for="`${idPrefix}-0`">Valores da proposta</Label>
      <Button type="button" variant="outline" size="sm" class="h-8" @click="addValue">
        <Icon name="lucide:plus" class="mr-1 h-4 w-4" />
        Adicionar valor
      </Button>
    </div>

    <div class="space-y-2">
      <div
        v-for="(item, index) in values"
        :key="`${idPrefix}-${index}`"
        class="flex items-center gap-2"
      >
        <Input
          :id="`${idPrefix}-${index}`"
          :model-value="item"
          placeholder="R$ 0,00"
          type="text"
          inputmode="numeric"
          class="flex-1"
          @input="onInput(index, $event)"
        />
        <Button
          v-if="values.length > 1"
          type="button"
          variant="ghost"
          size="icon"
          class="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
          @click="removeValue(index)"
        >
          <Icon name="lucide:trash-2" class="h-4 w-4" />
          <span class="sr-only">Remover valor</span>
        </Button>
      </div>
    </div>

    <p class="text-xs text-muted-foreground">
      Com 2 ou mais valores, o card do lead exibe o intervalo (ex.: De R$ 100,00 a R$ 399,99).
    </p>

    <div v-if="showClosedValue" class="space-y-2 border-t pt-3">
      <Label :for="`${idPrefix}-closed`">Valor fechado (métricas)</Label>
      <Input
        :id="`${idPrefix}-closed`"
        :model-value="closedValue"
        placeholder="R$ 0,00"
        type="text"
        inputmode="numeric"
        @input="onClosedInput"
      />
      <p class="text-xs text-muted-foreground">
        Usado nas métricas de ganhos após o lead entrar em Ganho.
      </p>
    </div>
  </div>
</template>
