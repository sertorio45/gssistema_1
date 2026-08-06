import type { Meeting } from '~/types/crm'

export type MeetingType = Meeting['type']
export type MeetingStatus = Meeting['status']

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  'call': 'Ligação',
  'video': 'Vídeo',
  'in-person': 'Presencial',
  'demo': 'Demonstração',
}

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  'scheduled': 'Agendada',
  'completed': 'Concluída',
  'cancelled': 'Cancelada',
  'no-show': 'Não compareceu',
}

export const MEETING_TYPE_OPTIONS = (Object.keys(MEETING_TYPE_LABELS) as MeetingType[]).map(value => ({
  value,
  label: MEETING_TYPE_LABELS[value],
}))

export const MEETING_STATUS_OPTIONS = (Object.keys(MEETING_STATUS_LABELS) as MeetingStatus[]).map(value => ({
  value,
  label: MEETING_STATUS_LABELS[value],
}))
