import type { MaybeRefOrGetter, Ref, WatchSource } from 'vue'

const DEFAULT_TTL_MS = 45_000

type CacheMeta = { at: number }

export interface UseMarketingFetchOptions<T> {
  /** Unique cache key — string or getter/computed that returns a string. */
  key: MaybeRefOrGetter<string>
  handler: () => Promise<T>
  default: () => T
  watch?: WatchSource[]
  /** When false, skip the request and reset to default. */
  enabled?: MaybeRefOrGetter<boolean>
  immediate?: boolean
  /** Skip network when cached data is younger than this (ms). Default 45s. */
  ttlMs?: number
}

export interface UseMarketingFetchReturn<T> {
  data: Ref<T>
  pending: Ref<boolean>
  /** True only on first load without payload cache (SWR keeps previous data visible). */
  showSkeleton: Ref<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
}

/**
 * Non-blocking marketing data loader based on `$fetch`.
 * Paints from `payload.data` immediately and revalidates only after TTL.
 */
export function useMarketingFetch<T>(
  options: UseMarketingFetchOptions<T>,
): UseMarketingFetchReturn<T> {
  const nuxtApp = useNuxtApp()
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  const data = ref(options.default()) as Ref<T>
  const pending = ref(false)
  const error = ref<unknown>(null)
  const stamps = useState<Record<string, CacheMeta>>('marketing-fetch-stamps', () => ({}))

  let requestId = 0

  function resolveKey(): string {
    return toValue(options.key)
  }

  function isEnabled(): boolean {
    return options.enabled === undefined ? true : Boolean(toValue(options.enabled))
  }

  function readCache(key: string): T | undefined {
    const fromPayload = nuxtApp.payload.data[key]
    if (fromPayload !== undefined)
      return fromPayload as T
    return nuxtApp.static.data[key] as T | undefined
  }

  function writeCache(key: string, value: T): void {
    nuxtApp.payload.data[key] = value
    stamps.value = { ...stamps.value, [key]: { at: Date.now() } }
  }

  function isFresh(key: string): boolean {
    const meta = stamps.value[key]
    if (!meta)
      return false
    return Date.now() - meta.at < ttlMs
  }

  async function refresh(force = false): Promise<void> {
    const currentRequest = ++requestId
    const key = resolveKey()

    if (!isEnabled()) {
      if (currentRequest !== requestId)
        return
      data.value = options.default()
      pending.value = false
      error.value = null
      return
    }

    const cached = readCache(key)
    if (cached !== undefined) {
      data.value = cached
      pending.value = false
      if (!force && isFresh(key))
        return
    }
    else {
      pending.value = true
    }

    error.value = null
    try {
      const result = await options.handler()
      if (currentRequest !== requestId)
        return
      data.value = result
      writeCache(key, result)
    }
    catch (err) {
      if (currentRequest !== requestId)
        return
      error.value = err
      if (cached === undefined)
        data.value = options.default()
    }
    finally {
      if (currentRequest === requestId)
        pending.value = false
    }
  }

  const showSkeletonSafe = computed(() => {
    if (!pending.value)
      return false
    return readCache(resolveKey()) === undefined
  })

  const watchSources: WatchSource[] = [
    () => resolveKey(),
    ...(options.watch || []),
  ]
  if (options.enabled !== undefined)
    watchSources.push(() => isEnabled())

  watch(watchSources, () => {
    void refresh(false)
  }, { flush: 'post' })

  if (options.immediate !== false) {
    const key = resolveKey()
    const cached = isEnabled() ? readCache(key) : undefined
    if (cached !== undefined) {
      data.value = cached
      pending.value = false
    }
    else {
      pending.value = true
    }
    void refresh(false)
  }

  return {
    data,
    pending,
    showSkeleton: showSkeletonSafe,
    error,
    refresh: () => refresh(true),
  }
}
