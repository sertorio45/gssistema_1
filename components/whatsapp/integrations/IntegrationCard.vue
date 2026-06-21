<script setup lang="ts">
import type { WhatsAppInstanceView } from '~/types/whatsapp'

import ConnectionStatus from '~/components/whatsapp/integrations/ConnectionStatus.vue'
import QrCodeDisplay from '~/components/whatsapp/integrations/QrCodeDisplay.vue'
import WebhookUrlCopy from '~/components/whatsapp/integrations/WebhookUrlCopy.vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'

const props = defineProps<{
  instance: WhatsAppInstanceView
  webhookUrl?: string
  actionLoading?: boolean
}>()

const emit = defineEmits<{
  connect: []
  disconnect: []
  test: []
  sync: []
  delete: []
  open: []
}>()

const providerLabel = computed(() =>
  props.instance.provider === 'cloud_api' ? 'Cloud API' : 'Evolution API',
)
</script>

<template>
  <Card class="overflow-hidden">
    <CardHeader class="flex flex-row items-start justify-between gap-4 space-y-0">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <CardTitle class="text-lg">
            {{ instance.name }}
          </CardTitle>
          <Badge v-if="instance.isDefault" variant="secondary">
            Padrão
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ providerLabel }}
        </p>
      </div>
      <ConnectionStatus :status="instance.status" :phone-number="instance.phoneNumber" />
    </CardHeader>

    <CardContent class="space-y-4">
      <WebhookUrlCopy
        v-if="webhookUrl"
        :url="webhookUrl"
        label="URL do webhook"
      />
      <QrCodeDisplay
        v-if="instance.provider === 'evolution' && instance.status === 'connecting'"
        :qr-code="instance.qrCode"
      />
    </CardContent>

    <CardFooter class="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" @click="emit('open')">
        Configurar
      </Button>
      <Button
        v-if="instance.provider === 'evolution' && instance.status !== 'connected'"
        size="sm"
        :disabled="actionLoading"
        @click="emit('connect')"
      >
        Conectar
      </Button>
      <Button
        v-if="instance.status === 'connected' || instance.status === 'connecting'"
        variant="outline"
        size="sm"
        :disabled="actionLoading"
        @click="emit('disconnect')"
      >
        Desconectar
      </Button>
      <Button
        variant="outline"
        size="sm"
        :disabled="actionLoading"
        @click="emit('sync')"
      >
        Sincronizar
      </Button>
      <Button
        variant="outline"
        size="sm"
        :disabled="actionLoading"
        @click="emit('test')"
      >
        Testar
      </Button>
      <Button
        variant="destructive"
        size="sm"
        :disabled="actionLoading"
        @click="emit('delete')"
      >
        Excluir
      </Button>
    </CardFooter>
  </Card>
</template>
