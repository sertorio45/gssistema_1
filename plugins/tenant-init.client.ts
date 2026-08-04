/**
 * Seeds tenant hints from localStorage immediately, then loads workspace in the
 * background so pages can paint skeletons without waiting on remote RTT.
 */
export default defineNuxtPlugin(() => {
  const user = useSupabaseUser()
  if (!user.value)
    return

  const tenantStore = useTenantStore()
  const workspace = useWorkspace()

  if (import.meta.client) {
    const storedTenant = localStorage.getItem('current-tenant-id')
    const storedOrg = localStorage.getItem('current-organization-id')
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (storedTenant && uuid.test(storedTenant) && !tenantStore.tenantId)
      tenantStore.setTenant(storedTenant)
    if (storedOrg && uuid.test(storedOrg) && !tenantStore.organizationId)
      tenantStore.setOrganization(storedOrg)
  }

  void (async () => {
    try {
      const context = await workspace.load()

      // Heal stale localStorage (inactive shadow directs) and empty sessions.
      if (!context.organization || !context.tenant) {
        const preferredOrg = context.organizations.find(item => item.type === 'agency' && item.is_active)
          ?? context.organizations.find(item => item.is_active)
          ?? null
        const preferredTenant = context.tenants.find(item =>
          preferredOrg && item.organization_id === preferredOrg.id,
        ) ?? context.tenants[0] ?? null

        if (preferredOrg || preferredTenant) {
          await workspace.switchContext({
            organizationId: preferredOrg?.id ?? preferredTenant?.organization_id ?? null,
            tenantId: preferredTenant?.id ?? null,
          })
        }
        return
      }

      if (context.requestedContextRejected && context.organization && context.tenant) {
        // Server already healed; persist the good ids (applyContext already did).
        return
      }
    }
    catch (error) {
      console.error('Não foi possível resolver o contexto de trabalho:', error)
    }
  })()
})
