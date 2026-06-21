import { createError, getQuery } from 'h3'

import { resolveWhatsAppTenantContext } from '~/server/utils/whatsapp/context'
import {
  getEvolutionConfigFromIntegration,
  syncEvolutionInstanceRecord,
} from '~/server/utils/whatsapp/evolution-client'
import { getEvolutionInstanceName, loadInstanceWithIntegration } from '~/server/utils/whatsapp/instance-loader'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const query = getQuery(event)
  const { tenantId } = await resolveWhatsAppTenantContext(event, query.tenant_id as string | undefined)
  const { client, instance, integration } = await loadInstanceWithIntegration(event, id)

  if (instance.tenant_id !== tenantId)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (instance.provider === 'cloud_api') {
    return {
      data: {
        status: instance.status,
        phoneNumber: instance.phone_number,
        qrCode: null,
      },
    }
  }

  if (!integration) {
    return {
      data: {
        status: instance.status,
        phoneNumber: instance.phone_number,
        qrCode: instance.qr_code,
      },
    }
  }

  const evoConfig = getEvolutionConfigFromIntegration(integration, getEvolutionInstanceName(instance))
  if (!evoConfig) {
    return {
      data: {
        status: instance.status,
        phoneNumber: instance.phone_number,
        qrCode: instance.qr_code,
      },
    }
  }

  try {
    const mapped = await syncEvolutionInstanceRecord(client, id, evoConfig, {
      currentQrCode: instance.qr_code,
    })

    return {
      data: {
        status: mapped.status,
        phoneNumber: mapped.phoneNumber || instance.phone_number,
        qrCode: mapped.status === 'connected' ? null : instance.qr_code,
      },
    }
  }
  catch {
    return {
      data: {
        status: instance.status,
        phoneNumber: instance.phone_number,
        qrCode: instance.qr_code,
      },
    }
  }
})
