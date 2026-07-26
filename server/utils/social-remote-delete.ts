import { deleteMetaRemoteObject } from '~/server/utils/social-publishers/meta-delete'

/**
 * Legacy helper kept for callers that still iterate variants directly.
 * Prefer `executeSocialPostDeletion` for the full tombstone + audit flow.
 */
export async function deleteRemoteSocialPosts(
  client: any,
  input: {
    tenantId: string
    postId: string
  },
) {
  const { data: variants } = await client
    .from('social_post_variants')
    .select(`
      id,
      platform,
      format,
      provider,
      external_post_id,
      external_object_type,
      external_container_id,
      external_media_id,
      external_permalink,
      remote_identifiers,
      social_accounts!social_post_variants_account_id_fkey (
        id,
        platform,
        provider,
        external_account_id,
        name
      )
    `)
    .eq('tenant_id', input.tenantId)
    .eq('post_id', input.postId)
    .not('external_post_id', 'is', null)

  const results = []

  for (const variant of variants || []) {
    const account = Array.isArray(variant.social_accounts)
      ? variant.social_accounts[0]
      : variant.social_accounts
    if (!account || account.provider !== 'meta') {
      results.push({
        variantId: variant.id,
        platform: variant.platform,
        externalPostId: variant.external_post_id,
        deleted: false,
        skipped: true,
        error: 'Provedor sem exclusão remota',
      })
      continue
    }

    const result = await deleteMetaRemoteObject({
      client,
      tenantId: input.tenantId,
      account,
      format: variant.format,
      externalPostId: variant.external_post_id,
      externalObjectType: variant.external_object_type,
      externalContainerId: variant.external_container_id,
      externalMediaId: variant.external_media_id,
      externalPermalink: variant.external_permalink,
      remoteIdentifiers: variant.remote_identifiers,
    })

    results.push({
      variantId: variant.id,
      platform: variant.platform,
      externalPostId: result.externalObjectId,
      deleted: result.deleted,
      skipped: result.status === 'skipped',
      status: result.status,
      error: result.message || undefined,
      retryable: result.retryable,
      manualActionRequired: result.manualActionRequired,
    })
  }

  return results
}
