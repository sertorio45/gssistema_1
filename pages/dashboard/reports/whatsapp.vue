<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  title: 'Relatórios WhatsApp',
})

const { tenantId } = useTenant()
const phoneNumber = ref('')
const source = ref<'all' | 'google_ads' | 'meta'>('all')
const isSending = ref(false)

async function sendReport() {
  isSending.value = true
  try {
    await $fetch('/api/dashboard/reports/whatsapp', {
      method: 'POST',
      body: {
        tenant_id: tenantId.value || undefined,
        phone_number: phoneNumber.value,
        source: source.value,
        period: 'last_30_days',
      },
    })
  }
  finally {
    isSending.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-2xl flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold">
        Relatórios por WhatsApp
      </h1>
      <p class="text-muted-foreground">
        Enfileire relatórios do dashboard para envio por WhatsApp.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Enviar relatório</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <Input v-model="phoneNumber" placeholder="+5511999999999" />
        <Select v-model="source">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Selecione a fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Todas as fontes
            </SelectItem>
            <SelectItem value="google_ads">
              Google
            </SelectItem>
            <SelectItem value="meta">
              Meta
            </SelectItem>
          </SelectContent>
        </Select>
        <Button class="w-full" :disabled="isSending || !phoneNumber" @click="sendReport">
          <Icon name="lucide:send" class="mr-2 h-4 w-4" />
          {{ isSending ? 'Enviando...' : 'Enfileirar relatório' }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
