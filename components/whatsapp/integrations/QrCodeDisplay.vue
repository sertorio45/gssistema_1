<script setup lang="ts">
import { Skeleton } from '~/components/ui/skeleton'

const props = defineProps<{
  qrCode?: string | null
  loading?: boolean
  pairingCode?: string | null
}>()

const qrSrc = computed(() => {
  if (!props.qrCode)
    return null
  if (props.qrCode.startsWith('data:'))
    return props.qrCode
  return `data:image/png;base64,${props.qrCode}`
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 rounded-xl border bg-muted/20 p-6">
    <template v-if="loading">
      <Skeleton class="h-56 w-56 rounded-lg" />
      <Skeleton class="h-4 w-40" />
    </template>
    <template v-else-if="qrSrc">
      <img :src="qrSrc" alt="QR Code WhatsApp" class="h-56 w-56 rounded-lg border bg-white p-2">
      <p class="text-center text-sm text-muted-foreground">
        Escaneie com o WhatsApp para conectar
      </p>
      <p v-if="pairingCode" class="font-mono text-sm">
        Código: {{ pairingCode }}
      </p>
    </template>
    <template v-else>
      <div class="flex h-56 w-56 items-center justify-center rounded-lg border border-dashed">
        <span class="i-lucide-qr-code h-12 w-12 text-muted-foreground" />
      </div>
      <p class="text-sm text-muted-foreground">
        Clique em conectar para gerar o QR Code
      </p>
    </template>
  </div>
</template>
