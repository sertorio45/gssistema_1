<script setup lang="ts">
import GoogleAdsBrandIcon from '@/components/brand/GoogleAdsBrandIcon.vue'
import GoogleAnalyticsBrandIcon from '@/components/brand/GoogleAnalyticsBrandIcon.vue'
import MetaBrandIcon from '@/components/brand/MetaBrandIcon.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Integrações do Dashboard',
})

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

const { data: integrations, refresh, pending } = await useAsyncData(
  () => `dashboard-integrations-${tenantId.value}`,
  async () => {
    const response = await $fetch<{ data: any[] }>('/api/dashboard/integrations', {
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

async function connectProvider(provider: 'google_ads' | 'google_analytics' | 'meta') {
  oauthLoading.value = provider
  lastError.value = ''
  try {
    const response = await $fetch<{ redirectTo: string }>(`/api/dashboard/oauth/${provider}/start`, {
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

async function loadAccounts(provider: 'google_ads' | 'google_analytics' | 'meta') {
  accountsLoading.value = provider
  lastError.value = ''
  try {
    const response = await $fetch<{ data: Array<{ id: string, name: string }> }>('/api/dashboard/oauth/accounts', {
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
  await $fetch('/api/dashboard/integrations', {
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
  await $fetch('/api/dashboard/integrations', {
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
  await $fetch('/api/dashboard/integrations', {
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

async function disconnectProvider(provider: 'google_ads' | 'google_analytics' | 'meta') {
  actionLoading.value = `disconnect:${provider}`
  try {
    await $fetch('/api/dashboard/integrations', {
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
  <div class="w-full flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold">
        Integrações
      </h1>
      <p class="text-muted-foreground">
        Conecte automaticamente as plataformas e selecione as contas. Todas as chaves ficam apenas no backend.
      </p>
    </div>

    <Alert v-if="lastError" variant="destructive">
      <Icon name="lucide:triangle-alert" class="h-4 w-4" />
      <AlertTitle>Falha na integração</AlertTitle>
      <AlertDescription>{{ lastError }}</AlertDescription>
    </Alert>

    <div class="grid gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <GoogleAdsBrandIcon />
            Google Ads
          </CardTitle>
          <CardDescription>Conexão automática com OAuth para campanhas.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <Button class="w-full" :disabled="oauthLoading === 'google_ads'" @click="connectProvider('google_ads')">
            <Icon name="lucide:link" class="mr-2 h-4 w-4" />
            {{ oauthLoading === 'google_ads' ? 'Conectando...' : 'Conectar Google Ads' }}
          </Button>
          <Button variant="outline" class="w-full" :disabled="accountsLoading === 'google_ads'" @click="loadAccounts('google_ads')">
            <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
            Carregar contas
          </Button>
          <Select v-model="selectedGoogleAds">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Selecione a conta de anúncios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="account in googleAdsAccounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="developerToken" placeholder="Developer token do Google Ads" />
          <Input v-model="loginCustomerId" placeholder="Login Customer ID (opcional)" />
          <div class="grid grid-cols-2 gap-2">
            <Button class="w-full" :disabled="pending || !selectedGoogleAds || actionLoading === 'google_ads'" @click="saveGoogleAdsAccount">
              Salvar seleção
            </Button>
            <Button
              variant="outline"
              class="w-full"
              :disabled="actionLoading === 'disconnect:google_ads' || !isConnected('google_ads')"
              @click="disconnectProvider('google_ads')"
            >
              Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <GoogleAnalyticsBrandIcon />
            Google Analytics
          </CardTitle>
          <CardDescription>Login e seleção de conta de Analytics.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <Button class="w-full" :disabled="oauthLoading === 'google_analytics'" @click="connectProvider('google_analytics')">
            <Icon name="lucide:link" class="mr-2 h-4 w-4" />
            {{ oauthLoading === 'google_analytics' ? 'Conectando...' : 'Conectar Google Analytics' }}
          </Button>
          <Button variant="outline" class="w-full" :disabled="accountsLoading === 'google_analytics'" @click="loadAccounts('google_analytics')">
            <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
            Carregar contas
          </Button>
          <Select v-model="selectedGoogleAnalytics">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Selecione a conta do Analytics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="account in googleAnalyticsAccounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <div class="grid grid-cols-2 gap-2">
            <Button class="w-full" :disabled="pending || !selectedGoogleAnalytics || actionLoading === 'google_analytics'" @click="saveGoogleAnalyticsAccount">
              Salvar seleção
            </Button>
            <Button
              variant="outline"
              class="w-full"
              :disabled="actionLoading === 'disconnect:google_analytics' || !isConnected('google_analytics')"
              @click="disconnectProvider('google_analytics')"
            >
              Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <span class="text-[#0866FF]">
              <MetaBrandIcon size="md" />
            </span>
            Meta Ads
          </CardTitle>
          <CardDescription>Conexão automática e seleção da conta de anúncios.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <Button class="w-full" :disabled="oauthLoading === 'meta'" @click="connectProvider('meta')">
            <Icon name="lucide:link" class="mr-2 h-4 w-4" />
            {{ oauthLoading === 'meta' ? 'Conectando...' : 'Conectar Meta' }}
          </Button>
          <Button variant="outline" class="w-full" :disabled="accountsLoading === 'meta'" @click="loadAccounts('meta')">
            <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
            Carregar contas
          </Button>
          <Select v-model="selectedMetaAds">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Selecione a conta de anúncios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="account in metaAccounts" :key="account.id" :value="account.id">
                {{ account.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <div class="grid grid-cols-2 gap-2">
            <Button class="w-full" :disabled="pending || !selectedMetaAds || actionLoading === 'meta'" @click="saveMetaAccount">
              Salvar seleção
            </Button>
            <Button
              variant="outline"
              class="w-full"
              :disabled="actionLoading === 'disconnect:meta' || !isConnected('meta')"
              @click="disconnectProvider('meta')"
            >
              Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Status atual</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-2">
          <div v-for="row in integrations" :key="row.id" class="flex items-center justify-between rounded border p-3">
            <div>
              <p class="font-medium capitalize">
                {{ row.provider }}
              </p>
              <p class="text-xs text-muted-foreground">
                Última atualização: {{ row.updated_at || '-' }}
              </p>
            </div>
            <Badge :variant="isConnected(row.provider) ? 'default' : 'secondary'">
              {{ row.has_key ? `Conectado (${row.masked_key})` : 'Sem conexão' }}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
