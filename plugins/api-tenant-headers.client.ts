/**
 * Sends current workspace tenant on API calls so `/api/*` resolves the correct tenant
 * (JWT fallback alone uses the first tenant in app_metadata).
 */
export default defineNuxtPlugin(() => {
  globalThis.$fetch = $fetch.create({
    onRequest({ request, options }) {
      const tenantStore = useTenantStore()
      const url = typeof request === 'string' ? request : String(request)
      if (!url.includes('/api/'))
        return
      const tid = tenantStore.tenantId
      if (!tid)
        return
      const headers = new Headers(options.headers as HeadersInit)
      if (!headers.has('X-Tenant-Id')) {
        headers.set('X-Tenant-Id', tid)
        options.headers = headers
      }
    },
  })
})
