/**
 * Short-lived in-memory cache for `/api/workspace/context` payloads.
 * Cuts repeated remote round-trips during client boot (sidebar + pages).
 */

const TTL_MS = 45_000
const MAX_ENTRIES = 200

interface CacheEntry {
  expiresAt: number
  payload: unknown
}

const cache = new Map<string, CacheEntry>()

function pruneExpired(): void {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now)
      cache.delete(key)
  }
  if (cache.size <= MAX_ENTRIES)
    return
  const overflow = cache.size - MAX_ENTRIES
  let removed = 0
  for (const key of cache.keys()) {
    cache.delete(key)
    removed += 1
    if (removed >= overflow)
      break
  }
}

export function workspaceBootstrapCacheKey(
  userId: string,
  organizationId?: string | null,
  tenantId?: string | null,
): string {
  return [userId, organizationId || '', tenantId || ''].join('|')
}

export function getWorkspaceBootstrapCache(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry)
    return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.payload
}

export function setWorkspaceBootstrapCache(key: string, payload: unknown): void {
  pruneExpired()
  cache.set(key, { expiresAt: Date.now() + TTL_MS, payload })
}

export function invalidateWorkspaceBootstrapCache(userId: string): void {
  const prefix = `${userId}|`
  for (const key of cache.keys()) {
    if (key.startsWith(prefix))
      cache.delete(key)
  }
}
