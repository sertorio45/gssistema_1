export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin'

export type SocialPostStatus
  = | 'draft'
    | 'pending_approval'
    | 'changes_requested'
    | 'approved'
    | 'scheduled'
    | 'publishing'
    | 'published'
    | 'failed'
    | 'archived'

export type ApprovalPolicy = 'any' | 'all' | 'minimum'
export type ApprovalDecision = 'approved' | 'changes_requested'
export type MediaAssetPurpose = 'reference' | 'publication'
export type SocialPostFormat = 'static' | 'carousel' | 'video' | 'story'

export interface SocialAccount {
  id: string
  tenantId: string
  platform: SocialPlatform
  provider: 'meta' | 'linkedin'
  externalAccountId: string
  name: string
  username: string | null
  avatarUrl: string | null
  capabilities: string[]
  isActive: boolean
  tokenExpiresAt: string | null
}

export interface MediaAsset {
  id: string
  tenantId: string
  name: string
  bucket: string
  objectPath: string
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  status: 'uploading' | 'ready' | 'processing' | 'failed' | 'archived'
  purpose: MediaAssetPurpose
  previewUrl?: string | null
  createdAt: string
}

export interface SocialPostVariantInput {
  id?: string
  accountId: string
  platform: SocialPlatform
  format: SocialPostFormat
  caption: string
  linkUrl?: string
  hashtags?: string[]
  platformConfig?: Record<string, unknown>
  assetIds?: string[]
}

export interface SocialPost {
  id: string
  tenantId: string
  title: string
  content: string
  status: SocialPostStatus
  currentVersion: number
  approvalPolicy: ApprovalPolicy
  minimumApprovals: number
  scheduledAt: string | null
  timezone: string
  publishedAt: string | null
  createdBy: string
  assignedTo: string | null
  variants: SocialPostVariant[]
  createdAt: string
  updatedAt: string
}

export interface SocialPostVariant {
  id: string
  accountId: string
  platform: SocialPlatform
  format: SocialPostFormat
  caption: string
  linkUrl: string | null
  hashtags: string[]
  platformConfig: Record<string, unknown>
  externalPostId: string | null
  externalPostUrl: string | null
  assets?: MediaAsset[]
}

export interface SocialPostInput {
  title: string
  content?: string
  assignedTo?: string | null
  scheduledAt?: string | null
  timezone?: string
  approvalPolicy?: ApprovalPolicy
  minimumApprovals?: number
  variants?: SocialPostVariantInput[]
  referenceAssetIds?: string[]
}

export interface ApprovalRequest {
  id: string
  postId: string
  versionId: string
  status: 'pending' | 'approved' | 'changes_requested' | 'cancelled'
  policy: ApprovalPolicy
  minimumApprovals: number
  requestedBy: string
  dueAt: string | null
  approverIds: string[]
  decisions: Array<{
    approverId: string
    decision: ApprovalDecision
    comment: string | null
    createdAt: string
  }>
  createdAt: string
}

export interface MarketingSocialOverview {
  drafts: number
  pendingApproval: number
  approved: number
  scheduled: number
  published: number
  failed: number
}

export const SOCIAL_STATUS_LABELS: Record<SocialPostStatus, string> = {
  draft: 'Rascunho',
  pending_approval: 'Aguardando aprovação',
  changes_requested: 'Ajustes solicitados',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  publishing: 'Publicando',
  published: 'Publicado',
  failed: 'Falha',
  archived: 'Arquivado',
}
