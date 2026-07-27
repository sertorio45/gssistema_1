/**
 * Calendar helpers: empty days (gaps) and same-day multi-post conflicts.
 */

export interface CalendarPostLike {
  id: string
  title?: string | null
  scheduled_at?: string | null
  campaign_id?: string | null
  assigned_to?: string | null
  editorial_status?: string | null
  publication_status?: string | null
  social_post_variants?: Array<{ platform?: string | null }>
}

function dayKey(iso: string) {
  return iso.slice(0, 10)
}

export function findCalendarGaps(
  days: Date[],
  posts: CalendarPostLike[],
): string[] {
  const occupied = new Set(
    posts
      .filter(post => post.scheduled_at)
      .map(post => dayKey(String(post.scheduled_at))),
  )
  return days
    .map(day => day.toISOString().slice(0, 10))
    .filter(key => !occupied.has(key))
}

/** Conflict = 2+ posts scheduled on the same calendar day. */
export function findCalendarConflicts(posts: CalendarPostLike[]): Array<{
  day: string
  postIds: string[]
  titles: string[]
}> {
  const byDay = new Map<string, CalendarPostLike[]>()
  for (const post of posts) {
    if (!post.scheduled_at)
      continue
    const key = dayKey(String(post.scheduled_at))
    const list = byDay.get(key) || []
    list.push(post)
    byDay.set(key, list)
  }

  const conflicts = []
  for (const [day, list] of byDay) {
    if (list.length < 2)
      continue
    conflicts.push({
      day,
      postIds: list.map(p => p.id),
      titles: list.map(p => p.title || 'Sem título'),
    })
  }
  return conflicts
}

export function filterCalendarPosts(
  posts: CalendarPostLike[],
  filters: {
    campaignId?: string | null
    platform?: string | null
    assignedTo?: string | null
    editorialStatus?: string | null
    publicationStatus?: string | null
  },
) {
  return posts.filter((post) => {
    if (filters.campaignId && post.campaign_id !== filters.campaignId)
      return false
    if (filters.assignedTo && post.assigned_to !== filters.assignedTo)
      return false
    if (filters.editorialStatus && post.editorial_status !== filters.editorialStatus)
      return false
    if (filters.publicationStatus && post.publication_status !== filters.publicationStatus)
      return false
    if (filters.platform) {
      const platforms = (post.social_post_variants || []).map(v => v.platform)
      if (!platforms.includes(filters.platform))
        return false
    }
    return true
  })
}
