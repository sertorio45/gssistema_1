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

  let channel: RealtimeChannel | null = null

  function handleMessageRow(row: Record<string, unknown>) {
    callbacks.onMessage?.(mapMessageRow(row as any))
  }

  function handleConversationRow(row: Record<string, unknown>) {
    callbacks.onConversationUpdate?.(mapConversationRow(row as any))
  }

  function unsubscribe() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  function subscribe() {
    if (!import.meta.client)
      return

    unsubscribe()

    if (!tenantId.value)
      return

    const tid = tenantId.value

    channel = supabase
      .channel(`whatsapp:tenant:${tid}`)
      .on(
        'broadcast',
        { event: 'message' },
        ({ payload }) => {
          if (payload && typeof payload === 'object')
            handleMessageRow(payload as Record<string, unknown>)
        },
      )
      .on(
        'broadcast',
        { event: 'conversation' },
        ({ payload }) => {
          if (payload && typeof payload === 'object')
            handleConversationRow(payload as Record<string, unknown>)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_message',
          filter: `tenant_id=eq.${tid}`,
        },
        (payload) => {
          handleMessageRow(payload.new as Record<string, unknown>)
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
          handleMessageRow(payload.new as Record<string, unknown>)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_conversation',
          filter: `tenant_id=eq.${tid}`,
        },
        (payload) => {
          handleConversationRow(payload.new as Record<string, unknown>)
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
          handleConversationRow(payload.new as Record<string, unknown>)
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[WhatsApp] Realtime channel error for tenant', tid)
        }
      })
  }

  watch(tenantId, () => {
    subscribe()
  }, { immediate: true })

  onUnmounted(() => {
    unsubscribe()
  })

  return { subscribe, unsubscribe }
}
