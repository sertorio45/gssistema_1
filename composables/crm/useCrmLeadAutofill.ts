import type { CrmLeadLookupResult } from '~/types/crm'
import { formatLeadValueInput } from '~/composables/crm/useCrmLeadValue'

export interface CrmLeadAutofillLeadForm {
  name: string
  source: string
  status?: string
  sales_stage_id?: string
  priority: string
  value: string
  notes: string
}

export interface CrmLeadAutofillContactForm {
  name: string
  email: string
  phone: string
  position: string
  notes: string
}

export interface CrmLeadAutofillCompanyForm {
  name: string
  segment: string
  size: string
  website: string
  address: string
}

const COMPANY_SEGMENT_VALUES = new Set([
  'technology',
  'finance',
  'healthcare',
  'education',
  'retail',
  'manufacturing',
  'services',
  'other',
])

const COMPANY_SIZE_MAP: Record<string, string> = {
  startup: '1-10',
  small: '11-50',
  medium: '51-200',
  large: '201-500',
  enterprise: '501+',
}

function resolveSourceId(
  sourceEnum: string | null | undefined,
  leadSources: Array<{ id: string, name: string }> | null | undefined,
): string {
  if (!sourceEnum || !leadSources?.length)
    return ''

  const exactId = leadSources.find(source => source.id === sourceEnum)
  if (exactId)
    return exactId.id

  const enumValue = sourceEnum.toLowerCase()
  const exactName = leadSources.find(source => source.name.toLowerCase() === enumValue)
  if (exactName)
    return exactName.id

  const mapped = leadSources.find((source) => {
    const sourceName = source.name.toLowerCase()

    if (enumValue === 'website' && (sourceName.includes('website') || sourceName.includes('web')))
      return true
    if (enumValue === 'referral' && (sourceName.includes('referral') || sourceName.includes('indica')))
      return true
    if (enumValue === 'social' && (sourceName.includes('social') || sourceName.includes('redes')))
      return true
    if (enumValue === 'email' && (sourceName.includes('email') || sourceName.includes('e-mail')))
      return true
    if (enumValue === 'phone' && (sourceName.includes('phone') || sourceName.includes('telefone') || sourceName.includes('whatsapp') || sourceName.includes('whats')))
      return true
    if (enumValue === 'other' && (sourceName.includes('other') || sourceName.includes('outro')))
      return true

    return false
  })

  return mapped?.id || ''
}

function resolveCompanySegment(industry: string | null | undefined): string {
  if (!industry)
    return ''

  const normalized = industry.toLowerCase()
  if (COMPANY_SEGMENT_VALUES.has(normalized))
    return normalized

  return ''
}

function resolveCompanySize(size: string | null | undefined): string {
  if (!size)
    return ''

  return COMPANY_SIZE_MAP[size] || ''
}

export function applyCrmLeadAutofill(
  match: CrmLeadLookupResult,
  forms: {
    leadForm: { value: CrmLeadAutofillLeadForm }
    contactForm: { value: CrmLeadAutofillContactForm }
    companyForm: { value: CrmLeadAutofillCompanyForm }
  },
  options?: {
    leadSources?: Array<{ id: string, name: string }>
    preserveLeadStatus?: boolean
    fillLeadFields?: boolean
  },
) {
  if (options?.fillLeadFields !== false) {
    forms.leadForm.value.name = match.name

    if (match.source) {
      const sourceId = resolveSourceId(match.source, options?.leadSources)
      if (sourceId)
        forms.leadForm.value.source = sourceId
    }

    if (match.priority)
      forms.leadForm.value.priority = match.priority

    if (match.value != null && !Number.isNaN(match.value))
      forms.leadForm.value.value = formatLeadValueInput(match.value)

    if (match.lead_notes)
      forms.leadForm.value.notes = match.lead_notes
  }

  forms.contactForm.value = {
    name: match.contact_name || match.name,
    email: match.email || '',
    phone: match.phone || '',
    position: match.position || '',
    notes: match.contact_notes || '',
  }

  forms.companyForm.value = {
    name: match.company_name || '',
    segment: resolveCompanySegment(match.company_industry),
    size: resolveCompanySize(match.company_size),
    website: match.company_website || '',
    address: match.company_address || '',
  }
}

export type { CrmLeadLookupResult } from '~/types/crm'
