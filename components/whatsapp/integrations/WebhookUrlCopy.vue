<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { toast } from 'vue-sonner'

const props = defineProps<{
  url: string
  label?: string
}>()

async function copyUrl() {
  if (!import.meta.client)
    return
  await navigator.clipboard.writeText(props.url)
  toast.success('URL copiada para a área de transferência')
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="label" class="text-sm font-medium">
      {{ label }}
    </p>
    <div class="flex gap-2">
      <code class="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-xs">
        {{ url }}
      </code>
      <Button type="button" variant="outline" size="icon" @click="copyUrl">
        <span class="i-lucide-copy h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
