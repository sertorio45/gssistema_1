export function formatLeadCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

/** Applies cent-mask while the user types in an input field. */
export function formatLeadValueInputMask(rawInput: string): string {
  const digits = rawInput.replace(/\D/g, '')
  const cents = Number(digits || '0') / 100
  return formatLeadCurrency(cents)
}

/** Formats a DB numeric value or raw typed input for currency fields. */
export function formatLeadValueInput(value: string | number): string {
  if (typeof value === 'number')
    return formatLeadCurrency(value)

  const trimmed = value.trim()
  if (!trimmed)
    return formatLeadCurrency(0)

  if (/^\d+([.,]\d+)?$/.test(trimmed)) {
    const normalized = trimmed.replace(',', '.')
    return formatLeadCurrency(Number(normalized))
  }

  return formatLeadValueInputMask(trimmed)
}

export function parseLeadValueInput(value: string): number {
  const normalized = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeLeadValues(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw
      .map(item => Number(item))
      .filter(n => Number.isFinite(n) && n >= 0)
  }
  if (typeof raw === 'number' && Number.isFinite(raw))
    return [raw]
  return []
}

/** Card/list label: single amount or "De R$ X a R$ Y". */
export function formatLeadValueRange(
  values: number[] | null | undefined,
  fallbackValue?: number | null,
): string {
  const list = normalizeLeadValues(values)
  if (list.length === 0 && fallbackValue != null && Number.isFinite(fallbackValue))
    return formatLeadCurrency(fallbackValue)
  if (list.length === 0)
    return formatLeadCurrency(0)
  if (list.length === 1)
    return formatLeadCurrency(list[0])

  const min = Math.min(...list)
  const max = Math.max(...list)
  if (min === max)
    return formatLeadCurrency(min)

  return `De ${formatLeadCurrency(min)} a ${formatLeadCurrency(max)}`
}

/** Estimate used in open-pipeline metrics before a closed (won) amount is set. */
export function estimateLeadPipelineValue(
  values: number[] | null | undefined,
  fallbackValue?: number | null,
  status?: string | null,
): number {
  if (status === 'won')
    return Number(fallbackValue) || 0

  const list = normalizeLeadValues(values)
  if (list.length === 0)
    return Number(fallbackValue) || 0
  if (list.length === 1)
    return list[0]
  return Math.max(...list)
}

export function parseLeadValuesInputs(inputs: string[]): number[] {
  return inputs
    .map(input => parseLeadValueInput(input))
    .filter(n => Number.isFinite(n) && n > 0)
}

/** Brazil phone masks: mobile 11 digits / landline 10 digits. */
export const BR_PHONE_MASKS = ['(##) #####-####', '(##) ####-####'] as const
