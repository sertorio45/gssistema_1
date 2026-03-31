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
const selectedMetaAdAccount = ref('')
const selectedMetaPage = ref('')
const selectedMetaPixel = ref('')
const selectedMetaInstagram = ref('')
const googleAdsAccounts = ref<Array<{ id: string, name: string }>>([])
const googleAnalyticsAccounts = ref<Array<{ id: string, name: string, account_id?: string }>>([])
const metaAccounts = ref<Array<{ id: string, name: string }>>([])
const metaPages = ref<Array<{ id: string, name: string }>>([])
const metaPixels = ref<Array<{ id: string, name: string }>>([])
const metaInstagramAccounts = ref<Array<{ id: string, name: string }>>([])

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
    if (!c.ad_account_id)
      return 'Selecione em editar'
    const adId = String(c.ad_account_id)
    const adName = metaAccounts.value.find(a => String(a.id) === adId)?.name || adId
    const parts: string[] = [adName]
    if (c.page_id) {
      const pn = metaPages.value.find(p => String(p.id) === String(c.page_id))?.name
      parts.push(pn || `Página ${c.page_id}`)
    }
    if (c.pixel_id)
      parts.push(metaPixels.value.find(p => String(p.id) === String(c.pixel_id))?.name || `Pixel ${c.pixel_id}`)
    if (c.instagram_business_account_id) {
      const ig = metaInstagramAccounts.value.find(i => String(i.id) === String(c.instagram_business_account_id))
      parts.push(ig?.name || `IG ${c.instagram_business_account_id}`)
    }
    return parts.join(' · ')
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
      if (row.provider === 'meta') {
        if (c.ad_account_id)
          selectedMetaAdAccount.value = String(c.ad_account_id)
        if (c.page_id)
          selectedMetaPage.value = String(c.page_id)
        if (c.pixel_id)
          selectedMetaPixel.value = String(c.pixel_id)
        if (c.instagram_business_account_id)
          selectedMetaInstagram.value = String(c.instagram_business_account_id)
      }
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
      if (p === 'google_ads' || p === 'google_analytics')
        await loadAccounts(p)
      if (p === 'meta') {
        await loadAccounts('meta')
        await loadMetaAuxiliaryListsForCard()
      }
    }
  },
  { immediate: true },
)

async function refreshMetaInstagramList() {
  const tid = tenantId.value || undefined
  if (!selectedMetaAdAccount.value && !selectedMetaPage.value) {
    metaInstagramAccounts.value = []
    return
  }
  const q: Record<string, string | undefined> = {
    provider: 'meta',
    resource: 'instagram',
    tenant_id: tid,
  }
  if (selectedMetaAdAccount.value)
    q.ad_account_id = selectedMetaAdAccount.value
  if (selectedMetaPage.value)
    q.page_id = selectedMetaPage.value
  const ig = await $fetch<{ data: Array<{ id: string, name: string }> }>('/api/marketing/oauth/accounts', {
    query: q,
  })
  metaInstagramAccounts.value = ig.data || []
}

/** Load pages / pixels / IG names for summary line when integration already configured */
async function loadMetaAuxiliaryListsForCard() {
  if (!isConnected('meta'))
    return
  const tid = tenantId.value || undefined
  try {
    const [pages, pixels] = await Promise.all([
      $fetch<{ data: Array<{ id: string, name: string }> }>('/api/marketing/oauth/accounts', {
        query: { provider: 'meta', resource: 'pages', tenant_id: tid },
      }),
      selectedMetaAdAccount.value
        ? $fetch<{ data: Array<{ id: string, name: string }> }>('/api/marketing/oauth/accounts', {
            query: {
              provider: 'meta',
              resource: 'pixels',
              ad_account_id: selectedMetaAdAccount.value,
              tenant_id: tid,
            },
          })
        : Promise.resolve({ data: [] }),
    ])
    metaPages.value = pages.data || []
    metaPixels.value = pixels.data || []
    await refreshMetaInstagramList()
  }
  catch {
    /* non-blocking for card label */
  }
}

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

async function loadMetaIntegrationLists() {
  accountsLoading.value = 'meta'
  lastError.value = ''
  const tid = tenantId.value || undefined
  try {
    const [ads, pages] = await Promise.all([
      $fetch<{ data: Array<{ id: string, name: string }> }>('/api/marketing/oauth/accounts', {
        query: { provider: 'meta', resource: 'ad_accounts', tenant_id: tid },
      }),
      $fetch<{ data: Array<{ id: string, name: string }> }>('/api/marketing/oauth/accounts', {
        query: { provider: 'meta', resource: 'pages', tenant_id: tid },
      }),
    ])
    metaAccounts.value = ads.data || []
    metaPages.value = pages.data || []

    if (selectedMetaAdAccount.value) {
      const px = await $fetch<{ data: Array<{ id: string, name: string }> }>('/api/marketing/oauth/accounts', {
        query: {
          provider: 'meta',
          resource: 'pixels',
          ad_account_id: selectedMetaAdAccount.value,
          tenant_id: tid,
        },
      })
      metaPixels.value = px.data || []
      if (selectedMetaPixel.value && !metaPixels.value.some(p => p.id === selectedMetaPixel.value))
        selectedMetaPixel.value = ''
      if (!selectedMetaPixel.value && metaPixels.value.length === 1)
        selectedMetaPixel.value = metaPixels.value[0].id
    }
    else {
      metaPixels.value = []
      selectedMetaPixel.value = ''
    }

    await refreshMetaInstagramList()
    if (selectedMetaInstagram.value && !metaInstagramAccounts.value.some(i => i.id === selectedMetaInstagram.value))
      selectedMetaInstagram.value = ''
    if (!selectedMetaInstagram.value && metaInstagramAccounts.value.length === 1)
      selectedMetaInstagram.value = metaInstagramAccounts.value[0].id
  }
  catch (error: any) {
    lastError.value = error?.data?.statusMessage || error?.message || 'Erro ao carregar dados Meta'
  }
  finally {
    accountsLoading.value = null
  }
}

async function onMetaAdAccountPicked(value: string) {
  selectedMetaAdAccount.value = value
  selectedMetaPixel.value = ''
  metaPixels.value = []
  accountsLoading.value = 'meta'
  const tid = tenantId.value || undefined
  try {
    if (!value) {
      await refreshMetaInstagramList()
      return
    }
    const px = await $fetch<{ data: Array<{ id: string, name: string }> }>('/api/marketing/oauth/accounts', {
      query: {
        provider: 'meta',
        resource: 'pixels',
        ad_account_id: value,
        tenant_id: tid,
      },
    })
    metaPixels.value = px.data || []
    if (metaPixels.value.length === 1)
      selectedMetaPixel.value = metaPixels.value[0].id
    await refreshMetaInstagramList()
    if (selectedMetaInstagram.value && !metaInstagramAccounts.value.some(i => i.id === selectedMetaInstagram.value))
      selectedMetaInstagram.value = ''
    if (!selectedMetaInstagram.value && metaInstagramAccounts.value.length === 1)
      selectedMetaInstagram.value = metaInstagramAccounts.value[0].id
  }
  catch (error: any) {
    lastError.value = error?.data?.statusMessage || error?.message || 'Erro ao carregar pixels'
  }
  finally {
    accountsLoading.value = null
  }
}

async function onMetaPagePicked(value: string) {
  selectedMetaPage.value = value
  selectedMetaInstagram.value = ''
  metaInstagramAccounts.value = []
  accountsLoading.value = 'meta'
  try {
    await refreshMetaInstagramList()
    if (metaInstagramAccounts.value.length === 1)
      selectedMetaInstagram.value = metaInstagramAccounts.value[0].id
  }
  catch (error: any) {
    lastError.value = error?.data?.statusMessage || error?.message || 'Erro ao carregar Instagram'
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
        ad_account_id: selectedMetaAdAccount.value,
        page_id: selectedMetaPage.value,
        pixel_id: selectedMetaPixel.value,
        instagram_business_account_id: selectedMetaInstagram.value,
      },
      is_active: true,
    },
  })
  await refresh()
  await loadMetaAuxiliaryListsForCard()
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
  if (provider === 'meta')
    loadMetaIntegrationLists()
  else
    loadAccounts(provider)
}

const dialogSaveDisabled = computed(() => {
  if (pending.value || actionLoading.value === editProvider.value)
    return true
  const p = editProvider.value
  if (!p)
    return true
  if (p === 'google_ads')
    return !selectedGoogleAds.value
  if (p === 'google_analytics')
    return !selectedGoogleAnalytics.value
  return false
})

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
        Conecte Google Ads, Google Analytics e Meta (Facebook e Instagram) com um único OAuth por provedor. As credenciais ficam apenas no servidor.
      </p>
    </div>

    <Alert v-if="lastError" variant="destructive">
      <Icon name="lucide:triangle-alert" class="h-4 w-4" />
      <AlertTitle>Falha na integração</AlertTitle>
      <AlertDescription>{{ lastError }}</AlertDescription>
    </Alert>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Google Ads -->
      <Card class="relative overflow-hidden rounded-2xl border bg-card shadow-md">
        <Button
          variant="ghost"
          size="icon"
          class="absolute right-2 top-2 z-10 h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Edit Google Ads integration"
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
          aria-label="Edit Google Analytics integration"
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

      <!-- Meta -->
      <Card class="relative overflow-hidden rounded-2xl border bg-card shadow-md">
        <Button
          variant="ghost"
          size="icon"
          class="absolute right-2 top-2 z-10 h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Edit Meta integration"
          @click="openEdit('meta')"
        >
          <Icon name="lucide:square-pen" class="h-4 w-4" />
        </Button>
        <CardContent class="flex flex-col items-center px-6 pb-8 pt-10 text-center">
          <div class="flex h-14 w-14 items-center justify-center text-[#0866FF]">
            <MetaBrandIcon size="lg" />
          </div>
          <h2 class="mt-4 text-lg font-semibold text-foreground">
            Meta
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Facebook &amp; Instagram
          </p>
          <Button
            class="mt-6 w-full max-w-[240px] rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
            :disabled="primaryDisabled('meta')"
            @click="primaryAction('meta')"
          >
            {{ primaryButtonLabel('meta') }}
          </Button>
          <p class="mt-4 line-clamp-2 max-w-[260px] text-xs font-medium uppercase tracking-wide text-muted-foreground">
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

    <Dialog v-model:open="editDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle v-if="editProvider === 'google_ads'">
            Google Ads — detalhes
          </DialogTitle>
          <DialogTitle v-else-if="editProvider === 'google_analytics'">
            Google Analytics — detalhes
          </DialogTitle>
          <DialogTitle v-else-if="editProvider === 'meta'">
            Meta — detalhes
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

        <div v-else-if="editProvider === 'meta'" class="max-h-[70vh] space-y-3 overflow-y-auto py-2">
          <Button
            variant="outline"
            class="w-full"
            :disabled="accountsLoading === 'meta'"
            @click="loadMetaIntegrationLists"
          >
            <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
            {{ accountsLoading === 'meta' ? 'Carregando...' : 'Recarregar listas' }}
          </Button>
          <div class="space-y-2">
            <Label>Conta de anúncios</Label>
            <Select
              :model-value="selectedMetaAdAccount"
              @update:model-value="onMetaAdAccountPicked($event)"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Selecione a conta de anúncios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="account in metaAccounts" :key="account.id" :value="account.id">
                  {{ account.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Página (Facebook)</Label>
            <Select
              :model-value="selectedMetaPage"
              @update:model-value="onMetaPagePicked($event)"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Selecione a página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="page in metaPages" :key="page.id" :value="page.id">
                  {{ page.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Pixel</Label>
            <Select v-model="selectedMetaPixel" :disabled="!selectedMetaAdAccount">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Opcional — selecione o pixel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="px in metaPixels" :key="px.id" :value="px.id">
                  {{ px.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="selectedMetaAdAccount && !metaPixels.length" class="text-xs text-muted-foreground">
              Nenhum pixel nesta conta de anúncios (pode guardar na mesma).
            </p>
          </div>
          <div class="space-y-2">
            <Label>Instagram</Label>
            <Select
              v-model="selectedMetaInstagram"
              :disabled="!selectedMetaAdAccount && !selectedMetaPage"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Opcional — conta Business" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="ig in metaInstagramAccounts" :key="ig.id" :value="ig.id">
                  {{ ig.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Lista junta contas ligadas à <span class="font-medium">conta de anúncios</span> e à <span class="font-medium">página</span> (quando aplicável).
            </p>
            <p
              v-if="(selectedMetaAdAccount || selectedMetaPage) && !metaInstagramAccounts.length && accountsLoading !== 'meta'"
              class="text-xs text-muted-foreground"
            >
              Nenhuma conta Instagram encontrada por estes critérios (pode guardar na mesma).
            </p>
          </div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" @click="editDialogOpen = false">
            Fechar
          </Button>
          <Button
            :disabled="dialogSaveDisabled"
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
