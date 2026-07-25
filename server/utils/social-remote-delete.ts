import { deleteFromMeta } from '~/server/utils/social-publishers/meta-publisher'

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
      provider,
      external_post_id,
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

  const results: Array<{
    variantId: string
    platform: string
    externalPostId: string
    deleted: boolean
    skipped?: boolean
    error?: string
  }> = []

  for (const variant of variants || []) {
    const account = Array.isArray(variant.social_accounts)
      ? variant.social_accounts[0]
      : variant.social_accounts
    const externalPostId = String(variant.external_post_id || '')
    if (!externalPostId || !account) {
      results.push({
        variantId: variant.id,
        platform: variant.platform,
        externalPostId,
        deleted: false,
        skipped: true,
      })
      continue
    }

    try {
      if (account.provider === 'meta') {
        const result = await deleteFromMeta({
          client,
          tenantId: input.tenantId,
          account,
          externalPostId,
        })
        results.push({
          variantId: variant.id,
          platform: variant.platform,
          externalPostId,
          deleted: Boolean(result.deleted),
          skipped: Boolean(result.skipped),
          error: result.message,
        })
      }
      else {
        results.push({
          variantId: variant.id,
          platform: variant.platform,
          externalPostId,
          deleted: false,
          skipped: true,
          error: 'Exclusão remota ainda não suportada neste provedor',
        })
      }
    }
    catch (error: any) {
      results.push({
        variantId: variant.id,
        platform: variant.platform,
        externalPostId,
        deleted: false,
        error: error?.statusMessage || error?.message || 'Falha ao excluir remotamente',
      })
    }
  }

  return results
}
