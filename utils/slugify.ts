/**
 * Convert free text into a URL-safe slug.
 * Strips diacritics (é→e, á→a, ç→c) so Portuguese names slug correctly.
 */
export function slugify(value: string, maxLength = 80): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}
