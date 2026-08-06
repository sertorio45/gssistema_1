import type {
  SocialPlatform,
  SocialPostFormat,
  SocialProductionPriority,
} from '~/types/marketing-social'

export const MARKETING_POST_SCHEDULE_STATUSES = [
  'planned',
  'queued',
  'publishing',
  'published',
  'failed',
  'cancelled',
] as const

export type MarketingPostScheduleStatus = typeof MARKETING_POST_SCHEDULE_STATUSES[number]

export const MARKETING_POST_SCHEDULE_STATUS_LABELS: Record<MarketingPostScheduleStatus, string> = {
  planned: 'Planejado',
  queued: 'Na fila',
  publishing: 'Publicando',
  published: 'Publicado',
  failed: 'Falhou',
  cancelled: 'Cancelado',
}

export interface MarketingPostSchedule {
  id: string
  tenantId: string
  postId: string
  variantId: string | null
  platform: SocialPlatform | null
  format: SocialPostFormat | null
  scheduledAt: string
  timezone: string
  status: MarketingPostScheduleStatus
  notes: string | null
  publicationJobId: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

/** Input for create/update forms (local datetime string YYYY-MM-DDTHH:mm). */
export interface MarketingPostScheduleInput {
  id?: string
  variantId?: string | null
  platform?: SocialPlatform | null
  format?: SocialPostFormat | null
  scheduledAt: string
  timezone?: string
  notes?: string | null
  status?: MarketingPostScheduleStatus
}

/** Calendar cell model: one post may yield many occurrences. */
export interface MarketingCalendarOccurrence {
  occurrenceId: string
  scheduleId: string | null
  postId: string
  scheduledAt: string
  title: string
  platform: SocialPlatform | null
  format: SocialPostFormat | null
  scheduleStatus: MarketingPostScheduleStatus | null
  productionPriority?: SocialProductionPriority | null
  post: Record<string, unknown>
}

export function mapMarketingPostSchedule(row: Record<string, unknown>): MarketingPostSchedule {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    postId: String(row.post_id),
    variantId: row.variant_id ? String(row.variant_id) : null,
    platform: (row.platform as SocialPlatform | null) || null,
    format: (row.format as SocialPostFormat | null) || null,
    scheduledAt: String(row.scheduled_at),
    timezone: String(row.timezone || 'America/Sao_Paulo'),
    status: (row.status as MarketingPostScheduleStatus) || 'planned',
    notes: row.notes ? String(row.notes) : null,
    publicationJobId: row.publication_job_id ? String(row.publication_job_id) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
