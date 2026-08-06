<script setup lang="ts">
import type { SocialPostInput } from '~/types/marketing-social'
import SocialPostForm from '~/components/marketing/social/SocialPostForm.vue'

/**
 * Marketing MVP content editor surface.
 * Reuses SocialPostForm (accounts, assets, variants) with campaign/assignee/CTA fields.
 */
defineProps<{
  initialValue?: SocialPostInput
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [value: SocialPostInput]
}>()
</script>

<template>
  <SocialPostForm
    :initial-value="initialValue"
    :saving="saving"
    @save="emit('save', $event)"
  />
</template>
