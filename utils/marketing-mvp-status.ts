import type { MarketingMvpStatus } from '~/types/marketing-mvp'

type PostLike = {
  status?: string | null
  editorial_status?: string | null
  production_status?: string | null
  publication_status?: string | null
}

/**
 * Mirrors the `marketing_mvp_contents.mvp_status` CASE in the DB view
 * so list UIs can show MVP labels without an extra join.
 */
export function resolveMarketingMvpStatus(post: PostLike): MarketingMvpStatus {
  const publication = post.publication_status || ''
  const editorial = post.editorial_status || ''
  const production = post.production_status || ''
  const status = post.status || ''

  if (publication === 'published' || status === 'published')
    return 'publicado'
  if (publication === 'failed' || status === 'failed')
    return 'erro'
  if (
    publication === 'scheduled'
    || publication === 'publishing'
    || status === 'scheduled'
    || status === 'publishing'
  ) {
    return 'agendado'
  }
  if (
    editorial === 'internal_review'
    || editorial === 'client_review'
    || status === 'pending_approval'
    || production === 'awaiting_client_approval'
  ) {
    return 'aprovacao'
  }
  if (
    [
      'briefing_pending',
      'copy_in_progress',
      'design_in_progress',
      'internal_review',
      'changes_requested',
      'blocked',
    ].includes(production)
    || status === 'changes_requested'
  ) {
    return 'producao'
  }

  return 'rascunho'
}
