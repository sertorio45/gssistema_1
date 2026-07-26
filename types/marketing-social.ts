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
export type ApprovalDecision = 'approved' | 'changes_requested' | 'rejected'

/** Editorial (approval) lifecycle, independent from publication. */
export type SocialEditorialStatus
  = | 'draft'
    | 'internal_review'
    | 'client_review'
    | 'changes_requested'
    | 'approved'
    | 'rejected'
    | 'cancelled'

/** Publication lifecycle, independent from editorial state. */
export type SocialPublicationStatus
  = | 'not_scheduled'
    | 'scheduled'
    | 'publishing'
    | 'published'
    | 'partially_published'
    | 'failed'
    | 'deletion_pending'
    | 'deleted'

export type ApprovalStage = 'internal' | 'client'
export type ApprovalRunStatus
  = | 'pending'
    | 'approved'
    | 'changes_requested'
    | 'rejected'
    | 'cancelled'
    | 'superseded'

export type ApprovalChangeCategory
  = | 'art'
    | 'copy'
    | 'date'
    | 'platform'
    | 'incorrect_info'
    | 'other'

export type SocialCommentVisibility = 'internal' | 'shared'

export type WorkflowStageType = 'internal' | 'client' | 'custom'
export type WorkflowStageMode = 'any' | 'all' | 'minimum'

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
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected' | 'cancelled'
  policy: ApprovalPolicy
  minimumApprovals: number
  requestedBy: string
  dueAt: string | null
  approverIds: string[]
  /** Workflow stage this run belongs to (internal review vs client review). */
  stage: ApprovalStage
  workflowId: string | null
  workflowStageId: string | null
  runGroupId: string
  stagePosition: number
  runStatus: ApprovalRunStatus
  decisions: Array<{
    approverId: string
    decision: ApprovalDecision
    comment: string | null
    changeCategory?: ApprovalChangeCategory | null
    createdAt: string
  }>
  createdAt: string
}

export interface SocialApprovalWorkflow {
  id: string
  organizationId: string | null
  tenantId: string | null
  name: string
  slug: string
  description: string
  isSystem: boolean
  isDefault: boolean
  isActive: boolean
  stages: SocialApprovalWorkflowStage[]
}

export interface SocialApprovalWorkflowStage {
  id: string
  workflowId: string
  position: number
  name: string
  stageType: WorkflowStageType
  mode: WorkflowStageMode
  minimumApprovals: number
  requiredCapability: string | null
  allowSelfApproval: boolean
  autoAdvance: boolean
  requireCommentOnReject: boolean
  allowRejection: boolean
}

export interface MarketingSocialOverview {
  drafts: number
  pendingApproval: number
  approved: number
  scheduled: number
  published: number
  failed: number
}

export const SOCIAL_EDITORIAL_STATUS_LABELS: Record<SocialEditorialStatus, string> = {
  draft: 'Rascunho',
  internal_review: 'Revisão interna',
  client_review: 'Aprovação do cliente',
  changes_requested: 'Ajustes solicitados',
  approved: 'Aprovado',
  rejected: 'Reprovado',
  cancelled: 'Cancelado',
}

export const SOCIAL_PUBLICATION_STATUS_LABELS: Record<SocialPublicationStatus, string> = {
  not_scheduled: 'Sem agendamento',
  scheduled: 'Agendado',
  publishing: 'Publicando',
  published: 'Publicado',
  partially_published: 'Publicado parcialmente',
  failed: 'Falha na publicação',
  deletion_pending: 'Exclusão pendente',
  deleted: 'Excluído',
}

export const APPROVAL_STAGE_LABELS: Record<ApprovalStage, string> = {
  internal: 'Revisão interna',
  client: 'Aprovação do cliente',
}

export const APPROVAL_CHANGE_CATEGORY_LABELS: Record<ApprovalChangeCategory, string> = {
  art: 'Arte',
  copy: 'Texto',
  date: 'Data',
  platform: 'Plataforma',
  incorrect_info: 'Informação incorreta',
  other: 'Outro',
}

export const APPROVAL_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  changes_requested: 'Alterações solicitadas',
  rejected: 'Reprovado',
  cancelled: 'Cancelado',
  superseded: 'Substituído',
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
