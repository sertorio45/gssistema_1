import type {
  ApprovalDecision,
  ApprovalRequest,
  MediaAsset,
  MediaAssetPurpose,
  SocialAccount,
  SocialPost,
  SocialPostInput,
} from '~/types/marketing-social'

export function useMarketingSocial() {
  const supabase = useSupabaseClient()
  const { tenantId } = useTenant()

  function tenantQuery(extra: Record<string, unknown> = {}) {
    return { tenant_id: tenantId.value || undefined, ...extra }
  }

  async function listPosts(filters: Record<string, unknown> = {}) {
    return $fetch<{ data: SocialPost[], pagination: Record<string, number> }>(
      '/api/marketing/social/posts',
      { query: tenantQuery(filters) },
    )
  }

  async function getPost(id: string) {
    const response = await $fetch<{ data: SocialPost }>(`/api/marketing/social/posts/${id}`, {
      query: tenantQuery(),
    })
    return response.data
  }

  async function createPost(input: SocialPostInput) {
    const response = await $fetch<{ data: SocialPost }>('/api/marketing/social/posts', {
      method: 'POST',
      body: { ...input, tenant_id: tenantId.value || undefined },
    })
    return response.data
  }

  async function updatePost(id: string, input: SocialPostInput) {
    const response = await $fetch<{ data: SocialPost }>(`/api/marketing/social/posts/${id}`, {
      method: 'PUT',
      body: { ...input, tenant_id: tenantId.value || undefined },
    })
    return response.data
  }

  async function deletePost(id: string) {
    return $fetch(`/api/marketing/social/posts/${id}`, {
      method: 'DELETE',
      query: tenantQuery(),
    })
  }

  async function submitForApproval(id: string, approverIds: string[], dueAt?: string | null) {
    const response = await $fetch<{ data: ApprovalRequest }>(
      `/api/marketing/social/posts/${id}/submit`,
      {
        method: 'POST',
        body: {
          tenant_id: tenantId.value || undefined,
          approverIds,
          dueAt: dueAt || null,
        },
      },
    )
    return response.data
  }

  async function schedulePost(id: string, scheduledAt?: string | null) {
    return $fetch(`/api/marketing/social/posts/${id}/schedule`, {
      method: 'POST',
      body: {
        tenant_id: tenantId.value || undefined,
        scheduledAt: scheduledAt || null,
      },
    })
  }

  async function listApprovals(status = 'all') {
    const response = await $fetch<{ data: ApprovalRequest[] }>('/api/marketing/social/approvals', {
      query: tenantQuery({ status }),
    })
    return response.data
  }

  async function decide(
    requestId: string,
    decision: ApprovalDecision,
    comment?: string | null,
  ) {
    return $fetch(`/api/marketing/social/approvals/${requestId}/decision`, {
      method: 'POST',
      body: {
        tenant_id: tenantId.value || undefined,
        decision,
        comment: comment || null,
      },
    })
  }

  async function listAssets(filters: Record<string, unknown> = {}) {
    const response = await $fetch<{ data: MediaAsset[] }>('/api/marketing/social/assets', {
      query: tenantQuery(filters),
    })
    return response.data
  }

  async function uploadAsset(file: File, purpose: MediaAssetPurpose = 'reference') {
    if (!tenantId.value)
      throw new Error('Selecione uma empresa')

    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
    const objectPath = `${tenantId.value}/${crypto.randomUUID()}/original.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('marketing-assets')
      .upload(objectPath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })
    if (uploadError)
      throw uploadError

    try {
      const response = await $fetch<{ data: MediaAsset }>('/api/marketing/social/assets', {
        method: 'POST',
        body: {
          tenant_id: tenantId.value,
          name: file.name,
          objectPath,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          purpose,
        },
      })
      return response.data
    }
    catch (error) {
      await supabase.storage.from('marketing-assets').remove([objectPath])
      throw error
    }
  }

  async function deleteAsset(id: string) {
    return $fetch(`/api/marketing/social/assets/${id}`, {
      method: 'DELETE',
      query: tenantQuery(),
    })
  }

  async function listAccounts() {
    const response = await $fetch<{ data: SocialAccount[] }>('/api/marketing/social/accounts', {
      query: tenantQuery(),
    })
    return response.data
  }

  async function listLogs(filters: Record<string, unknown> = {}) {
    return $fetch<{
      data: Array<Record<string, unknown>>
      pagination: { page: number, pageSize: number, total: number, totalPages: number }
    }>('/api/marketing/social/logs', {
      query: tenantQuery(filters),
    })
  }

  return {
    tenantId,
    listPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    submitForApproval,
    schedulePost,
    listApprovals,
    decide,
    listAssets,
    uploadAsset,
    deleteAsset,
    listAccounts,
    listLogs,
  }
}
