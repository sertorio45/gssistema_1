/** Simplified content statuses exposed in the Marketing MVP UI (PDF §9). */
export type MarketingMvpStatus
  = | 'rascunho'
    | 'producao'
    | 'aprovacao'
    | 'agendado'
    | 'publicado'
    | 'erro'

export const MARKETING_MVP_STATUSES: MarketingMvpStatus[] = [
  'rascunho',
  'producao',
  'aprovacao',
  'agendado',
  'publicado',
  'erro',
]

export const MARKETING_MVP_STATUS_LABELS: Record<MarketingMvpStatus, string> = {
  rascunho: 'Rascunho',
  producao: 'Produção',
  aprovacao: 'Aprovação',
  agendado: 'Agendado',
  publicado: 'Publicado',
  erro: 'Erro',
}

export type MarketingMvpOverviewCounts = {
  contents_total: number
  contents_by_mvp_status: Record<MarketingMvpStatus, number>
  approvals_pending: number
  campaigns_active: number
  publication_jobs_open: number
}

export function emptyMarketingMvpOverviewCounts(): MarketingMvpOverviewCounts {
  return {
    contents_total: 0,
    contents_by_mvp_status: {
      rascunho: 0,
      producao: 0,
      aprovacao: 0,
      agendado: 0,
      publicado: 0,
      erro: 0,
    },
    approvals_pending: 0,
    campaigns_active: 0,
    publication_jobs_open: 0,
  }
}
