/**
 * Test double for `#supabase/server`. The event itself carries the user and the
 * client, so each test drives its own scenario without shared module state.
 */

export const TEST_USER_KEY = '__testUser'
export const TEST_CLIENT_KEY = '__testClient'

export async function serverSupabaseUser(event: any) {
  return event?.[TEST_USER_KEY] ?? null
}

export async function serverSupabaseServiceRole(event: any) {
  return event?.[TEST_CLIENT_KEY] ?? null
}

export async function serverSupabaseClient(event: any) {
  return event?.[TEST_CLIENT_KEY] ?? null
}
