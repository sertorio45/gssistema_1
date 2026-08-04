import type { MaybeRefOrGetter, Ref, WatchSource } from 'vue'

export interface UseMarketingFetchOptions<T> {
  /** Unique cache key — string or getter/computed that returns a string. */
  key: MaybeRefOrGetter<string>
  handler: () => Promise<T>
  default: () => T
  watch?: WatchSource[]
  /** When false, skip the request and reset to default. */
  enabled?: MaybeRefOrGetter<boolean>
  immediate?: boolean
}

export interface UseMarketingFetchReturn<T> {
  data: Ref<T>
  pending: Ref<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
}

/**
 * Non-blocking marketing data loader based on `$fetch`.
 * Avoids Nuxt `useAsyncData` / `useLazyAsyncData` key quirks, paints skeletons
 * immediately, and reuses `payload.data` as a simple SWR cache.
 */
export function useMarketingFetch<T>(
  options: UseMarketingFetchOptions<T>,
): UseMarketingFetchReturn<T> {
  const nuxtApp = useNuxtApp()
  const data = ref(options.default()) as Ref<T>
  const pending = ref(options.immediate !== false)
  const error = ref<unknown>(null)

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
  }

  async function refresh(): Promise<void> {
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

  const watchSources: WatchSource[] = [
    () => resolveKey(),
    ...(options.watch || []),
  ]
  if (options.enabled !== undefined)
    watchSources.push(() => isEnabled())

  watch(watchSources, () => {
    void refresh()
  }, { flush: 'post' })

  if (options.immediate !== false) {
    const key = resolveKey()
    const cached = isEnabled() ? readCache(key) : undefined
    if (cached !== undefined) {
      data.value = cached
      pending.value = false
    }
    void refresh()
  }

  return { data, pending, error, refresh }
}
