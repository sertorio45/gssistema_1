/**
 * Resolves the workspace context before pages mount, so API calls already carry
 * a validated tenant and organization.
 */
export default defineNuxtPlugin(async () => {
  const user = useSupabaseUser()
  if (!user.value)
    return

  const workspace = useWorkspace()

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
})
