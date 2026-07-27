<script setup lang="ts">
/**
 * Deterministic sidebar skeleton — avoids Math.random hydration mismatch
 * from the stock shadcn SidebarMenuSkeleton.
 */
withDefaults(defineProps<{
  showIcon?: boolean
  width?: string
}>(), {
  width: '70%',
})
</script>

<template>
  <div
    data-sidebar="menu-skeleton"
    class="flex h-8 items-center gap-2 rounded-md px-2"
  >
    <Skeleton v-if="showIcon" class="size-4 rounded-md" />
    <Skeleton
      class="h-4 flex-1"
      :style="{ maxWidth: width }"
    />
  </div>
</template>
