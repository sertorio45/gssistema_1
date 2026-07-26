<script setup lang="ts">
import type { OrganizationMember } from '~/types/workspace'

import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

import { useWorkspace } from '~/composables/useWorkspace'
import { ROLE_LABELS } from '~/constants/roles'

definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'organization.members.manage',
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

const portfolioTenants = computed(() =>
  tenants.value.filter(tenant => tenant.relationship_type === 'managed'),
)

const editingMember = ref<OrganizationMember | null>(null)
const accessAllTenants = ref(true)
const selectedTenantIds = ref<string[]>([])
const saving = ref(false)

function openScopeDialog(member: OrganizationMember) {
  editingMember.value = member
  accessAllTenants.value = member.access_all_tenants
  selectedTenantIds.value = member.tenants.map(assignment => assignment.tenant_id)
}

function toggleTenant(tenantId: string) {
  const index = selectedTenantIds.value.indexOf(tenantId)
  if (index >= 0)
    selectedTenantIds.value.splice(index, 1)
  else
    selectedTenantIds.value.push(tenantId)
}

function scopeLabel(member: OrganizationMember) {
  if (member.access_all_tenants)
    return 'Todos os clientes da organização'
  if (!member.tenants.length)
    return 'Nenhum cliente atribuído'
  return member.tenants.map(assignment => assignment.tenant?.name || assignment.tenant_id).join(', ')
}

async function saveScope() {
  if (!editingMember.value || !organizationId.value)
    return

  saving.value = true
  try {
    await $fetch(
      `/api/organizations/${organizationId.value}/members/${editingMember.value.id}/tenants`,
      {
        method: 'PUT',
        body: {
          accessAllTenants: accessAllTenants.value,
          tenantIds: accessAllTenants.value ? [] : selectedTenantIds.value,
        },
      },
    )
    toast.success('Alcance do colaborador atualizado')
    editingMember.value = null
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Não foi possível atualizar o alcance')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Equipe da organização
      </h1>
      <p class="mt-1 text-muted-foreground">
        {{ organization?.name || 'Organização' }} —
        <template v-if="isAgency">
          defina o cargo de cada colaborador e a quais clientes ele tem acesso.
        </template>
        <template v-else>
          defina o cargo de cada pessoa da sua equipe.
        </template>
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Colaboradores</CardTitle>
        <CardDescription>
          Cargos e alcance são validados no servidor a cada requisição.
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
              <TableHead>Status</TableHead>
              <TableHead class="text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="member in members" :key="member.id">
              <TableCell class="text-xs font-mono">
                {{ member.user_id }}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {{ ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] || member.role }}
                </Badge>
              </TableCell>
              <TableCell v-if="isAgency" class="max-w-[280px] text-sm text-muted-foreground">
                {{ scopeLabel(member) }}
              </TableCell>
              <TableCell>
                <Badge :variant="member.is_active ? 'default' : 'outline'">
                  {{ member.is_active ? 'Ativo' : 'Inativo' }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button v-if="isAgency" variant="outline" size="sm" @click="openScopeDialog(member)">
                  Definir clientes
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="!members.length">
              <TableCell :colspan="isAgency ? 5 : 4" class="py-6 text-center text-sm text-muted-foreground">
                Nenhum colaborador cadastrado nesta organização.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog :open="!!editingMember" @update:open="value => !value && (editingMember = null)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clientes do colaborador</DialogTitle>
          <DialogDescription>
            Escolha se o colaborador atende toda a carteira ou apenas clientes específicos.
          </DialogDescription>
        </DialogHeader>
        <div class="py-2 space-y-4">
          <div class="flex items-center justify-between border rounded-lg p-3">
            <div>
              <p class="text-sm font-medium">
                Acessar todos os clientes
              </p>
              <p class="text-xs text-muted-foreground">
                Inclui automaticamente novos clientes adicionados à carteira.
              </p>
            </div>
            <Switch v-model:checked="accessAllTenants" />
          </div>

          <div v-if="!accessAllTenants" class="space-y-2">
            <Label>Clientes atendidos</Label>
            <div class="max-h-64 overflow-y-auto border rounded-lg divide-y">
              <label
                v-for="tenant in portfolioTenants"
                :key="tenant.id"
                class="flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-muted/40"
              >
                <Checkbox
                  :checked="selectedTenantIds.includes(tenant.id)"
                  @update:checked="() => toggleTenant(tenant.id)"
                />
                <span>{{ tenant.name }}</span>
              </label>
              <p v-if="!portfolioTenants.length" class="p-3 text-xs text-muted-foreground">
                Nenhum cliente na carteira da organização.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="editingMember = null">
            Cancelar
          </Button>
          <Button
            :disabled="saving || (!accessAllTenants && !selectedTenantIds.length)"
            @click="saveScope"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
