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
    if (!context.tenant && context.tenants.length)
      await workspace.switchContext({ tenantId: context.tenants[0].id })
  }
  catch (error) {
    console.error('Não foi possível resolver o contexto de trabalho:', error)
  }
})
