import { serverSupabaseServiceRole } from '#supabase/server'

import { createError, defineEventHandler, readBody } from 'h3'

import {
  enqueueMetaConversion,
  scheduleMetaCapiProcessing,
} from '~/server/utils/crm/meta-capi'

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseServiceRole(event)
    const body = await readBody(event)
    if (!body.id)
      throw createError({ statusCode: 400, message: 'ID é obrigatório' })
    let tenantId = body.tenant_id || event.context.auth?.tenantId
    if (!tenantId) {
      const {
        data: { user },
      } = await client.auth.getUser()
      if (user && user.user_metadata?.tenant_id) {
        tenantId = user.user_metadata.tenant_id
      }
    }
    if (!tenantId) {
      throw createError({ statusCode: 400, message: 'Não foi possível identificar o tenant_id' })
    }

    const { data: existing } = await client
      .from('crm_lead')
      .select('id, status')
      .eq('id', body.id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const updateData = { ...body }
    delete updateData.id
    delete updateData.tenant_id
    const { data, error } = await client
      .from('crm_lead')
      .update(updateData)
      .eq('id', body.id)
      .eq('tenant_id', tenantId)
      .select()
      .single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao atualizar lead' })
    }

    if (data?.status === 'won' && existing?.status !== 'won') {
      await enqueueMetaConversion(client, {
        tenantId,
        leadId: data.id as string,
        eventName: 'Purchase',
        eventTime: data.closed_at as string | null,
      }).catch(() => {})
      scheduleMetaCapiProcessing(event, client, tenantId)
    }

    return { statusCode: 200, body: data }
  }
  catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
})
