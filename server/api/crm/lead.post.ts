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
    const leadToInsert = {
      name: body.name,
      company: body.company,
      status: body.status,
      source: body.source,
      source_id: body.source_id ?? null,
      value: body.value,
      priority: body.priority,
      assigned_to: body.assigned_to,
      notes: body.notes,
      created_at: body.created_at,
      updated_at: body.updated_at,
      last_contact: body.last_contact,
      next_follow_up: body.next_follow_up,
      tags: body.tags,
      tenant_id: tenantId,
      funnel_id: body.funnel_id ?? null,
      sales_stage_id: body.sales_stage_id ?? null,
      meta_lead_id: body.meta_lead_id ?? null,
      fbc: body.fbc ?? null,
      fbp: body.fbp ?? null,
      fbclid: body.fbclid ?? null,
    }
    if (!leadToInsert.name) {
      throw createError({ statusCode: 400, message: 'Nome é obrigatório' })
    }
    const { data, error } = await client.from('crm_lead').insert([leadToInsert]).select().single()
    if (error) {
      throw createError({ statusCode: 500, message: error.message || 'Falha ao criar lead' })
    }

    await enqueueMetaConversion(client, {
      tenantId,
      leadId: data.id as string,
      eventName: 'Lead',
      eventTime: data.created_at as string,
    }).catch(() => {})
    scheduleMetaCapiProcessing(event, client, tenantId)

    return { statusCode: 201, body: data }
  }
  catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Erro interno do servidor' })
  }
})
