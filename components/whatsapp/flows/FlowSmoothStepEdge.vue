<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'

const props = defineProps<EdgeProps>()

const deleteFlowEdge = inject<(edgeId: string) => void>('deleteFlowEdge')

const pathData = computed(() => getSmoothStepPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  sourcePosition: props.sourcePosition,
  targetX: props.targetX,
  targetY: props.targetY,
  targetPosition: props.targetPosition,
}))

function handleDelete(event: MouseEvent) {
  event.stopPropagation()
  deleteFlowEdge?.(props.id)
}
</script>

<template>
  <BaseEdge
    :id="id"
    :path="pathData[0]"
    :marker-end="markerEnd"
    :style="style"
    :interaction-width="interactionWidth"
  />

  <EdgeLabelRenderer>
    <div
      v-if="selected"
      class="wf-edge-delete nodrag nopan"
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${pathData[1]}px, ${pathData[2]}px)`,
      }"
    >
      <button
        type="button"
        class="wf-edge-delete__button"
        title="Excluir conexão"
        aria-label="Excluir conexão"
        @click="handleDelete"
      >
        <Icon name="i-lucide-trash-2" class="h-3.5 w-3.5" />
      </button>
    </div>
  </EdgeLabelRenderer>
</template>
