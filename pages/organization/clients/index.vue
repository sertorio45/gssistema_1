<script setup lang="ts">
import type { AgencyClientRow } from '~/types/workspace'

import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { deleteWithConfirm } from '~/composables/useConfirmDelete'

import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'agency.clients.read',
  allowedOrganizationTypes: ['agency'],
  title: 'Clientes',
})

const { organization, can, switchContext } = useWorkspace()
const organizationId = computed(() => organization.value?.id ?? null)
const canManage = computed(() => can('agency.clients.manage'))
const canIntegrations = computed(() => can('marketing.social.integrations'))

const { data: clientsRaw, pending, refresh, showSkeleton } = await useCachedAsyncData<AgencyClientRow[]>(
  computed(() => `agency-clients-${organizationId.value ?? 'none'}`),
  async () => {
    if (!organizationId.value)
      return []
    const response = await $fetch<{ data: AgencyClientRow[] }>(
      `/api/organizations/${organizationId.value}/clients`,
    )
    return response.data
  },
  { default: () => null, watch: [organizationId] },
)

const clients = computed(() => clientsRaw.value ?? [])

const search = ref('')
const busyTenantId = ref<string | null>(null)

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query)
    return clients.value
  return clients.value.filter(client =>
    client.name.toLowerCase().includes(query)
    || client.tenant.name.toLowerCase().includes(query)
    || client.tenant.slug.toLowerCase().includes(query),
  )
})

async function openClient(tenantId: string, path = '/marketing') {
  busyTenantId.value = tenantId
  try {
    await switchContext({ tenantId })
    await navigateTo(path)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Não foi possível abrir o ambiente do cliente')
  }
  finally {
    busyTenantId.value = null
  }
}

async function deactivateClient(client: AgencyClientRow) {
  if (!organizationId.value || !canManage.value)
    return

  busyTenantId.value = client.tenant_id
  try {
    const ok = await deleteWithConfirm(
      () => $fetch(`/api/organizations/${organizationId.value}/tenants/${client.tenant_id}`, {
        method: 'DELETE',
      }),
      {
        title: 'Desativar vínculo?',
        description: `Tem certeza que deseja desativar o vínculo com "${client.name}"? Esta ação não pode ser desfeita.`,
        successMessage: 'Vínculo desativado com sucesso.',
      },
    )
    if (ok)
      await refresh()
  }
  finally {
    busyTenantId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Clientes
        </h1>
        <p class="mt-1 text-muted-foreground">
          Carteira da agência com o alcance atribuído ao seu usuário.
        </p>
      </div>
      <div class="flex gap-2">
        <Button v-if="canManage" @click="navigateTo('/organization/clients/onboarding')">
          Novo cliente
        </Button>
      </div>
    </div>

    <div class="relative max-w-sm">
      <Icon name="lucide:search" class="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
      <Input v-model="search" class="pl-9" placeholder="Buscar cliente..." />
    </div>

    <div v-if="showSkeleton" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Skeleton v-for="n in 6" :key="n" class="h-56 rounded-lg" />
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card v-for="client in filtered" :key="client.link_id" class="overflow-hidden">
        <CardHeader class="pb-3">
          <div class="flex items-start gap-3">
            <div class="h-11 w-11 flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              <img
                v-if="client.logo_url"
                :src="client.logo_url"
                :alt="client.name"
                class="h-full w-full object-cover"
              >
              <span v-else class="text-sm font-semibold">{{ client.name.charAt(0) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <CardTitle class="truncate text-base">
                {{ client.name }}
              </CardTitle>
              <CardDescription class="truncate">
                {{ client.tenant.name }} · {{ client.tenant.slug }}
              </CardDescription>
            </div>
            <Badge :variant="client.status === 'active' ? 'default' : 'outline'">
              {{ client.status === 'active' ? 'Ativo' : 'Inativo' }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <div class="flex flex-wrap gap-1.5">
            <Badge v-for="moduleName in client.modules" :key="moduleName" variant="secondary">
              {{ moduleName }}
            </Badge>
            <span v-if="!client.modules.length" class="text-xs text-muted-foreground">Sem módulos</span>
          </div>
          <dl class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt class="text-muted-foreground">
                Responsável
              </dt>
              <dd class="truncate font-medium">
                {{ client.internal_owner?.email || '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">
                Usuários
              </dt>
              <dd class="font-medium">
                {{ client.client_user_count }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">
                Redes
              </dt>
              <dd class="font-medium">
                {{ client.connected_networks.map(n => n.platform).join(', ') || '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">
                Aguardando / agenda / falhas
              </dt>
              <dd class="font-medium">
                {{ client.posts_pending_approval }} / {{ client.posts_scheduled }} / {{ client.recent_failures }}
              </dd>
            </div>
          </dl>
          <div class="flex flex-wrap gap-2 pt-1">
            <Button size="sm" :disabled="busyTenantId === client.tenant_id" @click="openClient(client.tenant_id)">
              Abrir ambiente
            </Button>
            <Button
              v-if="canManage"
              size="sm"
              variant="outline"
              @click="navigateTo(`/organization/team?tenant=${client.tenant_id}`)"
            >
              Equipe
            </Button>
            <Button
              v-if="canIntegrations"
              size="sm"
              variant="outline"
              @click="openClient(client.tenant_id, '/settings/integrations')"
            >
              Integrações
            </Button>
            <Button
              v-if="canManage"
              size="sm"
              variant="ghost"
              class="text-destructive"
              :disabled="busyTenantId === client.tenant_id"
              @click="deactivateClient(client)"
            >
              Desativar
            </Button>
          </div>
        </CardContent>
      </Card>

      <p v-if="!filtered.length" class="text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
        Nenhum cliente no seu alcance.
      </p>
    </div>
  </div>
</template>
