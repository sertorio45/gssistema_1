<script setup lang="ts">
import type { TenantTeamMember, TenantTeamRole } from '~/types/tenant-team'

import { toast } from 'vue-sonner'

import { columns } from '~/components/crm/team/columns'
import TeamMemberForm from '~/components/crm/team/TeamMemberForm.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
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
import { deleteWithConfirm } from '~/composables/useConfirmDelete'
import { useTenantTeam, useTenantTeamManagement } from '~/composables/crm/useTenantTeam'
import { useTenantPage } from '~/composables/useTenantPage'

definePageMeta({
  middleware: ['auth', 'tenant', 'role'],
  requiredRoles: ['admin', 'funcionario', 'cliente'],
  title: 'Usuários',
  description: 'Gerencie os usuários da sua empresa no CRM e WhatsApp.',
})

useSeoMeta({
  title: 'Usuários',
  description: 'Gerencie os usuários da sua empresa no CRM e WhatsApp.',
})

const { whenTenantReady } = useTenantPage()
const { members, pending, refresh } = useTenantTeam()
const { createMember, updateMember, deleteMember } = useTenantTeamManagement()
const { currentRole } = useAuth()

const selectedItems = ref<number[]>([])
const isFormOpen = ref(false)
const editingMember = ref<TenantTeamMember | null>(null)
const saving = ref(false)

const assignableRoles = computed<TenantTeamRole[]>(() => {
  if (isStaffRole(currentRole.value))
    return [...TENANT_TEAM_STAFF_ASSIGNABLE_ROLES] as TenantTeamRole[]
  return [...TENANT_TEAM_CLIENT_ASSIGNABLE_ROLES] as TenantTeamRole[]
})

whenTenantReady(() => {
  refresh()
})

function updateSelectedItems(items: number[]) {
  selectedItems.value = items
}

function handleCreate() {
  editingMember.value = null
  isFormOpen.value = true
}

function handleEdit(member: TenantTeamMember) {
  editingMember.value = member
  isFormOpen.value = true
}

async function handleDelete(member: TenantTeamMember) {
  const deleted = await deleteWithConfirm(
    () => deleteMember(member.id),
    {
      title: 'Remover usuário?',
      description: `Tem certeza que deseja remover "${member.name}" da equipe? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      successMessage: 'Usuário removido com sucesso.',
      errorMessage: 'Não foi possível remover o usuário.',
    },
  )

  if (deleted)
    await refresh()
}

async function handleMultiDelete() {
  const toDelete = selectedItems.value
    .map(idx => members.value[idx])
    .filter(Boolean) as TenantTeamMember[]
  const count = toDelete.length

  if (!count)
    return

  const deleted = await deleteWithConfirm(
    () => Promise.all(toDelete.map(member => deleteMember(member.id))),
    {
      title: 'Remover vários usuários?',
      description: `Tem certeza que deseja remover ${count} usuários? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover todos',
      successMessage: `${count} usuário(s) removido(s) com sucesso.`,
      errorMessage: 'Não foi possível remover os usuários.',
    },
  )

  if (deleted) {
    selectedItems.value = []
    await refresh()
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
      toast.success('Usuário atualizado com sucesso')
    }
    else {
      await createMember(payload)
      toast.success('Usuário criado com sucesso')
    }
    isFormOpen.value = false
    editingMember.value = null
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
        @selection-change="updateSelectedItems"
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

    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="handleMultiDelete"
    />

    <Dialog v-model:open="isFormOpen">
      <DialogContent class="mx-auto w-full overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader class="border-b p-4 md:p-6">
          <DialogTitle class="text-xl">
            {{ editingMember ? 'Editar Usuário' : 'Criar Usuário' }}
          </DialogTitle>
          <DialogDescription class="mt-1 text-sm text-muted-foreground">
            {{ editingMember
              ? 'Edite os dados do usuário da equipe.'
              : 'Adicione um novo usuário vinculado ao tenant ativo.' }}
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
