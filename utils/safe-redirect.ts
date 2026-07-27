/**
 * Prevents open redirects after login: only same-origin relative paths.
 * Blocks protocol-relative URLs (`//evil.com`) and absolute URLs.
 */
export function resolveSafeRedirect(
  candidate: unknown,
  fallback = '/',
): string {
  if (typeof candidate !== 'string')
    return fallback

  const value = candidate.trim()
  if (!value.startsWith('/') || value.startsWith('//'))
    return fallback

  // Disallow backslash tricks and control characters.
  if (value.includes('\\') || /[\u0000-\u001F\u007F]/.test(value))
    return fallback

  return value
}
