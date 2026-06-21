<script setup lang="ts">
import { Badge } from '~/components/ui/badge'

const props = defineProps<{
  status: string
}>()

const config = computed(() => {
  const map: Record<string, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    connected: { label: 'Conectado', variant: 'default' },
    connecting: { label: 'Conectando', variant: 'secondary' },
    disconnected: { label: 'Desconectado', variant: 'outline' },
    error: { label: 'Erro', variant: 'destructive' },
    open: { label: 'Aberta', variant: 'default' },
    pending: { label: 'Pendente', variant: 'secondary' },
    resolved: { label: 'Resolvida', variant: 'outline' },
    spam: { label: 'Spam', variant: 'destructive' },
    sent: { label: 'Enviada', variant: 'default' },
    delivered: { label: 'Entregue', variant: 'secondary' },
    read: { label: 'Lida', variant: 'outline' },
    failed: { label: 'Falhou', variant: 'destructive' },
  }
  return map[props.status] ?? { label: props.status, variant: 'outline' as const }
})
</script>

<template>
  <Badge :variant="config.variant">
    {{ config.label }}
  </Badge>
</template>
