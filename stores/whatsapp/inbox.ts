import { defineStore } from 'pinia'

import type { WhatsAppConversationStatus } from '~/types/whatsapp'

export interface WhatsAppInboxFilters {
  status?: WhatsAppConversationStatus | 'all'
  assignedToMe?: boolean
  unreadOnly?: boolean
  search?: string
}

export const useWhatsAppInboxStore = defineStore('whatsapp-inbox', {
  state: () => ({
    activeConversationId: null as string | null,
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

    setFilters(filters: Partial<WhatsAppInboxFilters>) {
      this.filters = { ...this.filters, ...filters }
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    reset() {
      this.activeConversationId = null
      this.filters = { status: 'all', assignedToMe: false, unreadOnly: false, search: '' }
      this.sidebarCollapsed = false
    },
  },
})
