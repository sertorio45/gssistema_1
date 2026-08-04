<script setup lang="ts">
/**
 * @deprecated Prefer the listing page at pages/settings/team.vue.
 * Kept for compatibility with older imports.
 */
import type { TenantTeamMember, TenantTeamRole } from '~/types/tenant-team'

import { toast } from 'vue-sonner'

import { columns } from '~/components/crm/team/columns'
import TeamMemberForm from '~/components/crm/team/TeamMemberForm.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import DataTableViewOptions from '~/components/ui/table/DataTableViewOptions.vue'
import {
  isStaffRole,
  TENANT_TEAM_CLIENT_ASSIGNABLE_ROLES,
  TENANT_TEAM_STAFF_ASSIGNABLE_ROLES,
} from '~/constants/roles'
import { useAuth } from '~/composables/useAuth'
import { useTenantTeam, useTenantTeamManagement } from '~/composables/crm/useTenantTeam'

const { members, pending, refresh } = useTenantTeam()
const { createMember, updateMember, deleteMember } = useTenantTeamManagement()
const { currentRole } = useAuth()

const isFormOpen = ref(false)
const editingMember = ref<TenantTeamMember | null>(null)
const saving = ref(false)

const assignableRoles = computed<TenantTeamRole[]>(() => {
  if (isStaffRole(currentRole.value))
    return [...TENANT_TEAM_STAFF_ASSIGNABLE_ROLES] as TenantTeamRole[]
  return [...TENANT_TEAM_CLIENT_ASSIGNABLE_ROLES] as TenantTeamRole[]
})

function handleCreate() {
  editingMember.value = null
  isFormOpen.value = true
}

function handleEdit(member: TenantTeamMember) {
  editingMember.value = member
  isFormOpen.value = true
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
    isFormOpen.value = false
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao salvar usuário')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          Usuários
        </h1>
        <p class="text-muted-foreground">
          Gerencie os usuários da sua empresa no CRM e WhatsApp
        </p>
      </div>
      <Button @click="handleCreate">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Novo Usuário
      </Button>
    </div>

    <div v-if="pending" class="space-y-4">
      <Card class="border shadow-sm">
        <CardContent class="p-4">
          <div class="space-y-2">
            <Skeleton class="h-8 w-[250px]" />
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
    <template v-else>
      <DataTable
        :data="members"
        :columns="columns"
        :meta="{ onEdit: handleEdit, onDelete: handleDelete }"
      >
        <template #toolbar="{ table }">
          <DataTableToolbar :table="table" placeholder="Buscar usuários..." filter-column="name">
            <template #options>
              <DataTableViewOptions :table="table" />
            </template>
          </DataTableToolbar>
        </template>
        <template #pagination="{ table }">
          <DataTablePagination :table="table" />
        </template>
      </DataTable>
    </template>

    <Dialog v-model:open="isFormOpen">
      <DialogContent class="mx-auto w-full overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader class="border-b p-4 md:p-6">
          <DialogTitle class="text-xl">
            {{ editingMember ? 'Editar Usuário' : 'Criar Usuário' }}
          </DialogTitle>
          <DialogDescription class="mt-1 text-sm text-muted-foreground">
            Usuários da sua empresa acessam o CRM e o chat de atendimento.
          </DialogDescription>
        </DialogHeader>
        <div class="p-4 md:p-6">
          <TeamMemberForm
            :member="editingMember"
            :assignable-roles="assignableRoles"
            :loading="saving"
            @submit="handleSubmit"
            @cancel="isFormOpen = false"
          />
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
