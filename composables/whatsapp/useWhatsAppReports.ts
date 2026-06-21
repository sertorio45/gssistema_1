import type { WhatsAppReportsAnalytics } from '~/types/whatsapp'

export type WhatsAppReportsPeriod = 7 | 14 | 30 | 90

export function useWhatsAppReports() {
  const { tenantId } = useTenant()
  const periodDays = ref<WhatsAppReportsPeriod>(30)

  const cacheKey = computed(() => `whatsapp-reports-${tenantId.value}-${periodDays.value}`)

  const { data, pending, refresh } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value)
        return null

      return $fetch<WhatsAppReportsAnalytics>('/api/whatsapp/reports/analytics', {
        query: {
          tenant_id: tenantId.value,
          days: periodDays.value,
        },
      })
    },
    { watch: [tenantId, periodDays], server: false },
  )

  function exportCsv() {
    if (!tenantId.value)
      return

    const url = `/api/whatsapp/reports/analytics?tenant_id=${tenantId.value}&days=${periodDays.value}&format=csv`
    window.open(url, '_blank')
  }

  return {
    periodDays,
    analytics: computed(() => data.value),
    pending,
    refresh,
    exportCsv,
  }
}
