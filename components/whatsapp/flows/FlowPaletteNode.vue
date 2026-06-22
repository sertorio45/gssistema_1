<script setup lang="ts">
import type { WhatsAppFlowNodeType } from '~/types/whatsapp'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import {
  WHATSAPP_FLOW_NODE_MAP,
  getWhatsAppFlowNodeDisplay,
} from '~/constants/whatsapp-flow-nodes'

const props = defineProps<{
  type: WhatsAppFlowNodeType
}>()

const emit = defineEmits<{
  add: [type: WhatsAppFlowNodeType]
}>()

const definition = computed(() => WHATSAPP_FLOW_NODE_MAP[props.type])
const display = computed(() => {
  if (!definition.value)
    return null
  return getWhatsAppFlowNodeDisplay(definition.value, definition.value.defaultData)
})
</script>

<template>
  <div
    v-if="definition && display"
    class="wf-node wf-node--palette group/palette"
    :class="definition.className"
  >
    <button
      type="button"
      class="wf-node--palette__hit"
      :aria-label="`Adicionar bloco ${display.label}`"
      @click="emit('add', type)"
    >
      <aside class="wf-node__rail" aria-hidden="true">
        <Icon :name="display.icon" class="wf-node__rail-icon" />
      </aside>

      <div class="wf-node__body">
        <div class="wf-node__header wf-node__header--palette">
          <div class="wf-node__titles">
            <span class="wf-node__label">{{ display.label }}</span>
            <span v-if="display.badge" class="wf-node__badge">{{ display.badge }}</span>
          </div>
        </div>

        <div
          class="wf-node__preview wf-node__preview--compact"
          :class="{ 'wf-node__preview--muted': display.previewMuted }"
        >
          {{ display.preview }}
        </div>
      </div>
    </button>

    <Tooltip>
      <TooltipTrigger as-child>
        <button
          type="button"
          class="wf-node__info"
          :aria-label="`Informações sobre ${display.label}`"
          @click.stop
        >
          <Icon name="i-lucide-info" class="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" :side-offset="8" class="max-w-[240px] text-xs leading-relaxed">
        {{ definition.description }}
      </TooltipContent>
    </Tooltip>
  </div>
</template>
