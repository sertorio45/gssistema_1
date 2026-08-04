/**
 * Avatar helpers — Google-style initials fallback.
 * Soft Material-inspired palette so the circle reads cleanly on light/dark UIs.
 */

const AVATAR_COLORS = [
  '#EA4335', // google red
  '#DB4437', // soft red
  '#E91E63', // pink
  '#9C27B0', // purple
  '#673AB7', // deep purple
  '#3F51B5', // indigo
  '#4285F4', // google blue
  '#039BE5', // light blue
  '#009688', // teal
  '#0F9D58', // google green
  '#7CB342', // light green
  '#FB8C00', // orange
  '#F4511E', // deep orange
  '#795548', // brown
] as const

export function getInitials(value?: string | null): string {
  if (!value)
    return '?'

  const cleaned = value.trim()
  if (!cleaned)
    return '?'

  // Emails: use the first letter of the local part
  if (cleaned.includes('@'))
    return cleaned[0]!.toUpperCase()

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 1)
    return words[0]!.slice(0, 2).toUpperCase()

  return `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase()
}

export function getAvatarColor(seed?: string | null): string {
  if (!seed)
    return AVATAR_COLORS[6]!

  let hash = 0
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0

  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!
}
