import type { MaybeRefOrGetter, Ref, WatchSource } from 'vue'

const DEFAULT_TTL_MS = 45_000

type CacheStampBag = Record<string, number>

/**
 * Lightweight list/data cache for Nuxt payloads.
 * - Reuses `payload.data` / `static.data` via `getCachedData` (instant navigation)
 * - Background revalidate only when TTL expires (default 45s)
 * - Skeleton only when there is no hydrated data yet (`pending && data == null`)
 * - Prefer `default: () => null` and unwrap with `data.value ?? []`
 */
export function useCachedAsyncData<T>(
  key: MaybeRefOrGetter<string>,
  handler: () => Promise<T>,
  options?: {
    default?: () => T | null
    watch?: WatchSource[]
    server?: boolean
    immediate?: boolean
    /** Skip network when cached data is younger than this (ms). Default 45s. */
    ttlMs?: number
    /** When false, skip fetching and keep data null. */
    enabled?: MaybeRefOrGetter<boolean>
  },
) {
  const nuxtApp = useNuxtApp()
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  const stamps = useState<CacheStampBag>('cached-async-data-stamps', () => ({}))

  const enabled = computed(() =>
    options?.enabled === undefined ? true : Boolean(toValue(options.enabled)),
  )

  function resolveKey(): string {
    return toValue(key)
  }

  function isFresh(cacheKey: string): boolean {
    const at = stamps.value[cacheKey]
    if (!at)
      return false
    return Date.now() - at < ttlMs
  }

  function touch(cacheKey: string): void {
    stamps.value = { ...stamps.value, [cacheKey]: Date.now() }
  }

  const asyncData = useAsyncData<T | null>(
    resolveKey,
    async () => {
      if (!enabled.value)
        return null
      const result = await handler()
      touch(resolveKey())
      return result
    },
    {
      default: () => (options?.default ? options.default() : null),
      watch: options?.watch,
      server: options?.server ?? false,
      immediate: options?.immediate,
      lazy: true,
      getCachedData: (cacheKey, app, ctx) => {
        const cached = (app.payload.data[cacheKey] ?? app.static.data[cacheKey]) as T | undefined
        if (cached === undefined)
          return undefined

        // Always hit the network on explicit refresh or watched dependency changes.
        if (ctx.cause === 'refresh:manual' || ctx.cause === 'watch')
          return undefined

        // Instant paint on navigation / hydrate when payload already has data.
        return cached
      },
    },
  )

  async function revalidateIfStale(): Promise<void> {
    if (!enabled.value)
      return
    const cacheKey = resolveKey()
    const hasData = asyncData.data.value != null
      || nuxtApp.payload.data[cacheKey] !== undefined
      || nuxtApp.static.data[cacheKey] !== undefined

    if (!hasData) {
      await asyncData.refresh()
      return
    }

    if (!isFresh(cacheKey))
      await asyncData.refresh()
  }

  watch(enabled, (isEnabled) => {
    if (!isEnabled) {
      asyncData.data.value = null
      return
    }
    void revalidateIfStale()
  })

  // After setup: keep UI instant, refresh only when cache is cold/stale.
  onMounted(() => {
    void revalidateIfStale()
  })

  if (import.meta.server && options?.server !== false && options?.immediate !== false && enabled.value) {
    // Server still waits when server:true; default remains client lists with server:false.
  }

  /**
   * Professional skeleton: only on first paint without cached/hydrated data.
   * Background refresh keeps previous rows visible.
   */
  const showSkeleton = computed(() => asyncData.pending.value && asyncData.data.value == null)

  return {
    ...asyncData,
    showSkeleton: showSkeleton as Ref<boolean>,
  }
}

/** Helper when the page already uses useAsyncData and only needs the skeleton rule. */
export function useInitialSkeleton(
  pending: Ref<boolean>,
  data: Ref<unknown>,
) {
  return computed(() => pending.value && data.value == null)
}
