<script setup lang="ts">
import type { WhatsAppFlow } from '~/types/whatsapp'

import FlowStatusBadge from '~/components/whatsapp/flows/FlowStatusBadge.vue'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'

defineProps<{
  flow: WhatsAppFlow | null | undefined
  saving?: boolean
  actionLoading?: boolean
}>()

const emit = defineEmits<{
  back: []
  save: []
  test: []
  toggle: []
  organize: []
}>()
</script>

<template>
  <div class="sticky top-0 z-20 rounded-xl border border-border/60 bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="truncate text-base font-semibold tracking-tight">
            {{ flow?.name || 'Editor de flow' }}
          </h2>
          <FlowStatusBadge v-if="flow" :status="flow.status" />
          <span v-if="flow" class="text-xs text-muted-foreground">
            v{{ flow.version }}
          </span>
        </div>
        <p v-if="flow?.description" class="mt-1 truncate text-sm text-muted-foreground">
          {{ flow.description }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" @click="emit('back')">
          <span class="i-lucide-arrow-left mr-1.5 h-4 w-4" />
          Voltar
        </Button>
        <Separator orientation="vertical" class="hidden h-6 lg:block" />
        <Button variant="outline" size="sm" @click="emit('organize')">
          <span class="i-lucide-magnet mr-1.5 h-4 w-4" />
          Organizar blocos
        </Button>
        <Button variant="outline" size="sm" :disabled="actionLoading" @click="emit('test')">
          <span class="i-lucide-flask-conical mr-1.5 h-4 w-4" />
          Testar
        </Button>
        <Button variant="outline" size="sm" :disabled="saving" @click="emit('save')">
          <span class="i-lucide-save mr-1.5 h-4 w-4" />
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </Button>
        <Button size="sm" :disabled="actionLoading || !flow" @click="emit('toggle')">
          <span
            class="mr-1.5 h-4 w-4"
            :class="flow?.status === 'active' ? 'i-lucide-pause' : 'i-lucide-play'"
          />
          {{ flow?.status === 'active' ? 'Pausar' : 'Ativar' }}
        </Button>
      </div>
    </div>
  </div>
</template>
