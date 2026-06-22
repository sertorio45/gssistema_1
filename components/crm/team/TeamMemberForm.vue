<script setup lang="ts">
import type { TenantTeamMember, TenantTeamRole } from '~/types/tenant-team'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { TENANT_TEAM_ROLE_LABELS } from '~/types/tenant-team'

const props = defineProps<{
  member?: TenantTeamMember | null
  assignableRoles: TenantTeamRole[]
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: {
    name: string
    email: string
    password: string
    role: TenantTeamRole
  }]
  cancel: []
}>()

const isEdit = computed(() => Boolean(props.member))

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'atendente' as TenantTeamRole,
})

watch(
  () => props.member,
  (member) => {
    form.name = member?.name || ''
    form.email = member?.email || ''
    form.password = ''
    form.role = member?.role || props.assignableRoles[0] || 'atendente'
  },
  { immediate: true },
)

function handleSubmit() {
  emit('submit', {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
    role: form.role,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-2">
      <Label for="team-name">Nome</Label>
      <Input
        id="team-name"
        v-model="form.name"
        placeholder="Nome completo"
        required
      />
    </div>

    <div class="space-y-2">
      <Label for="team-email">E-mail</Label>
      <Input
        id="team-email"
        v-model="form.email"
        type="email"
        placeholder="email@empresa.com"
        :disabled="isEdit"
        required
      />
    </div>

    <div class="space-y-2">
      <Label for="team-password">
        {{ isEdit ? 'Nova senha (opcional)' : 'Senha' }}
      </Label>
      <Input
        id="team-password"
        v-model="form.password"
        type="password"
        :required="!isEdit"
        autocomplete="new-password"
      />
    </div>

    <div class="space-y-2">
      <Label>Função</Label>
      <Select v-model="form.role">
        <SelectTrigger>
          <SelectValue placeholder="Selecione a função" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="role in assignableRoles"
            :key="role"
            :value="role"
          >
            {{ TENANT_TEAM_ROLE_LABELS[role] }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancel')">
        Cancelar
      </Button>
      <Button type="submit" :disabled="loading">
        {{ loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Adicionar membro' }}
      </Button>
    </div>
  </form>
</template>
