<script setup lang="ts">
/**
 * Google-style user avatar: full-bleed colored circle + centered initials.
 * Pattern aligned with 21st Reshaped / Astryx avatars (full circle fallback, no inset box).
 */
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'
import { getAvatarColor, getInitials } from '~/utils/avatar'

const props = withDefaults(
  defineProps<{
    name?: string | null
    email?: string | null
    src?: string | null
    size?: 'sm' | 'md' | 'lg' | 'xl'
    shape?: 'circle' | 'rounded'
    class?: HTMLAttributes['class']
  }>(),
  {
    size: 'md',
    shape: 'circle',
  },
)

const seed = computed(() => props.name?.trim() || props.email?.trim() || '')
const initials = computed(() => getInitials(seed.value))
const color = computed(() => getAvatarColor(seed.value))
const alt = computed(() => props.name?.trim() || props.email?.trim() || 'Avatar')

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-8 w-8 text-xs'
    case 'lg':
      return 'h-16 w-16 text-xl'
    case 'xl':
      return 'h-20 w-20 text-2xl'
    default:
      return 'h-10 w-10 text-sm'
  }
})

const shapeClass = computed(() => (props.shape === 'rounded' ? 'rounded-lg' : 'rounded-full'))
</script>

<template>
  <Avatar
    :class="cn(
      'relative shrink-0 overflow-hidden bg-transparent',
      sizeClass,
      shapeClass,
      props.class,
    )"
    :shape="shape === 'rounded' ? 'square' : 'circle'"
  >
    <AvatarImage
      v-if="src"
      :src="src"
      :alt="alt"
      class="aspect-square h-full w-full object-cover"
    />
    <AvatarFallback
      :delay-ms="0"
      :class="cn(
        'absolute inset-0 flex items-center justify-center font-medium tracking-wide text-white',
        shapeClass,
      )"
      :style="{ backgroundColor: color }"
    >
      {{ initials }}
    </AvatarFallback>
  </Avatar>
</template>
