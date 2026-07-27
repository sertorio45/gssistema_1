<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  title: 'Notificações de marketing',
})

const { tenantId } = useTenant()
const { data: notifications, pending, refresh } = await useAsyncData(
  () => `marketing-notifications-${tenantId.value}`,
  async () => {
    const response = await $fetch<{ data: any[] }>('/api/marketing/social/notifications', {
      query: { tenant_id: tenantId.value || undefined },
    })
    return response.data
  },
  { watch: [tenantId], default: () => [] },
)

async function openNotification(notification: any) {
  if (!notification.read_at) {
    await $fetch(`/api/marketing/social/notifications/${notification.id}`, {
      method: 'PUT',
      body: { tenant_id: tenantId.value },
    })
    await refresh()
  }
  if (notification.action_url)
    await navigateTo(notification.action_url)
  else if (notification.entity_type === 'approval_request' && notification.entity_id)
    await navigateTo(`/marketing/approvals?request=${notification.entity_id}`)
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Notificações
      </h1>
      <p class="mt-1 text-muted-foreground">
        Atualizações sobre aprovações, ajustes e publicações.
      </p>
    </div>

    <MarketingPageSkeleton v-if="pending" variant="list" />
    <div v-else-if="notifications.length" class="space-y-3">
      <button
        v-for="notification in notifications"
        :key="notification.id"
        type="button"
        class="w-full border rounded-lg p-4 text-left transition-colors hover:bg-muted/40"
        :class="{ 'bg-primary/5': !notification.read_at }"
        @click="openNotification(notification)"
      >
        <div class="flex items-start gap-3">
          <span v-if="!notification.read_at" class="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <span v-else class="mt-2 h-2 w-2 shrink-0 rounded-full bg-muted" />
          <span class="min-w-0">
            <span class="block font-medium">{{ notification.title }}</span>
            <span class="mt-1 block text-sm text-muted-foreground">{{ notification.body }}</span>
            <span class="mt-2 block text-xs text-muted-foreground">
              {{ new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.created_at)) }}
            </span>
          </span>
        </div>
      </button>
    </div>
    <Card v-else>
      <CardContent class="flex flex-col items-center py-14 text-center">
        <Icon name="lucide:bell" class="mb-4 h-10 w-10 text-muted-foreground" />
        <h2 class="font-semibold">
          Tudo em dia
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Você não possui notificações de marketing.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
