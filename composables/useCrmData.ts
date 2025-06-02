export function useLeadSources() {
  const { data: leadSources, error, pending, refresh } = useFetch<any[]>('/api/crm/lead_source', {
    key: 'crm-lead-sources',
    server: true,
    lazy: false,
  })

  return {
    leadSources,
    error,
    pending,
    refresh,
  }
}

export function useSalesStages(pipelineId?: string) {
  const { data: salesStages, error, pending, refresh } = useFetch<any[]>('/api/crm/sales_stage', {
    key: `crm-sales-stages-${pipelineId || 'all'}`,
    query: pipelineId ? { pipeline_id: pipelineId } : {},
    server: true,
    lazy: false,
  })

  return {
    salesStages,
    error,
    pending,
    refresh,
  }
} 