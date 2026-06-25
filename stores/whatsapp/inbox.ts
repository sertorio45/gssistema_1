import { defineStore } from 'pinia'

import type { WhatsAppConversationStatus } from '~/types/whatsapp'

export interface WhatsAppInboxFilters {
  status?: WhatsAppConversationStatus | 'all'
  assignedToMe?: boolean
  unreadOnly?: boolean
  search?: string
}

/** null = todas as caixas; string = instância específica */
export type WhatsAppActiveInboxId = string | null

export const useWhatsAppInboxStore = defineStore('whatsapp-inbox', {
  state: () => ({
    activeConversationId: null as string | null,
    activeInstanceId: null as WhatsAppActiveInboxId,
    filters: {
      status: 'all' as WhatsAppInboxFilters['status'],
      assignedToMe: false,
      unreadOnly: false,
      search: '',
    } as WhatsAppInboxFilters,
    sidebarCollapsed: false,
  }),

  actions: {
    setActiveConversation(id: string | null) {
      this.activeConversationId = id
    },

    setActiveInstance(id: WhatsAppActiveInboxId) {
      this.activeInstanceId = id
    },

    setFilters(filters: Partial<WhatsAppInboxFilters>) {
      this.filters = { ...this.filters, ...filters }
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    reset() {
      this.activeConversationId = null
      this.activeInstanceId = null
      this.filters = { status: 'all', assignedToMe: false, unreadOnly: false, search: '' }
      this.sidebarCollapsed = false
    },
  },
})
