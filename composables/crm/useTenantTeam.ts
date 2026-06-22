import type { TenantTeamMember } from '~/types/tenant-team'

export function useTenantTeam(options?: { attendantsOnly?: boolean }) {
  const { tenantId } = useTenant()
  const attendantsOnly = options?.attendantsOnly ?? false

  const cacheKey = computed(
    () => `tenant-team-${tenantId.value}-${attendantsOnly ? 'attendants' : 'all'}`,
  )

  const { data, pending, refresh, error } = useAsyncData(
    cacheKey,
    async () => {
      if (!tenantId.value)
        return [] as TenantTeamMember[]

      const response = await $fetch<{ data: TenantTeamMember[] }>('/api/crm/team', {
        query: {
          tenant_id: tenantId.value,
          attendants_only: attendantsOnly ? 'true' : undefined,
        },
      })

      return response.data || []
    },
    { watch: [tenantId], default: () => [], server: false },
  )

  const members = computed(() => data.value || [])

  const membersByUserId = computed(() => {
    const map = new Map<string, TenantTeamMember>()
    for (const member of members.value)
      map.set(member.userId, member)
    return map
  })

  function getMemberName(userId?: string | null) {
    if (!userId)
      return 'Não atribuído'
    return membersByUserId.value.get(userId)?.name || 'Usuário'
  }

  return {
    members,
    membersByUserId,
    pending,
    error,
    refresh,
    getMemberName,
  }
}

export function useTenantTeamManagement() {
  const { tenantId } = useTenant()

  async function createMember(payload: {
    email: string
    password: string
    name: string
    role: TenantTeamMember['role']
  }) {
    return $fetch<{ data: TenantTeamMember }>('/api/crm/team', {
      method: 'POST',
      body: {
        tenant_id: tenantId.value,
        ...payload,
      },
    })
  }

  async function updateMember(
    membershipId: string,
    payload: { name?: string, role?: TenantTeamMember['role'], password?: string },
  ) {
    return $fetch<{ data: TenantTeamMember }>(`/api/crm/team/${membershipId}`, {
      method: 'PUT',
      body: {
        tenant_id: tenantId.value,
        ...payload,
      },
    })
  }

  async function deleteMember(membershipId: string) {
    return $fetch<{ ok: boolean }>(`/api/crm/team/${membershipId}`, {
      method: 'DELETE',
      query: { tenant_id: tenantId.value },
    })
  }

  return {
    createMember,
    updateMember,
    deleteMember,
  }
}
