<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    name: string
    class?: string
    alt?: string
  }>(),
  {
    alt: 'Ícone',
  },
)

/** Custom assets under /public (or absolute URLs) keep their own colors/gradients. */
const isImage = computed(() =>
  props.name.startsWith('/') || props.name.startsWith('http') || props.name.startsWith('data:'),
)
</script>

<template>
  <img
    v-if="isImage"
    :src="name"
    :alt="alt"
    :class="cn('object-contain', props.class)"
    draggable="false"
  >
  <Icon
    v-else
    :name="name"
    :class="props.class"
    mode="svg"
  />
</template>
