export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/** Brazilian mobile: DDD + 9 + 8 digits (with or without country code 55). */
export function isValidBrazilianMobilePhone(phone: string | null | undefined): boolean {
  const digits = normalizePhone(String(phone || ''))
  if (!digits)
    return false

  const national = digits.startsWith('55') && digits.length > 11
    ? digits.slice(2)
    : digits

  return /^[1-9]{2}9[0-9]{8}$/.test(national)
}

export function formatBrazilianMobilePhone(phone: string | null | undefined): string | null {
  if (!isValidBrazilianMobilePhone(phone))
    return null

  const digits = normalizePhone(String(phone || ''))
  if (digits.startsWith('55') && digits.length === 13)
    return digits

  if (digits.length === 11)
    return `55${digits}`

  return null
}
