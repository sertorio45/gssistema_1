export const SOCIAL_SLA_STAGE_KEYS = [
  'briefing',
  'copy',
  'design',
  'review',
  'approval',
  'fix',
  'publication',
] as const

export type SocialSlaStageKey = typeof SOCIAL_SLA_STAGE_KEYS[number]

export const SOCIAL_SLA_STAGE_LABELS: Record<SocialSlaStageKey, string> = {
  briefing: 'Briefing',
  copy: 'Copy',
  design: 'Design',
  review: 'Revisão',
  approval: 'Aprovação',
  fix: 'Correção',
  publication: 'Publicação',
}

export const DEFAULT_SLA_DAYS: Record<SocialSlaStageKey, number> = {
  briefing: 2,
  copy: 3,
  design: 4,
  review: 1,
  approval: 2,
  fix: 2,
  publication: 1,
}
