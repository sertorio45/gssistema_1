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
    mode: AccessMode
  }]
  cancel: []
}>()

type AccessMode = 'password' | 'invite'

const isEdit = computed(() => Boolean(props.member))

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'atendente' as TenantTeamRole,
  mode: 'invite' as AccessMode,
})

const requiresPassword = computed(() => !isEdit.value && form.mode === 'password')

const accessModes: Array<{ value: AccessMode, title: string, description: string }> = [
  {
    value: 'invite',
    title: 'Enviar convite por e-mail',
    description: 'O atendente define a própria senha pelo link recebido.',
  },
  {
    value: 'password',
    title: 'Definir a senha agora',
    description: 'Você cria a senha e informa ao atendente.',
  },
]

watch(
  () => props.member,
  (member) => {
    form.name = member?.name || ''
    form.email = member?.email || ''
    form.password = ''
    form.role = member?.role || props.assignableRoles[0] || 'atendente'
    form.mode = 'invite'
  },
  { immediate: true },
)

function handleSubmit() {
  emit('submit', {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
    role: form.role,
    mode: isEdit.value ? 'password' : form.mode,
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

    <div v-if="!isEdit" class="space-y-2">
      <Label>Como o acesso será criado</Label>
      <div class="grid gap-2 sm:grid-cols-2">
        <button
          v-for="option in accessModes"
          :key="option.value"
          type="button"
          class="border rounded-lg p-3 text-left transition-colors hover:bg-accent/40"
          :class="form.mode === option.value ? 'border-primary bg-accent/30' : 'border-border'"
          @click="form.mode = option.value"
        >
          <span class="block text-sm font-medium">{{ option.title }}</span>
          <span class="mt-0.5 block text-xs text-muted-foreground">{{ option.description }}</span>
        </button>
      </div>
    </div>

    <div v-if="requiresPassword || isEdit" class="space-y-2">
      <Label for="team-password">
        {{ isEdit ? 'Nova senha (opcional)' : 'Senha' }}
      </Label>
      <Input
        id="team-password"
        v-model="form.password"
        type="password"
        :required="requiresPassword"
        autocomplete="new-password"
      />
      <p v-if="requiresPassword" class="text-xs text-muted-foreground">
        Mínimo de 8 caracteres. Combine com o atendente por um canal seguro.
      </p>
    </div>

    <p v-else-if="!isEdit" class="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
      Enviaremos um e-mail para <span class="text-foreground font-medium">{{ form.email || 'o endereço informado' }}</span>
      com um link para o atendente criar a própria senha. Você também receberá um link
      para encaminhar manualmente, caso o e-mail não chegue.
    </p>

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
