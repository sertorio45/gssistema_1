<script setup lang="ts">
import type { AgencyClientRow } from '~/types/workspace'

import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MailPlus,
  Plug,
  Power,
  Search,
  Users,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'

import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import { deleteWithConfirm } from '~/composables/useConfirmDelete'
import { useWorkspace } from '~/composables/useWorkspace'
import { MODULE_LABELS_PT } from '~/constants/modules'

interface TenantUserRow {
  user_id: string
  email: string | null
  name: string | null
  role: string
  status: 'pending' | 'active'
  last_sign_in_at: string | null
}

interface ResendResponse {
  email: string
  user_id: string
  method: 'invite' | 'recovery'
  email_sent: boolean
  action_link: string | null
  link_error: string | null
}

definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'agency.clients.read',
  allowedOrganizationTypes: ['agency'],
  title: 'Clientes',
  alias: ['/agency/clients'],
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
const statusFilter = ref<'all' | 'active' | 'attention'>('all')
const busyTenantId = ref<string | null>(null)

const summary = computed(() => {
  const list = clients.value
  return {
    total: list.length,
    active: list.filter(client => client.status === 'active').length,
    pendingApproval: list.reduce((sum, client) => sum + client.posts_pending_approval, 0),
    failures: list.reduce((sum, client) => sum + client.recent_failures, 0),
  }
})

function needsAttention(client: AgencyClientRow) {
  return client.status !== 'active'
    || client.recent_failures > 0
    || !client.modules.length
    || client.client_user_count === 0
}

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()

  return clients.value.filter((client) => {
    if (statusFilter.value === 'active' && client.status !== 'active')
      return false
    if (statusFilter.value === 'attention' && !needsAttention(client))
      return false

    if (!query)
      return true

    return client.name.toLowerCase().includes(query)
      || client.tenant.name.toLowerCase().includes(query)
      || client.tenant.slug.toLowerCase().includes(query)
      || (client.client_invite_emails || []).some(email => email.includes(query))
  })
})

function moduleLabel(name: string) {
  return MODULE_LABELS_PT[name] || name
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

function formatDate(value?: string | null) {
  if (!value)
    return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

async function openClient(tenantId: string, path = '/marketing') {
  busyTenantId.value = tenantId
  try {
    await switchContext({
      organizationId: organizationId.value,
      tenantId,
    })
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

/* ---------------------------------- Users --------------------------------- */

const usersOpen = ref(false)
const usersLoading = ref(false)
const usersClient = ref<AgencyClientRow | null>(null)
const tenantUsers = ref<TenantUserRow[]>([])

async function loadTenantUsers(tenantId: string) {
  if (!organizationId.value)
    return
  usersLoading.value = true
  try {
    const response = await $fetch<{ data: TenantUserRow[] }>(
      `/api/organizations/${organizationId.value}/tenants/${tenantId}/users`,
    )
    tenantUsers.value = response.data
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Não foi possível carregar os usuários')
    tenantUsers.value = []
  }
  finally {
    usersLoading.value = false
  }
}

async function openUsers(client: AgencyClientRow) {
  usersClient.value = client
  tenantUsers.value = []
  usersOpen.value = true
  await loadTenantUsers(client.tenant_id)
}

/* --------------------------------- Resend --------------------------------- */

const resendOpen = ref(false)
const resendSaving = ref(false)
const resendClient = ref<AgencyClientRow | null>(null)
const resendEmail = ref('')
const resendName = ref('')
const resendResult = ref<ResendResponse | null>(null)

function openResend(client: AgencyClientRow, email?: string) {
  resendClient.value = client
  resendEmail.value = email || client.client_invite_emails?.[0] || ''
  resendName.value = ''
  resendResult.value = null
  resendOpen.value = true
}

async function submitResend() {
  if (!organizationId.value || !resendClient.value)
    return
  if (!resendEmail.value.trim()) {
    toast.error('Informe o e-mail do cliente')
    return
  }

  resendSaving.value = true
  resendResult.value = null
  try {
    const response = await $fetch<{ data: ResendResponse }>(
      `/api/organizations/${organizationId.value}/tenants/${resendClient.value.tenant_id}/resend-invite`,
      {
        method: 'POST',
        body: {
          email: resendEmail.value.trim(),
          name: resendName.value.trim() || undefined,
        },
      },
    )

    resendResult.value = response.data

    if (response.data.email_sent)
      toast.success(`E-mail de acesso enviado para ${response.data.email}`)
    else
      toast.warning('O e-mail não pôde ser enviado — use o link manual abaixo')

    await refresh()
    if (usersOpen.value && usersClient.value)
      await loadTenantUsers(usersClient.value.tenant_id)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Não foi possível reenviar o convite')
  }
  finally {
    resendSaving.value = false
  }
}

async function copyActionLink() {
  const link = resendResult.value?.action_link
  if (!link)
    return
  try {
    await navigator.clipboard.writeText(link)
    toast.success('Link copiado')
  }
  catch {
    toast.error('Não foi possível copiar. Selecione o texto manualmente.')
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
        <p class="mt-1 text-sm text-muted-foreground">
          Carteira da agência — abra o ambiente, gerencie usuários e reenvie o acesso sem recriar a empresa.
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="pending" @click="refresh()">
          <Loader2 v-if="pending" class="mr-2 size-4 animate-spin" />
          Atualizar
        </Button>
        <Button v-if="canManage" size="sm" @click="navigateTo('/agency/clients/onboarding')">
          Novo cliente
        </Button>
      </div>
    </div>

    <div class="grid gap-3 lg:grid-cols-4 sm:grid-cols-2">
      <Card class="border-border/60">
        <CardContent class="flex items-center gap-3 p-4">
          <div class="size-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 class="size-4" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">
              Empresas
            </p>
            <p class="text-lg font-semibold">
              {{ summary.total }}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card class="border-border/60">
        <CardContent class="flex items-center gap-3 p-4">
          <div class="size-9 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 class="size-4" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">
              Ativas
            </p>
            <p class="text-lg font-semibold">
              {{ summary.active }}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card class="border-border/60">
        <CardContent class="flex items-center gap-3 p-4">
          <div class="size-9 flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <CalendarClock class="size-4" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
            <p class="text-lg font-semibold">
              {{ summary.pendingApproval }}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card class="border-border/60">
        <CardContent class="flex items-center gap-3 p-4">
          <div class="size-9 flex items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle class="size-4" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">
              Falhas recentes
            </p>
            <p class="text-lg font-semibold">
              {{ summary.failures }}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative max-w-sm w-full">
        <Search class="absolute left-3 top-1/2 size-4 text-muted-foreground -translate-y-1/2" />
        <Input v-model="search" class="pl-9" placeholder="Buscar empresa ou e-mail..." />
      </div>
      <Tabs v-model="statusFilter" class="w-full sm:w-auto">
        <TabsList>
          <TabsTrigger value="all">
            Todas
          </TabsTrigger>
          <TabsTrigger value="active">
            Ativas
          </TabsTrigger>
          <TabsTrigger value="attention">
            Atenção
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    <div v-if="showSkeleton" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Skeleton v-for="n in 6" :key="n" class="h-56 rounded-xl" />
    </div>

    <div v-else-if="filtered.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card
        v-for="client in filtered"
        :key="client.link_id"
        class="group flex flex-col border-border/60 transition-shadow hover:shadow-md"
      >
        <CardHeader class="pb-3">
          <div class="flex items-start gap-3">
            <div class="size-11 flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-sm font-semibold">
              <img
                v-if="client.logo_url"
                :src="client.logo_url"
                :alt="client.name"
                class="size-full object-cover"
              >
              <span v-else>{{ initials(client.name) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <CardTitle class="truncate text-base">
                {{ client.name }}
              </CardTitle>
              <CardDescription class="truncate text-xs">
                {{ client.tenant.name }} · desde {{ formatDate(client.started_at) }}
              </CardDescription>
            </div>
            <Badge :variant="client.status === 'active' ? 'secondary' : 'outline'" class="shrink-0">
              {{ client.status === 'active' ? 'Ativa' : 'Inativa' }}
            </Badge>
          </div>
        </CardHeader>

        <CardContent class="flex flex-1 flex-col gap-4">
          <div class="flex flex-wrap gap-1.5">
            <Badge v-for="moduleName in client.modules" :key="moduleName" variant="outline" class="text-[11px]">
              {{ moduleLabel(moduleName) }}
            </Badge>
            <Badge v-if="!client.modules.length" variant="outline" class="text-[11px] text-amber-600">
              Sem módulos
            </Badge>
          </div>

          <dl class="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
            <div>
              <dt class="text-[11px] text-muted-foreground">
                Usuários
              </dt>
              <dd class="text-sm font-semibold" :class="client.client_user_count ? '' : 'text-amber-600'">
                {{ client.client_user_count }}
              </dd>
            </div>
            <div>
              <dt class="text-[11px] text-muted-foreground">
                Agendados
              </dt>
              <dd class="text-sm font-semibold">
                {{ client.posts_scheduled }}
              </dd>
            </div>
            <div>
              <dt class="text-[11px] text-muted-foreground">
                Falhas
              </dt>
              <dd class="text-sm font-semibold" :class="client.recent_failures ? 'text-destructive' : ''">
                {{ client.recent_failures }}
              </dd>
            </div>
          </dl>

          <div class="text-xs text-muted-foreground space-y-1">
            <p class="truncate">
              Responsável: <span class="text-foreground font-medium">{{ client.internal_owner?.email || '—' }}</span>
            </p>
            <p class="truncate">
              Redes: <span class="text-foreground font-medium">
                {{ client.connected_networks.map(n => n.platform).join(', ') || 'nenhuma conectada' }}
              </span>
            </p>
          </div>

          <div class="mt-auto flex flex-wrap gap-2 border-t pt-3">
            <Button size="sm" :disabled="busyTenantId === client.tenant_id" @click="openClient(client.tenant_id)">
              <ExternalLink class="mr-1.5 size-3.5" />
              Abrir
            </Button>
            <Button size="sm" variant="outline" @click="openUsers(client)">
              <Users class="mr-1.5 size-3.5" />
              Usuários
            </Button>
            <Button
              v-if="canManage"
              size="sm"
              variant="outline"
              @click="openResend(client)"
            >
              <MailPlus class="mr-1.5 size-3.5" />
              Reenviar acesso
            </Button>
            <Button
              v-if="canIntegrations"
              size="sm"
              variant="ghost"
              @click="openClient(client.tenant_id, '/settings/integrations')"
            >
              <Plug class="mr-1.5 size-3.5" />
              Integrações
            </Button>
            <Button
              v-if="canManage"
              size="sm"
              variant="ghost"
              class="text-destructive hover:text-destructive"
              :disabled="busyTenantId === client.tenant_id"
              @click="deactivateClient(client)"
            >
              <Power class="mr-1.5 size-3.5" />
              Desativar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card v-else class="border-dashed">
      <CardContent class="flex flex-col items-center gap-2 py-12 text-center">
        <Building2 class="size-8 text-muted-foreground" />
        <p class="text-sm font-medium">
          Nenhuma empresa encontrada
        </p>
        <p class="max-w-sm text-xs text-muted-foreground">
          Ajuste a busca ou os filtros. Se ainda não há clientes, inicie um novo onboarding.
        </p>
        <Button v-if="canManage" size="sm" class="mt-2" @click="navigateTo('/agency/clients/onboarding')">
          Novo cliente
        </Button>
      </CardContent>
    </Card>

    <Sheet :open="usersOpen" @update:open="value => (usersOpen = value)">
      <SheetContent class="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Usuários da empresa</SheetTitle>
          <SheetDescription>
            {{ usersClient?.name }} — acessos vinculados a esta empresa.
            O usuário só aparece como ativo depois de aceitar o convite e criar a senha.
          </SheetDescription>
        </SheetHeader>

        <div class="mt-6 space-y-3">
          <div v-if="usersLoading" class="space-y-2">
            <Skeleton v-for="n in 3" :key="n" class="h-16 rounded-lg" />
          </div>

          <template v-else>
            <div
              v-for="tenantUser in tenantUsers"
              :key="tenantUser.user_id"
              class="flex items-start justify-between gap-3 border rounded-lg p-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">
                  {{ tenantUser.name || tenantUser.email || tenantUser.user_id }}
                </p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ tenantUser.email || 'e-mail indisponível' }} · {{ tenantUser.role }}
                </p>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-1.5">
                <Badge :variant="tenantUser.status === 'active' ? 'secondary' : 'outline'">
                  {{ tenantUser.status === 'active' ? 'Ativo' : 'Convite pendente' }}
                </Badge>
                <Button
                  v-if="canManage && tenantUser.email"
                  size="sm"
                  variant="ghost"
                  class="h-7 px-2 text-xs"
                  @click="usersClient && openResend(usersClient, tenantUser.email!)"
                >
                  Reenviar
                </Button>
              </div>
            </div>

            <div v-if="!tenantUsers.length" class="border rounded-lg border-dashed p-6 text-center">
              <p class="text-sm font-medium">
                Nenhum usuário vinculado
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                Envie um convite para o responsável da empresa acessar o sistema.
              </p>
              <Button
                v-if="canManage && usersClient"
                size="sm"
                class="mt-3"
                @click="openResend(usersClient)"
              >
                Enviar convite
              </Button>
            </div>
          </template>

          <Button
            v-if="usersClient"
            variant="outline"
            size="sm"
            class="w-full"
            :disabled="busyTenantId === usersClient.tenant_id"
            @click="openClient(usersClient.tenant_id, '/settings/team')"
          >
            <ExternalLink class="mr-2 size-3.5" />
            Gerenciar no ambiente do cliente
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    <Dialog :open="resendOpen" @update:open="value => !value && (resendOpen = false)">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reenviar acesso</DialogTitle>
          <DialogDescription>
            Enviamos o e-mail oficial de acesso e também geramos um link para você
            encaminhar manualmente ao cliente, se preferir.
          </DialogDescription>
        </DialogHeader>

        <div class="py-2 space-y-4">
          <div class="space-y-2">
            <Label>E-mail do responsável</Label>
            <Input
              v-model="resendEmail"
              type="email"
              placeholder="cliente@empresa.com"
              list="client-invite-emails"
              :disabled="resendSaving"
            />
            <datalist
              v-if="resendClient?.client_invite_emails?.length"
              id="client-invite-emails"
            >
              <option
                v-for="email in resendClient.client_invite_emails"
                :key="email"
                :value="email"
              />
            </datalist>
          </div>
          <div class="space-y-2">
            <Label>Nome (opcional)</Label>
            <Input
              v-model="resendName"
              placeholder="Nome do responsável"
              :disabled="resendSaving"
            />
          </div>

          <Alert v-if="resendResult" :variant="resendResult.email_sent ? 'default' : 'destructive'">
            <AlertTitle class="text-sm">
              {{ resendResult.email_sent ? 'E-mail enviado' : 'E-mail não enviado' }}
            </AlertTitle>
            <AlertDescription class="text-xs">
              {{
                resendResult.email_sent
                  ? `Enviamos o acesso para ${resendResult.email}.`
                  : 'O provedor de e-mail recusou o envio. Use o link manual abaixo.'
              }}
            </AlertDescription>
          </Alert>

          <div v-if="resendResult?.action_link" class="border rounded-lg bg-muted/30 p-3 space-y-2">
            <p class="text-xs text-muted-foreground">
              Link de acesso direto (uso único, expira em pouco tempo). Envie por WhatsApp ou e-mail.
            </p>
            <Input :model-value="resendResult.action_link" readonly class="text-xs font-mono" />
            <Button type="button" size="sm" variant="secondary" class="w-full" @click="copyActionLink">
              <Copy class="mr-2 size-3.5" />
              Copiar link
            </Button>
          </div>

          <p v-else-if="resendResult?.link_error" class="text-xs text-muted-foreground">
            Não foi possível gerar o link manual ({{ resendResult.link_error }}).
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="resendSaving" @click="resendOpen = false">
            {{ resendResult ? 'Fechar' : 'Cancelar' }}
          </Button>
          <Button :disabled="resendSaving" @click="submitResend">
            <Loader2 v-if="resendSaving" class="mr-2 size-4 animate-spin" />
            {{ resendResult ? 'Enviar novamente' : 'Enviar acesso' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
