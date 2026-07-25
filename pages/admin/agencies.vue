<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'funcionario'],
  title: 'Agências',
})

const { listTenants } = useTenant()
const dialogOpen = ref(false)
const saving = ref(false)
const name = ref('')
const slug = ref('')
const anchorTenantId = ref('')
const portfolioDialogOpen = ref(false)
const activeOrganizationId = ref('')
const portfolioTenantId = ref('')

const { data: organizations, refresh } = await useAsyncData(
  'organizations-admin',
  async () => {
    const response = await $fetch<{ data: any[] }>('/api/organizations', {
      query: { type: 'agency' },
    })
    return response.data
  },
  { default: () => [] },
)
const { data: tenants } = await useAsyncData(
  'organizations-admin-tenants',
  () => listTenants(),
  { default: () => [] },
)

watch(name, (value) => {
  slug.value = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
})

async function createAgency() {
  saving.value = true
  try {
    await $fetch('/api/organizations', {
      method: 'POST',
      body: {
        name: name.value,
        slug: slug.value,
        type: 'agency',
        tenantId: anchorTenantId.value,
      },
    })
    toast.success('Agência criada')
    dialogOpen.value = false
    name.value = ''
    slug.value = ''
    anchorTenantId.value = ''
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível criar a agência')
  }
  finally {
    saving.value = false
  }
}

function openPortfolio(organizationId: string) {
  activeOrganizationId.value = organizationId
  portfolioTenantId.value = ''
  portfolioDialogOpen.value = true
}

function primaryTenant(organization: any) {
  return (organization.organization_tenants || []).find((relation: any) => relation.is_primary)?.tenant
}

function portfolioClients(organization: any) {
  return (organization.organization_tenants || []).filter((relation: any) => !relation.is_primary)
}

async function addPortfolioTenant() {
  if (!activeOrganizationId.value || !portfolioTenantId.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/organizations/${activeOrganizationId.value}/tenants`, {
      method: 'POST',
      body: { tenantId: portfolioTenantId.value, isPrimary: false },
    })
    toast.success('Cliente adicionado à carteira')
    portfolioDialogOpen.value = false
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível adicionar o cliente')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Agências
        </h1>
        <p class="mt-1 text-muted-foreground">
          Gerencie a empresa principal, a carteira de clientes e a equipe de cada agência.
        </p>
      </div>
      <Button @click="dialogOpen = true">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Nova agência
      </Button>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card v-for="organization in organizations" :key="organization.id">
        <CardHeader>
          <div class="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{{ organization.name }}</CardTitle>
              <CardDescription>{{ organization.slug }}</CardDescription>
            </div>
            <Badge variant="secondary">
              {{ organization.type === 'agency' ? 'Agência' : 'Direto' }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div class="mb-4 border rounded-lg bg-muted/30 p-3">
            <p class="text-xs text-muted-foreground">
              Empresa principal
            </p>
            <p class="mt-1 text-sm font-medium">
              {{ primaryTenant(organization)?.name || 'Não configurada' }}
            </p>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Clientes na carteira</span>
            <span class="font-medium">{{ portfolioClients(organization).length }}</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-1">
            <Badge
              v-for="relation in portfolioClients(organization)"
              :key="relation.tenant_id"
              variant="outline"
            >
              {{ relation.tenant?.name || relation.tenant_id }}
            </Badge>
            <span v-if="!portfolioClients(organization).length" class="text-xs text-muted-foreground">
              Nenhum cliente adicionado.
            </span>
          </div>
          <Button class="mt-4 w-full" variant="outline" @click="openPortfolio(organization.id)">
            <Icon name="lucide:building-2" class="mr-2 h-4 w-4" />
            Adicionar cliente
          </Button>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova agência</DialogTitle>
          <DialogDescription>
            A empresa principal será o workspace administrativo inicial da agência.
          </DialogDescription>
        </DialogHeader>
        <div class="py-2 space-y-4">
          <div class="space-y-2">
            <Label for="agency-name">Nome</Label>
            <Input id="agency-name" v-model="name" placeholder="Nome da agência" />
          </div>
          <div class="space-y-2">
            <Label for="agency-slug">Identificador</Label>
            <Input id="agency-slug" v-model="slug" placeholder="nome-da-agencia" />
          </div>
          <div class="space-y-2">
            <Label>Empresa principal</Label>
            <Select v-model="anchorTenantId">
              <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">
                  {{ tenant.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">
            Cancelar
          </Button>
          <Button :disabled="saving || !name.trim() || !slug.trim() || !anchorTenantId" @click="createAgency">
            Criar agência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="portfolioDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar cliente à carteira</DialogTitle>
          <DialogDescription>
            Os membros autorizados da agência poderão alternar para este workspace.
          </DialogDescription>
        </DialogHeader>
        <div class="py-2 space-y-2">
          <Label>Empresa cliente</Label>
          <Select v-model="portfolioTenantId">
            <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">
                {{ tenant.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="portfolioDialogOpen = false">
            Cancelar
          </Button>
          <Button :disabled="saving || !portfolioTenantId" @click="addPortfolioTenant">
            Adicionar à carteira
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
