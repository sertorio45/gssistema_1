import type { RealtimeChannel } from '@supabase/supabase-js'

import type { WhatsAppConversation, WhatsAppMessage } from '~/types/whatsapp'
import { mapConversationRow, mapMessageRow } from '~/composables/whatsapp/useWhatsAppMapper'

interface WhatsAppRealtimeCallbacks {
  onMessage?: (message: WhatsAppMessage) => void
  onConversationUpdate?: (conversation: WhatsAppConversation) => void
}

export function useWhatsAppRealtime(callbacks: WhatsAppRealtimeCallbacks = {}) {
  const supabase = useSupabaseClient()
  const { tenantId } = useTenant()

  let messageChannel: RealtimeChannel | null = null
  let conversationChannel: RealtimeChannel | null = null

  function subscribe() {
    if (!tenantId.value || !import.meta.client)
      return

    const tid = tenantId.value

    conversationChannel = supabase
      .channel(`whatsapp:conversations:${tid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_conversation',
          filter: `tenant_id=eq.${tid}`,
        },
        (payload) => {
          callbacks.onConversationUpdate?.(mapConversationRow(payload.new as any))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conversation',
          filter: `tenant_id=eq.${tid}`,
        },
        (payload) => {
          callbacks.onConversationUpdate?.(mapConversationRow(payload.new as any))
        },
      )
      .subscribe()

    messageChannel = supabase
      .channel(`whatsapp:messages:${tid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_message',
          filter: `tenant_id=eq.${tid}`,
        },
        (payload) => {
          callbacks.onMessage?.(mapMessageRow(payload.new as any))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_message',
          filter: `tenant_id=eq.${tid}`,
        },
        (payload) => {
          callbacks.onMessage?.(mapMessageRow(payload.new as any))
        },
      )
      .subscribe()
  }

  function unsubscribe() {
    if (messageChannel) {
      supabase.removeChannel(messageChannel)
      messageChannel = null
    }
    if (conversationChannel) {
      supabase.removeChannel(conversationChannel)
      conversationChannel = null
    }
  }

  onMounted(() => {
    subscribe()
  })

  onUnmounted(() => {
    unsubscribe()
  })

  watch(tenantId, () => {
    unsubscribe()
    subscribe()
  })

  return { subscribe, unsubscribe }
}
