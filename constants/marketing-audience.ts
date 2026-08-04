/** Marketing links allowed on the end-customer portal. */
export const CLIENT_PORTAL_MARKETING_LINKS = [
  '/marketing',
  '/marketing/calendar',
  '/marketing/posts',
  '/marketing/reports',
  '/settings/integrations',
] as const

/** Agency-only production sub-routes that stay hidden from the client portal. */
const CLIENT_PORTAL_MARKETING_BLOCKLIST = [
  '/marketing/posts/tasks',
] as const

export function isClientPortalMarketingLink(link: string | undefined | null): boolean {
  if (!link)
    return false
  const path = link.split('?')[0]

  if ((CLIENT_PORTAL_MARKETING_BLOCKLIST as readonly string[]).some(
    blocked => path === blocked || path.startsWith(`${blocked}/`),
  )) {
    return false
  }

  return (CLIENT_PORTAL_MARKETING_LINKS as readonly string[]).some((allowed) => {
    if (allowed === '/marketing')
      return path === '/marketing'
    return path === allowed || path.startsWith(`${allowed}/`)
  })
}
