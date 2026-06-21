import type { WhatsAppDashboardAnalytics } from '~/types/whatsapp'

export type WhatsAppDashboardPeriod = 7 | 14 | 30 | 90

export function useWhatsAppDashboard() {
  const { tenantId } = useTenant()
  const periodDays = ref<WhatsAppDashboardPeriod>(14)

  const cacheKey = computed(
    () => `whatsapp-dashboard-analytics-${tenantId.value}-${periodDays.value}`,
  )

  const { data, pending, refresh, error } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value)
        return null

      return $fetch<WhatsAppDashboardAnalytics>('/api/whatsapp/dashboard/analytics', {
        query: {
          tenant_id: tenantId.value,
          days: periodDays.value,
        },
      })
    },
    { watch: [tenantId, periodDays], server: false },
  )

  const overview = computed(() => data.value?.overview)
  const messagesByDay = computed(() => data.value?.messagesByDay ?? [])
  const conversationsByStatus = computed(() => data.value?.conversationsByStatus ?? [])
  const recentActivity = computed(() => data.value?.recentActivity ?? [])

  return {
    periodDays,
    overview,
    messagesByDay,
    conversationsByStatus,
    recentActivity,
    pending,
    error,
    refresh,
  }
}
