<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

import type { WhatsAppFlowNodeType } from '~/types/whatsapp'

import { WHATSAPP_FLOW_NODE_MAP, getWhatsAppFlowNodeDisplay } from '~/constants/whatsapp-flow-nodes'

const props = defineProps<NodeProps>()

const nodeType = computed(() => String(props.data?.nodeType || '') as WhatsAppFlowNodeType)
const definition = computed(() => WHATSAPP_FLOW_NODE_MAP[nodeType.value])
const display = computed(() => {
  if (!definition.value)
    return null
  return getWhatsAppFlowNodeDisplay(definition.value, props.data as Record<string, unknown>)
})

function outputHandleStyle(index: number, total: number) {
  if (total <= 1)
    return { top: '50%' }

  const step = 100 / (total + 1)
  return { top: `${step * index}%` }
}

function outputHandleClass(index: number) {
  if (nodeType.value !== 'condition')
    return ''

  return index === 1 ? 'wf-handle--true' : 'wf-handle--false'
}
</script>

<template>
  <div
    v-if="display && definition"
    class="wf-node"
    :class="definition.className"
  >
    <Handle
      v-if="definition.inputs > 0"
      id="input_1"
      type="target"
      :position="Position.Left"
      :connectable-end="true"
      :connectable-start="false"
      class="wf-handle wf-handle--target"
    />

    <div class="wf-node__surface">
      <aside class="wf-node__rail" aria-hidden="true">
        <Icon :name="display.icon" class="wf-node__rail-icon" />
      </aside>

      <div class="wf-node__body">
        <div class="wf-node__header">
          <span class="wf-node__label">{{ display.label }}</span>
          <span v-if="display.badge" class="wf-node__badge">{{ display.badge }}</span>
        </div>
        <div
          class="wf-node__preview"
          :class="{ 'wf-node__preview--muted': display.previewMuted }"
        >
          {{ display.preview }}
        </div>
      </div>
    </div>

    <Handle
      v-for="index in definition.outputs"
      :id="`output_${index}`"
      :key="index"
      type="source"
      :position="Position.Right"
      :connectable-start="true"
      :connectable-end="false"
      class="wf-handle wf-handle--source"
      :class="outputHandleClass(index)"
      :style="outputHandleStyle(index, definition.outputs)"
    />
  </div>
</template>
