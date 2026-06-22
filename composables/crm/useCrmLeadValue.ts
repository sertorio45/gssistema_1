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
