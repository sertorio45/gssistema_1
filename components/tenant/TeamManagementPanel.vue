<script setup lang="ts">
import type { TenantTeamMember, TenantTeamRole } from '~/types/tenant-team'

import { createTeamColumns } from '~/components/crm/team/columns'
import TeamMemberDialog from '~/components/crm/team/TeamMemberDialog.vue'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import DataTable from '~/components/ui/table/DataTable.vue'
import { Skeleton } from '~/components/ui/skeleton'
import { isStaffRole, isTenantScopedRole, TENANT_TEAM_CLIENT_ASSIGNABLE_ROLES, TENANT_TEAM_STAFF_ASSIGNABLE_ROLES } from '~/constants/roles'
import { useAuth } from '~/composables/useAuth'
import { useTenantTeam, useTenantTeamManagement } from '~/composables/crm/useTenantTeam'
import { toast } from 'vue-sonner'

const { members, pending, refresh } = useTenantTeam()
const { createMember, updateMember, deleteMember } = useTenantTeamManagement()
const { currentRole } = useAuth()

const showDialog = ref(false)
const editingMember = ref<TenantTeamMember | null>(null)
const saving = ref(false)

const assignableRoles = computed<TenantTeamRole[]>(() => {
  if (isStaffRole(currentRole.value))
    return [...TENANT_TEAM_STAFF_ASSIGNABLE_ROLES] as TenantTeamRole[]
  return [...TENANT_TEAM_CLIENT_ASSIGNABLE_ROLES] as TenantTeamRole[]
})

const columns = computed(() => createTeamColumns({
  onEdit: openEdit,
  onDelete: handleDelete,
}))

function openCreate() {
  editingMember.value = null
  showDialog.value = true
}

function openEdit(member: TenantTeamMember) {
  editingMember.value = member
  showDialog.value = true
}

async function handleSubmit(payload: {
  name: string
  email: string
  password: string
  role: TenantTeamRole
}) {
  saving.value = true
  try {
    if (editingMember.value) {
      await updateMember(editingMember.value.id, {
        name: payload.name,
        role: payload.role,
        password: payload.password || undefined,
      })
      toast.success('Usuário atualizado')
    }
    else {
      await createMember(payload)
      toast.success('Usuário criado com sucesso')
    }
    showDialog.value = false
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao salvar usuário')
  }
  finally {
    saving.value = false
  }
}

async function handleDelete(member: TenantTeamMember) {
  if (!confirm(`Remover ${member.name} da equipe?`))
    return

  try {
    await deleteMember(member.id)
    toast.success('Usuário removido')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao remover usuário')
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Usuários
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Crie atendentes para sua empresa. Todos ficam vinculados ao tenant ativo.
        </p>
      </div>
      <Button @click="openCreate">
        <Icon name="i-lucide-user-plus" class="mr-2 h-4 w-4" />
        Novo usuário
      </Button>
    </div>

    <Card class="border-border/60 shadow-none">
      <CardContent class="p-4">
        <div v-if="pending" class="space-y-2">
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
        </div>
        <DataTable
          v-else
          :columns="columns"
          :data="members"
        />
      </CardContent>
    </Card>

    <TeamMemberDialog
      v-model:open="showDialog"
      :member="editingMember"
      :assignable-roles="assignableRoles"
      :loading="saving"
      @submit="handleSubmit"
    />
  </div>
</template>
