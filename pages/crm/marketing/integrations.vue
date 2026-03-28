<script setup lang="ts">
import GoogleAdsBrandIcon from '@/components/brand/GoogleAdsBrandIcon.vue'
import GoogleAnalyticsBrandIcon from '@/components/brand/GoogleAnalyticsBrandIcon.vue'
import MetaBrandIcon from '@/components/brand/MetaBrandIcon.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Integrações de marketing',
})

type Provider = 'google_ads' | 'google_analytics' | 'meta'

const { tenantId } = useTenant()
const route = useRoute()
const oauthLoading = ref<string | null>(null)
const accountsLoading = ref<string | null>(null)
const actionLoading = ref<string | null>(null)
const lastError = ref('')
const developerToken = ref('')
const loginCustomerId = ref('')
const selectedGoogleAds = ref('')
const selectedGoogleAnalytics = ref('')
const selectedMetaAds = ref('')
const googleAdsAccounts = ref<Array<{ id: string, name: string }>>([])
const googleAnalyticsAccounts = ref<Array<{ id: string, name: string, account_id?: string }>>([])
const metaAccounts = ref<Array<{ id: string, name: string }>>([])

const editDialogOpen = ref(false)
const editProvider = ref<Provider | null>(null)

const { data: integrations, refresh, pending } = await useAsyncData(
  () => `marketing-integrations-${tenantId.value}`,
  async () => {
    const response = await $fetch<{ data: any[] }>('/api/marketing/integrations', {
      query: {
        tenant_id: tenantId.value || undefined,
      },
    })
    return response.data || []
  },
  { watch: [tenantId] },
)

const connectedProviders = computed(() => new Set((integrations.value || []).map((i: any) => i.provider)))

function isConnected(provider: string) {
  return connectedProviders.value.has(provider)
}

function rowFor(provider: Provider) {
  return integrations.value?.find((r: any) => r.provider === provider)
}

function displayAccountLabel(provider: Provider): string {
  const row = rowFor(provider)
  if (!row?.has_key)
    return '—'
  const c = row.config || {}
  if (provider === 'google_ads') {
    const id = c.customer_id ? String(c.customer_id) : ''
    if (!id)
      return 'Selecione a conta em editar'
    const acc = googleAdsAccounts.value.find(a => String(a.id) === id)
    return acc?.name || id
  }
  if (provider === 'google_analytics') {
    const id = String(c.property_id || c.analytics_account_id || '')
    if (!id)
      return 'Selecione a conta em editar'
    const acc = googleAnalyticsAccounts.value.find(a => String(a.id) === id)
    return acc?.name || id
  }
  if (provider === 'meta') {
    const id = c.ad_account_id ? String(c.ad_account_id) : ''
    if (!id)
      return 'Selecione a conta em editar'
    const acc = metaAccounts.value.find(a => String(a.id) === id)
    return acc?.name || id
  }
  return '—'
}

watch(
  () => integrations.value,
  (rows) => {
    if (!rows?.length)
      return
    for (const row of rows) {
      const c = row.config || {}
      if (row.provider === 'google_ads' && c.customer_id)
        selectedGoogleAds.value = String(c.customer_id)
      if (row.provider === 'google_analytics') {
        const pid = c.property_id || c.analytics_account_id
        if (pid)
          selectedGoogleAnalytics.value = String(pid)
      }
      if (row.provider === 'meta' && c.ad_account_id)
        selectedMetaAds.value = String(c.ad_account_id)
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => integrations.value,
  async (rows) => {
    if (!rows?.length || !import.meta.client)
      return
    for (const r of rows) {
      if (!r.has_key)
        continue
      const p = r.provider as Provider
      if (p === 'google_ads' || p === 'google_analytics' || p === 'meta')
        await loadAccounts(p)
    }
  },
  { immediate: true },
)

async function connectProvider(provider: Provider) {
  oauthLoading.value = provider
  lastError.value = ''
  try {
    const response = await $fetch<{ redirectTo: string }>(`/api/marketing/oauth/${provider}/start`, {
      query: {
        tenant_id: tenantId.value || undefined,
      },
    })
    if (!response?.redirectTo)
      return
    if (import.meta.client)
      window.location.assign(response.redirectTo)
  }
  catch (error: any) {
    lastError.value = error?.data?.statusMessage || error?.message || 'Erro ao iniciar OAuth'
  }
  finally {
    oauthLoading.value = null
  }
}

async function loadAccounts(provider: Provider) {
  accountsLoading.value = provider
  lastError.value = ''
  try {
    const response = await $fetch<{ data: Array<{ id: string, name: string }> }>('/api/marketing/oauth/accounts', {
      query: {
        provider,
        tenant_id: tenantId.value || undefined,
      },
    })
    if (provider === 'google_ads')
      googleAdsAccounts.value = response.data || []
    if (provider === 'google_analytics')
      googleAnalyticsAccounts.value = response.data || []
    if (provider === 'meta')
      metaAccounts.value = response.data || []
  }
  catch (error: any) {
    lastError.value = error?.data?.statusMessage || error?.message || 'Erro ao carregar contas'
  }
  finally {
    accountsLoading.value = null
  }
}

async function saveGoogleAdsAccount() {
  actionLoading.value = 'google_ads'
  await $fetch('/api/marketing/integrations', {
    method: 'POST',
    body: {
      tenant_id: tenantId.value || undefined,
      provider: 'google_ads',
      config: {
        customer_id: selectedGoogleAds.value,
        login_customer_id: loginCustomerId.value || undefined,
        developer_token: developerToken.value || undefined,
      },
      is_active: true,
    },
  })
  await refresh()
  actionLoading.value = null
}

async function saveGoogleAnalyticsAccount() {
  actionLoading.value = 'google_analytics'
  await $fetch('/api/marketing/integrations', {
    method: 'POST',
    body: {
      tenant_id: tenantId.value || undefined,
      provider: 'google_analytics',
      config: {
        analytics_account_id: selectedGoogleAnalytics.value,
        property_id: selectedGoogleAnalytics.value,
      },
      is_active: true,
    },
  })
  await refresh()
  actionLoading.value = null
}

async function saveMetaAccount() {
  actionLoading.value = 'meta'
  await $fetch('/api/marketing/integrations', {
    method: 'POST',
    body: {
      tenant_id: tenantId.value || undefined,
      provider: 'meta',
      config: {
        ad_account_id: selectedMetaAds.value,
      },
      is_active: true,
    },
  })
  await refresh()
  actionLoading.value = null
}

async function disconnectProvider(provider: Provider) {
  actionLoading.value = `disconnect:${provider}`
  try {
    await $fetch('/api/marketing/integrations', {
      method: 'DELETE',
      body: {
        tenant_id: tenantId.value || undefined,
        provider,
      },
    })
    await refresh()
  }
  finally {
    actionLoading.value = null
  }
}

function openEdit(provider: Provider) {
  editProvider.value = provider
  editDialogOpen.value = true
  loadAccounts(provider)
}

async function saveFromDialog() {
  const p = editProvider.value
  if (!p)
    return
  if (p === 'google_ads')
    await saveGoogleAdsAccount()
  else if (p === 'google_analytics')
    await saveGoogleAnalyticsAccount()
  else if (p === 'meta')
    await saveMetaAccount()
  editDialogOpen.value = false
}

async function primaryAction(provider: Provider) {
  if (isConnected(provider)) {
    await disconnectProvider(provider)
    return
  }
  await connectProvider(provider)
}

function primaryButtonLabel(provider: Provider) {
  if (oauthLoading.value === provider)
    return 'Conectando...'
  if (actionLoading.value === `disconnect:${provider}`)
    return 'Desconectando...'
  return isConnected(provider) ? 'Desconectar' : 'Conectar conta'
}

function primaryDisabled(provider: Provider) {
  if (oauthLoading.value)
    return true
  if (actionLoading.value === `disconnect:${provider}`)
    return true
  return false
}

watch(
  () => route.query.oauth,
  async (oauthStatus) => {
    if (oauthStatus === 'success') {
      await refresh()
    }
    if (oauthStatus === 'error') {
      lastError.value = String(route.query.message || 'Falha na autenticação OAuth')
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="w-full flex flex-col gap-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Integrações
      </h1>
      <p class="mt-1 max-w-3xl text-muted-foreground">
        Conecte anúncios, redes sociais e canais de mensagem. As credenciais ficam apenas no servidor.
      </p>
    </div>

    <Alert v-if="lastError" variant="destructive">
      <Icon name="lucide:triangle-alert" class="h-4 w-4" />
      <AlertTitle>Falha na integração</AlertTitle>
      <AlertDescription>{{ lastError }}</AlertDescription>
    </Alert>

    <!-- Anúncios e analytics -->
    <section class="space-y-4">
      <div class="border-b border-border/60 pb-1">
        <h2 class="text-lg font-semibold tracking-tight text-foreground">
          Anúncios e analytics
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Google Ads, Google Analytics e conta de anúncios Meta.
        </p>
      </div>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Google Ads -->
      <Card class="relative overflow-hidden rounded-2xl border bg-card shadow-md">
        <Button
          variant="ghost"
          size="icon"
          class="absolute right-2 top-2 z-10 h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Editar integração Google Ads"
          @click="openEdit('google_ads')"
        >
          <Icon name="lucide:square-pen" class="h-4 w-4" />
        </Button>
        <CardContent class="flex flex-col items-center px-6 pb-8 pt-10 text-center">
          <div class="flex h-14 w-14 items-center justify-center">
            <GoogleAdsBrandIcon size="lg" />
          </div>
          <h2 class="mt-4 text-lg font-semibold text-foreground">
            Google Ads
          </h2>
          <Button
            class="mt-6 w-full max-w-[240px] rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
            :disabled="primaryDisabled('google_ads')"
            @click="primaryAction('google_ads')"
          >
            {{ primaryButtonLabel('google_ads') }}
          </Button>
          <p class="mt-4 max-w-[240px] truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {{ displayAccountLabel('google_ads') }}
          </p>
          <div
            v-if="isConnected('google_ads')"
            class="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Conectado</span>
          </div>
        </CardContent>
      </Card>

      <!-- Google Analytics -->
      <Card class="relative overflow-hidden rounded-2xl border bg-card shadow-md">
        <Button
          variant="ghost"
          size="icon"
          class="absolute right-2 top-2 z-10 h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Editar integração Google Analytics"
          @click="openEdit('google_analytics')"
        >
          <Icon name="lucide:square-pen" class="h-4 w-4" />
        </Button>
        <CardContent class="flex flex-col items-center px-6 pb-8 pt-10 text-center">
          <div class="flex h-14 w-14 items-center justify-center">
            <GoogleAnalyticsBrandIcon size="lg" />
          </div>
          <h2 class="mt-4 text-lg font-semibold text-foreground">
            Google Analytics
          </h2>
          <Button
            class="mt-6 w-full max-w-[240px] rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
            :disabled="primaryDisabled('google_analytics')"
            @click="primaryAction('google_analytics')"
          >
            {{ primaryButtonLabel('google_analytics') }}
          </Button>
          <p class="mt-4 max-w-[240px] truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {{ displayAccountLabel('google_analytics') }}
          </p>
          <div
            v-if="isConnected('google_analytics')"
            class="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Conectado</span>
          </div>
        </CardContent>
      </Card>

      <!-- Meta Ads -->
      <Card class="relative overflow-hidden rounded-2xl border bg-card shadow-md">
        <Button
          variant="ghost"
          size="icon"
          class="absolute right-2 top-2 z-10 h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Editar integração Meta Ads"
          @click="openEdit('meta')"
        >
          <Icon name="lucide:square-pen" class="h-4 w-4" />
        </Button>
        <CardContent class="flex flex-col items-center px-6 pb-8 pt-10 text-center">
          <div class="flex h-14 w-14 items-center justify-center text-[#0866FF]">
            <MetaBrandIcon size="lg" />
          </div>
          <h2 class="mt-4 text-lg font-semibold text-foreground">
            Meta Ads
          </h2>
          <Button
            class="mt-6 w-full max-w-[240px] rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
            :disabled="primaryDisabled('meta')"
            @click="primaryAction('meta')"
          >
            {{ primaryButtonLabel('meta') }}
          </Button>
          <p class="mt-4 max-w-[240px] truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {{ displayAccountLabel('meta') }}
          </p>
          <div
            v-if="isConnected('meta')"
            class="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Conectado</span>
          </div>
        </CardContent>
      </Card>
      </div>
    </section>

    <!-- Social media -->
    <section class="space-y-4">
      <div class="border-b border-border/60 pb-1">
        <h2 class="text-lg font-semibold tracking-tight text-foreground">
          Social media
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          LinkedIn, Facebook e perfil comercial no Instagram.
        </p>
      </div>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <IntegrationSoonCard
          title="LinkedIn"
          icon="lucide:linkedin"
          icon-class="text-[#0A66C2]"
        />
        <IntegrationSoonCard
          title="Facebook"
          icon="lucide:facebook"
          icon-class="text-[#1877F2]"
        />
        <IntegrationSoonCard
          title="Instagram Business"
          icon="lucide:instagram"
          icon-class="text-pink-600 dark:text-pink-400"
        />
      </div>
    </section>

    <!-- Mensagens -->
    <section class="space-y-4">
      <div class="border-b border-border/60 pb-1">
        <h2 class="text-lg font-semibold tracking-tight text-foreground">
          Mensagens
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          WhatsApp Cloud API / Business e integrações por sessão (não oficial).
        </p>
      </div>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <IntegrationSoonCard
          title="WhatsApp oficial"
          icon="lucide:badge-check"
          icon-class="text-emerald-600 dark:text-emerald-400"
        />
        <IntegrationSoonCard
          title="WhatsApp não oficial"
          icon="lucide:smartphone"
          icon-class="text-emerald-600 dark:text-emerald-400"
        />
      </div>
    </section>

    <!-- Dialog: campos extras (conta, tokens, etc.) -->
    <Dialog v-model:open="editDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle v-if="editProvider === 'google_ads'">
            Google Ads — detalhes
          </DialogTitle>
          <DialogTitle v-else-if="editProvider === 'google_analytics'">
            Google Analytics — detalhes
          </DialogTitle>
          <DialogTitle v-else-if="editProvider === 'meta'">
            Meta Ads — detalhes
          </DialogTitle>
          <DialogDescription>
            Carregue as contas, selecione a desejada e salve. Campos sensíveis não são exibidos após salvar.
          </DialogDescription>
        </DialogHeader>

        <div v-if="editProvider === 'google_ads'" class="space-y-3 py-2">
          <Button
            variant="outline"
            class="w-full"
            :disabled="accountsLoading === 'google_ads'"
            @click="loadAccounts('google_ads')"
          >
            <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
            {{ accountsLoading === 'google_ads' ? 'Carregando...' : 'Carregar contas' }}
          </Button>
          <div class="space-y-2">
            <Label>Conta de anúncios</Label>
            <Select v-model="selectedGoogleAds">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="account in googleAdsAccounts" :key="account.id" :value="account.id">
                  {{ account.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Token de desenvolvedor</Label>
            <Input v-model="developerToken" placeholder="Token de desenvolvedor do Google Ads" autocomplete="off" />
          </div>
          <div class="space-y-2">
            <Label>ID de cliente de login (opcional)</Label>
            <Input v-model="loginCustomerId" placeholder="MCC / ID de cliente de login" autocomplete="off" />
          </div>
        </div>

        <div v-else-if="editProvider === 'google_analytics'" class="space-y-3 py-2">
          <Button
            variant="outline"
            class="w-full"
            :disabled="accountsLoading === 'google_analytics'"
            @click="loadAccounts('google_analytics')"
          >
            <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
            {{ accountsLoading === 'google_analytics' ? 'Carregando...' : 'Carregar contas' }}
          </Button>
          <div class="space-y-2">
            <Label>Conta / propriedade</Label>
            <Select v-model="selectedGoogleAnalytics">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="account in googleAnalyticsAccounts" :key="account.id" :value="account.id">
                  {{ account.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div v-else-if="editProvider === 'meta'" class="space-y-3 py-2">
          <Button
            variant="outline"
            class="w-full"
            :disabled="accountsLoading === 'meta'"
            @click="loadAccounts('meta')"
          >
            <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
            {{ accountsLoading === 'meta' ? 'Carregando...' : 'Carregar contas' }}
          </Button>
          <div class="space-y-2">
            <Label>Conta de anúncios</Label>
            <Select v-model="selectedMetaAds">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="account in metaAccounts" :key="account.id" :value="account.id">
                  {{ account.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" @click="editDialogOpen = false">
            Fechar
          </Button>
          <Button
            :disabled="pending || actionLoading === editProvider || (editProvider === 'google_ads' && !selectedGoogleAds) || (editProvider === 'google_analytics' && !selectedGoogleAnalytics) || (editProvider === 'meta' && !selectedMetaAds)"
            @click="saveFromDialog"
          >
            <Icon name="lucide:save" class="mr-2 h-4 w-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
