import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { isValidBrazilianMobilePhone } from '~/composables/crm/useCrmPhone'

export interface CrmLeadWhatsappState {
  id: string
  phone?: string | null
  whatsapp_conversation_id?: string | null
  whatsapp_conversation_status?: string | null
}

function resolveLeadPhone(
  lead: { phone?: string | null } | null | undefined,
  contactPhone?: string | null,
) {
  return contactPhone?.trim() || lead?.phone?.trim() || null
}

export function useCrmLeadWhatsapp(options?: {
  onLeadUpdated?: (
    leadId: string,
    patch: { whatsapp_conversation_id: string, whatsapp_conversation_status: string },
  ) => void
}) {
  const { tenantId } = useTenant()
  const isSyncingWhatsapp = ref(false)

  function hasActiveWhatsappConversation(lead: CrmLeadWhatsappState | null | undefined) {
    return Boolean(lead?.whatsapp_conversation_id)
  }

  function hasValidMobilePhone(
    lead: CrmLeadWhatsappState | null | undefined,
    contactPhone?: string | null,
  ) {
    return isValidBrazilianMobilePhone(resolveLeadPhone(lead, contactPhone))
  }

  function canOpenWhatsappConversation(
    lead: CrmLeadWhatsappState | null | undefined,
    contactPhone?: string | null,
  ) {
    return hasActiveWhatsappConversation(lead) && hasValidMobilePhone(lead, contactPhone)
  }

  function canSyncWhatsapp(
    lead: CrmLeadWhatsappState | null | undefined,
    contactPhone?: string | null,
  ) {
    return !hasActiveWhatsappConversation(lead) && hasValidMobilePhone(lead, contactPhone)
  }

  function openWhatsappConversation(conversationId: string) {
    navigateTo({
      path: '/whatsapp/conversations',
      query: { id: conversationId },
    })
  }

  function openWhatsappForLead(lead: CrmLeadWhatsappState, contactPhone?: string | null) {
    if (!canOpenWhatsappConversation(lead, contactPhone))
      return

    openWhatsappConversation(String(lead.whatsapp_conversation_id))
  }

  async function syncWhatsappForLead(
    lead: CrmLeadWhatsappState,
    contactPhone?: string | null,
  ) {
    if (!canSyncWhatsapp(lead, contactPhone) || !tenantId.value || isSyncingWhatsapp.value)
      return null

    isSyncingWhatsapp.value = true
    try {
      const response = await $fetch<{ data: { conversationId: string } }>(
        `/api/crm/lead/${lead.id}/whatsapp`,
        {
          method: 'POST',
          query: { tenant_id: tenantId.value },
        },
      )

      const conversationId = response.data?.conversationId
      if (!conversationId) {
        toast.error('Não foi possível sincronizar a conversa no WhatsApp.')
        return null
      }

      options?.onLeadUpdated?.(lead.id, {
        whatsapp_conversation_id: conversationId,
        whatsapp_conversation_status: 'open',
      })

      toast.success('Conversa sincronizada no WhatsApp.')
      openWhatsappConversation(conversationId)
      return conversationId
    }
    catch (error: any) {
      toast.error(error?.data?.statusMessage || error?.message || 'Falha ao sincronizar no WhatsApp.')
      return null
    }
    finally {
      isSyncingWhatsapp.value = false
    }
  }

  return {
    isSyncingWhatsapp,
    hasActiveWhatsappConversation,
    hasValidMobilePhone,
    canOpenWhatsappConversation,
    canSyncWhatsapp,
    openWhatsappConversation,
    openWhatsappForLead,
    syncWhatsappForLead,
  }
}
