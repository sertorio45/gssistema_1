export interface Lead {
  id: string
  name: string
  company?: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  source: 'website' | 'referral' | 'social' | 'email' | 'phone' | 'other'
  value: number
  priority: 'low' | 'medium' | 'high'
  assignedTo?: string
  notes?: string
  createdAt: string
  updatedAt: string
  lastContact?: string
  nextFollowUp?: string
  tags: string[]
  tenant_id: string
}

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  position?: string
  company_id?: string
  company_name?: string
  notes?: string
  created_at: string
  updated_at: string
  tenant_id: string
  tags: string[]
  last_contact?: string
}

export interface Company {
  id: string
  name: string
  website?: string
  industry?: string
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  address?: string
  cep?: string
  city?: string
  country?: string
  notes?: string
  created_at: string
  updated_at: string
  tenant_id: string
}

export interface Meeting {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  type: 'call' | 'video' | 'in-person' | 'demo'
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show'
  attendees?: string[]
  lead_id?: string
  contact_id?: string
  company_id?: string
  created_by: string
  created_at: string
  updated_at: string
  tenant_id: string
  notes?: string
  outcome?: string
  // Para exibição no frontend
  company_name?: string
  contact_name?: string
  lead_name?: string
}

export interface WhatsAppMessage {
  id: string
  instanceId: string
  remoteJid: string
  fromMe: boolean
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video'
  message: string
  timestamp: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  contact_id?: string
  lead_id?: string
  tenant_id: string
  mediaUrl?: string
  fileName?: string
}

export interface WhatsAppConversation {
  id: string
  remoteJid: string
  contactName: string
  contactPhone: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  contact_id?: string
  lead_id?: string
  tenant_id: string
  isOnline: boolean
  profilePicture?: string
}

export interface SalesStage {
  id: string
  name: string
  order: number
  color: string
  description?: string
  tenant_id?: string
  pipeline_id?: string
  is_default: boolean
}

export interface DashboardKPI {
  totalLeads: number
  newLeadsThisMonth: number
  conversionRate: number
  totalRevenue: number
  revenueThisMonth: number
  averageDealSize: number
  activeMeetings: number
  responseRate: number
  leadsPerStage: Record<string, number>
  revenueByMonth: Array<{ month: string, revenue: number }>
  topSources: Array<{ source: string, count: number }>
  topPerformers: Array<{ name: string, deals: number, revenue: number }>
}

export interface EvolutionAPIConfig {
  instanceId: string
  token: string
  baseUrl: string
  webhookUrl?: string
}

export interface EvolutionAPIMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  messageType: string
  message: {
    conversation?: string
    imageMessage?: {
      url: string
      caption?: string
    }
    documentMessage?: {
      url: string
      fileName: string
      caption?: string
    }
  }
  messageTimestamp: number
  status: string
  instanceId: string
}

export interface EvolutionAPIWebhook {
  event: 'messages.upsert' | 'messages.update' | 'connection.update'
  instance: string
  data: any
}

export interface LeadSource {
  id: string
  name: string
  description?: string
  is_default: boolean
  is_active: boolean
  tenant_id?: string
  created_at: string
  updated_at: string
} 
 