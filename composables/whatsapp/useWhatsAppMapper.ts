import type {
  WhatsAppContact,
  WhatsAppContactRow,
  WhatsAppConversation,
  WhatsAppConversationRow,
  WhatsAppMessage,
  WhatsAppMessageRow,
} from '~/types/whatsapp'

export function mapContactRow(row: WhatsAppContactRow): WhatsAppContact {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    phone: row.phone,
    name: row.name ?? null,
    profilePicture: row.profile_picture ?? null,
    crmContactId: row.crm_contact_id ?? null,
    tags: row.tags ?? [],
    customFields: row.custom_fields ?? {},
    optIn: row.opt_in ?? true,
    optInAt: row.opt_in_at ?? null,
    blocked: row.blocked ?? false,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    crmContactName: row.crm_contact?.name ?? null,
    crmContactEmail: row.crm_contact?.email ?? null,
    crmCompanyName: row.crm_contact?.company?.name ?? null,
  }
}

export function mapConversationRow(row: WhatsAppConversationRow): WhatsAppConversation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    instanceId: row.instance_id ?? null,
    contactId: row.contact_id ?? null,
    remoteJid: row.remote_jid,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    status: row.status ?? 'open',
    assignedTo: row.assigned_to ?? null,
    lastMessagePreview: row.last_message_preview ?? '',
    lastMessageAt: row.last_message_at ?? null,
    unreadCount: row.unread_count,
    leadId: row.lead_id ?? null,
    crmContactId: row.crm_contact_id ?? null,
    priority: row.priority ?? 0,
    channel: row.channel ?? 'whatsapp',
    isOnline: row.is_online,
    profilePicture: row.profile_picture ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

export function mapMessageRow(row: WhatsAppMessageRow): WhatsAppMessage {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    conversationId: row.conversation_id ?? null,
    instanceId: row.instance_id,
    contactId: row.contact_id ?? null,
    externalId: row.external_id ?? null,
    remoteJid: row.remote_jid,
    fromMe: row.from_me,
    messageType: row.message_type,
    content: row.content ?? '',
    mediaUrl: row.media_url ?? null,
    mediaMime: row.media_mime ?? null,
    fileName: row.file_name ?? null,
    status: row.status,
    sentAt: row.sent_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    readAt: row.read_at ?? null,
    leadId: row.lead_id ?? null,
    crmContactId: row.crm_contact_id ?? null,
    replyToId: row.reply_to_id ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

export function useWhatsAppMapper() {
  return {
    mapContactRow,
    mapConversationRow,
    mapMessageRow,
  }
}
