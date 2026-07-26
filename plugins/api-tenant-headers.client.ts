import { ORGANIZATION_HEADER, TENANT_HEADER } from '~/constants/workspace'

/**
 * Sends the requested workspace on API calls. These headers are a *request* for
 * a scope: the Nitro resolver validates both ids against memberships, portfolio
 * links and contracted modules before honouring them.
 */
export default defineNuxtPlugin(() => {
  globalThis.$fetch = $fetch.create({
    onRequest({ request, options }) {
      const url = typeof request === 'string' ? request : String(request)
      if (!url.includes('/api/'))
        return

      const tenantStore = useTenantStore()
      const headers = new Headers(options.headers as HeadersInit)

      if (tenantStore.tenantId && !headers.has(TENANT_HEADER))
        headers.set(TENANT_HEADER, tenantStore.tenantId)

      if (tenantStore.organizationId && !headers.has(ORGANIZATION_HEADER))
        headers.set(ORGANIZATION_HEADER, tenantStore.organizationId)

      options.headers = headers
    },
  })
})
