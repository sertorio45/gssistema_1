<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'

const emit = defineEmits<{
  send: [content: string]
}>()

defineProps<{
  disabled?: boolean
  sending?: boolean
}>()

const draft = ref('')

function handleSubmit() {
  if (!draft.value.trim())
    return
  emit('send', draft.value)
  draft.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <div class="border-t bg-background p-4">
    <div class="flex items-end gap-2">
      <Textarea
        v-model="draft"
        :disabled="disabled || sending"
        placeholder="Digite uma mensagem..."
        class="min-h-[44px] resize-none"
        rows="1"
        @keydown="onKeydown"
      />
      <Button
        :disabled="disabled || sending || !draft.trim()"
        size="icon"
        class="shrink-0"
        @click="handleSubmit"
      >
        <span class="i-lucide-send h-4 w-4" />
      </Button>
    </div>
    <p class="mt-2 text-xs text-muted-foreground">
      Enter para enviar · Shift+Enter para nova linha
    </p>
  </div>
</template>
