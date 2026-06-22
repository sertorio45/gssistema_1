<script setup lang="ts">
import type { TenantTeamMember, TenantTeamRole } from '~/types/tenant-team'

import TeamMemberForm from '~/components/crm/team/TeamMemberForm.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

defineProps<{
  open: boolean
  member?: TenantTeamMember | null
  assignableRoles: TenantTeamRole[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: {
    name: string
    email: string
    password: string
    role: TenantTeamRole
  }]
}>()
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ member ? 'Editar usuário' : 'Novo usuário' }}</DialogTitle>
        <DialogDescription>
          Usuários da sua empresa acessam o CRM e o chat de atendimento.
        </DialogDescription>
      </DialogHeader>
      <TeamMemberForm
        :member="member"
        :assignable-roles="assignableRoles"
        :loading="loading"
        @submit="emit('submit', $event)"
        @cancel="emit('update:open', false)"
      />
    </DialogContent>
  </Dialog>
</template>
