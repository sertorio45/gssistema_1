<script setup lang="ts">
import type { OrganizationMember, OrganizationRole } from '~/types/workspace'

import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'organization.team.manage',
  title: 'Equipe da organização',
})

const { organization, organizationType, tenants } = useWorkspace()

const organizationId = computed(() => organization.value?.id ?? null)
const isAgency = computed(() => organizationType.value === 'agency')

const { data: members, refresh, pending } = await useAsyncData<OrganizationMember[]>(
  'organization-team',
  async () => {
    if (!organizationId.value)
      return []
    const response = await $fetch<{ data: OrganizationMember[] }>(
      `/api/organizations/${organizationId.value}/members`,
    )
    return response.data
  },
  { default: () => [], watch: [organizationId] },
)

const { data: roles } = await useAsyncData<OrganizationRole[]>(
  'organization-team-roles',
  async () => {
    if (!organizationId.value)
      return []
    const response = await $fetch<{ data: OrganizationRole[] }>(
      `/api/organizations/${organizationId.value}/roles`,
    )
    return response.data
  },
  { default: () => [], watch: [organizationId] },
)

const portfolioTenants = computed(() =>
  tenants.value.filter(tenant => tenant.relationship_type === 'managed' || !isAgency.value),
)

const inviteOpen = ref(false)
const editingMember = ref<OrganizationMember | null>(null)
const saving = ref(false)

const inviteForm = ref({
  email: '',
  name: '',
  roleId: '',
  accessAllTenants: true,
  tenantIds: [] as string[],
})

const editForm = ref({
  roleId: '',
  accessAllTenants: true,
  tenantIds: [] as string[],
  isActive: true,
})

function openInvite() {
  inviteForm.value = {
    email: '',
    name: '',
    roleId: roles.value.find(role => role.is_default)?.id || roles.value[0]?.id || '',
    accessAllTenants: true,
    tenantIds: [],
  }
  inviteOpen.value = true
}

function openEdit(member: OrganizationMember) {
  editingMember.value = member
  editForm.value = {
    roleId: member.role_id || '',
    accessAllTenants: member.access_all_tenants,
    tenantIds: member.tenants.map(assignment => assignment.tenant_id),
    isActive: member.is_active,
  }
}

function toggleTenant(list: string[], tenantId: string) {
  const index = list.indexOf(tenantId)
  if (index >= 0)
    list.splice(index, 1)
  else
    list.push(tenantId)
}

function scopeLabel(member: OrganizationMember) {
  if (member.access_all_tenants)
    return 'Todos os clientes da organização'
  if (!member.tenants.length)
    return 'Nenhum cliente atribuído'
  return member.tenants.map(assignment => assignment.tenant?.name || assignment.tenant_id).join(', ')
}

function formatLastAccess(value?: string | null) {
  if (!value)
    return '—'
  return new Date(value).toLocaleString('pt-BR')
}

async function submitInvite() {
  if (!organizationId.value || !inviteForm.value.email || !inviteForm.value.roleId)
    return

  saving.value = true
  try {
    const response = await $fetch<{ data: { invite_sent?: boolean, created_user?: boolean } }>(
      `/api/organizations/${organizationId.value}/members`,
      {
        method: 'POST',
        body: {
          email: inviteForm.value.email,
          name: inviteForm.value.name || undefined,
          roleId: inviteForm.value.roleId,
          accessAllTenants: inviteForm.value.accessAllTenants,
          tenantIds: inviteForm.value.accessAllTenants ? [] : inviteForm.value.tenantIds,
        },
      },
    )
    if (response.data.invite_sent || response.data.created_user) {
      toast.success('Convite enviado por e-mail. O colaborador define a própria senha ao aceitar.')
    }
    else {
      toast.success('Colaborador adicionado à organização')
    }
    inviteOpen.value = false
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Não foi possível convidar o colaborador')
  }
  finally {
    saving.value = false
  }
}

async function saveMember() {
  if (!editingMember.value || !organizationId.value)
    return

  saving.value = true
  try {
    await $fetch(
      `/api/organizations/${organizationId.value}/members/${editingMember.value.id}`,
      {
        method: 'PUT',
        body: {
          roleId: editForm.value.roleId || undefined,
          isActive: editForm.value.isActive,
          accessAllTenants: editForm.value.accessAllTenants,
          tenantIds: editForm.value.accessAllTenants ? [] : editForm.value.tenantIds,
        },
      },
    )
    toast.success('Colaborador atualizado')
    editingMember.value = null
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Não foi possível atualizar o colaborador')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Equipe da organização
        </h1>
        <p class="mt-1 text-muted-foreground">
          {{ organization?.name || 'Organização' }} —
          <template v-if="isAgency">
            escolha o cargo e a quais clientes cada colaborador tem acesso.
          </template>
          <template v-else>
            escolha o cargo de cada pessoa da sua equipe.
          </template>
        </p>
      </div>
      <Button @click="openInvite">
        Convidar
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Colaboradores</CardTitle>
        <CardDescription>
          Cargo e alcance são conceitos separados e sempre revalidados no servidor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="pending" class="py-6 text-sm text-muted-foreground">
          Carregando colaboradores...
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead v-if="isAgency">
                Clientes
              </TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="member in members" :key="member.id">
              <TableCell>
                <div class="space-y-0.5">
                  <p class="font-medium">
                    {{ member.email || member.user_id }}
                  </p>
                  <p v-if="member.email" class="text-xs text-muted-foreground font-mono">
                    {{ member.user_id }}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {{ member.role_name || member.role }}
                </Badge>
              </TableCell>
              <TableCell v-if="isAgency" class="max-w-[240px] text-sm text-muted-foreground">
                {{ scopeLabel(member) }}
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">
                {{ formatLastAccess(member.last_sign_in_at) }}
              </TableCell>
              <TableCell>
                <Badge :variant="member.is_active ? 'default' : 'outline'">
                  {{ member.is_active ? 'Ativo' : 'Inativo' }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button variant="outline" size="sm" @click="openEdit(member)">
                  Gerenciar
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="!members.length">
              <TableCell :colspan="isAgency ? 6 : 5" class="py-6 text-center text-sm text-muted-foreground">
                Nenhum colaborador cadastrado nesta organização.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog :open="inviteOpen" @update:open="value => !value && (inviteOpen = false)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar colaborador</DialogTitle>
          <DialogDescription>
            Informe o e-mail, o cargo e, se for agência, o alcance de clientes.
          </DialogDescription>
        </DialogHeader>
        <div class="py-2 space-y-4">
          <div class="space-y-2">
            <Label>E-mail</Label>
            <Input v-model="inviteForm.email" type="email" placeholder="nome@empresa.com" />
          </div>
          <div class="space-y-2">
            <Label>Nome</Label>
            <Input v-model="inviteForm.name" placeholder="Opcional" />
          </div>
          <div class="space-y-2">
            <Label>Cargo</Label>
            <select
              v-model="inviteForm.roleId"
              class="h-10 w-full flex border border-input rounded-md bg-background px-3 py-2 text-sm"
            >
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </select>
          </div>
          <div v-if="isAgency" class="space-y-3">
            <div class="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p class="text-sm font-medium">
                  Acessar todos os clientes
                </p>
                <p class="text-xs text-muted-foreground">
                  Inclui automaticamente novos clientes da carteira.
                </p>
              </div>
              <Switch v-model:checked="inviteForm.accessAllTenants" />
            </div>
            <div v-if="!inviteForm.accessAllTenants" class="max-h-48 overflow-y-auto border rounded-lg divide-y">
              <label
                v-for="tenant in portfolioTenants"
                :key="tenant.id"
                class="flex cursor-pointer items-center gap-3 p-3 text-sm"
              >
                <Checkbox
                  :checked="inviteForm.tenantIds.includes(tenant.id)"
                  @update:checked="() => toggleTenant(inviteForm.tenantIds, tenant.id)"
                />
                <span>{{ tenant.name }}</span>
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="inviteOpen = false">
            Cancelar
          </Button>
          <Button
            :disabled="saving || !inviteForm.email || !inviteForm.roleId"
            @click="submitInvite"
          >
            Convidar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="!!editingMember" @update:open="value => !value && (editingMember = null)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar colaborador</DialogTitle>
          <DialogDescription>
            Altere cargo, status e alcance de clientes.
          </DialogDescription>
        </DialogHeader>
        <div class="py-2 space-y-4">
          <div class="space-y-2">
            <Label>Cargo</Label>
            <select
              v-model="editForm.roleId"
              class="h-10 w-full flex border border-input rounded-md bg-background px-3 py-2 text-sm"
            >
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </select>
          </div>
          <div class="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p class="text-sm font-medium">
                Ativo
              </p>
              <p class="text-xs text-muted-foreground">
                Colaboradores inativos perdem acesso imediatamente.
              </p>
            </div>
            <Switch v-model:checked="editForm.isActive" />
          </div>
          <div v-if="isAgency" class="space-y-3">
            <div class="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p class="text-sm font-medium">
                  Acessar todos os clientes
                </p>
              </div>
              <Switch v-model:checked="editForm.accessAllTenants" />
            </div>
            <div v-if="!editForm.accessAllTenants" class="max-h-48 overflow-y-auto border rounded-lg divide-y">
              <label
                v-for="tenant in portfolioTenants"
                :key="tenant.id"
                class="flex cursor-pointer items-center gap-3 p-3 text-sm"
              >
                <Checkbox
                  :checked="editForm.tenantIds.includes(tenant.id)"
                  @update:checked="() => toggleTenant(editForm.tenantIds, tenant.id)"
                />
                <span>{{ tenant.name }}</span>
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="editingMember = null">
            Cancelar
          </Button>
          <Button :disabled="saving" @click="saveMember">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
