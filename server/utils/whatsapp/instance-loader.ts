import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'

export async function loadInstanceWithIntegrationByClient(
  client: SupabaseClient,
  instanceId: string,
) {
  const { data: instance, error } = await client
    .from('whatsapp_instance')
    .select('*')
    .eq('id', instanceId)
    .maybeSingle()

  if (error || !instance) {
    throw createError({ statusCode: 404, statusMessage: 'Instance not found' })
  }

  const { data: integration } = await client
    .from('whatsapp_integration')
    .select('*')
    .eq('instance_id', instanceId)
    .maybeSingle()

  return { client, instance, integration }
}

export async function loadInstanceWithIntegration(event: any, instanceId: string) {
  const { serverSupabaseServiceRole } = await import('#supabase/server')
  const client = serverSupabaseServiceRole(event)
  return loadInstanceWithIntegrationByClient(client, instanceId)
}

export function getEvolutionInstanceName(instance: Record<string, any>): string {
  return String(instance.metadata?.evolution_instance_name || instance.id)
}
