/**
 * Restores workspace tenant before pages mount so API calls have tenant_id available.
 */
export default defineNuxtPlugin(async () => {
  const { restoreLastTenant, setTenantFromJWT, tenantId } = useTenant()

  restoreLastTenant()

  if (!tenantId.value) {
    await setTenantFromJWT()
  }
})
