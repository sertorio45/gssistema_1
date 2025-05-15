<template>
  <div class="flex flex-col gap-4">
    <!-- Cabeçalho -->
    <div class="flex flex-col md:flex-row justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('Platform Integrations') }}</h1>
        <p class="text-muted-foreground">
          {{ $t('Connect your store with external e-commerce platforms') }}
        </p>
      </div>
    </div>

    <!-- Cards de Integração -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="platform in platforms" :key="platform.id" class="overflow-hidden">
        <CardHeader class="pb-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <component :is="platform.icon" class="h-5 w-5" />
              <CardTitle>{{ platform.name }}</CardTitle>
            </div>
            <Badge 
              :variant="getIntegrationStatus(platform.id).variant" 
              class="capitalize"
            >
              {{ $t(getIntegrationStatus(platform.id).label) }}
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="pt-4">
          <p class="text-sm text-muted-foreground mb-4">{{ platform.description }}</p>
          
          <div v-if="getIntegrationStatus(platform.id).connected">
            <div class="grid gap-3 pb-4">
              <div>
                <Label>{{ $t('Store URL') }}</Label>
                <div class="flex items-center gap-2 mt-1">
                  <Input 
                    disabled 
                    :value="getIntegrationData(platform.id)?.store_url || ''" 
                    type="text" 
                    class="text-xs"
                  />
                  <Button variant="outline" size="icon" @click="copyToClipboard(getIntegrationData(platform.id)?.store_url || '')">
                    <CopyIcon class="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>{{ $t('API Key') }}</Label>
                <div class="flex items-center gap-2 mt-1">
                  <Input 
                    disabled 
                    :value="maskApiKey(getIntegrationData(platform.id)?.api_key || '')" 
                    type="text" 
                    class="text-xs"
                  />
                  <Button variant="outline" size="icon" @click="copyToClipboard(getIntegrationData(platform.id)?.api_key || '')">
                    <CopyIcon class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex justify-between">
          <Button 
            v-if="getIntegrationStatus(platform.id).connected" 
            variant="destructive" 
            size="sm"
            @click="removeIntegration(platform.id)"
            :loading="isPlatformLoading(platform.id)"
          >
            {{ $t('Disconnect') }}
          </Button>
          <Button 
            v-else 
            size="sm"
            @click="setupIntegration(platform.id)"
            :loading="isPlatformLoading(platform.id)"
          >
            {{ $t('Connect') }}
          </Button>
        </CardFooter>
      </Card>
    </div>

    <!-- Modal de configuração -->
    <Dialog v-model:open="setupDialogOpen">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {{ $t('Setup Integration') }}: {{ selectedPlatform ? selectedPlatform.name : '' }}
          </DialogTitle>
          <DialogDescription>
            {{ $t('Enter the details to connect your store with') }} {{ selectedPlatform ? selectedPlatform.name : '' }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="saveIntegration">
          <div class="grid gap-4 py-4">
            <div class="grid gap-2">
              <Label for="store-url">{{ $t('Store URL') }}</Label>
              <Input 
                id="store-url" 
                v-model="integrationForm.store_url" 
                :placeholder="$t('Enter your store URL')" 
                required
              />
            </div>
            <div class="grid gap-2">
              <Label for="api-key">{{ $t('API Key') }}</Label>
              <Input 
                id="api-key" 
                v-model="integrationForm.api_key" 
                :placeholder="$t('Enter your API key')" 
                required
              />
              <p class="text-xs text-muted-foreground">
                {{ $t('You can find your API key in your store settings') }}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="setupDialogOpen = false">
              {{ $t('Cancel') }}
            </Button>
            <Button type="submit" :loading="saving">
              {{ $t('Save Integration') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useSupabaseClient } from '#imports'
import { useToast } from '~/components/ui/toast/use-toast'
import { 
  ShoppingCartIcon, ShoppingBagIcon, 
  StoreIcon, CopyIcon
} from 'lucide-vue-next'
import type { Integration } from '~/types/ecommerce'

// Estado
const integrations = ref<Integration[]>([])
const loading = ref(false)
const saving = ref(false)
const loadingPlatforms = ref<{[key: string]: boolean}>({})
const setupDialogOpen = ref(false)

// Supabase
const supabase = useSupabaseClient()
const toast = useToast()
const user = useSupabaseUser()

// Plataformas disponíveis
const platforms = [
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Integrate with your WordPress WooCommerce store',
    icon: ShoppingCartIcon
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect with your Shopify store to sync products',
    icon: ShoppingBagIcon
  },
  {
    id: 'magento',
    name: 'Magento',
    description: 'Sync with your Magento e-commerce platform',
    icon: StoreIcon
  }
]

// Formulário
const selectedPlatform = ref<typeof platforms[0] | null>(null)
const integrationForm = reactive({
  platform: '',
  store_url: '',
  api_key: ''
})

// Carregar integrações existentes
onMounted(async () => {
  await fetchIntegrations()
})

const fetchIntegrations = async () => {
  if (!user.value) return
  
  try {
    loading.value = true
    
    const { data, error } = await supabase
      .from('ecommerce_integrations')
      .select('*')
      .eq('user_id', user.value.id)
    
    if (error) throw error
    
    integrations.value = data || []
  } catch (e) {
    console.error('Error fetching integrations:', e)
    toast({
      title: 'Error',
      description: 'Failed to load integrations',
      variant: 'destructive'
    })
  } finally {
    loading.value = false
  }
}

// Methods
const getIntegrationStatus = (platformId: string) => {
  const integration = integrations.value.find(i => i.platform === platformId)
  
  if (integration) {
    return {
      connected: true,
      label: 'Connected',
      variant: 'success'
    }
  }
  
  return {
    connected: false,
    label: 'Not Connected',
    variant: 'default'
  }
}

const getIntegrationData = (platformId: string) => {
  return integrations.value.find(i => i.platform === platformId)
}

const setupIntegration = (platformId: string) => {
  selectedPlatform.value = platforms.find(p => p.id === platformId) || null
  integrationForm.platform = platformId
  integrationForm.store_url = ''
  integrationForm.api_key = ''
  setupDialogOpen.value = true
}

const saveIntegration = async () => {
  if (!user.value) return
  
  try {
    saving.value = true
    
    const { data, error } = await supabase
      .from('ecommerce_integrations')
      .insert({
        platform: integrationForm.platform,
        store_url: integrationForm.store_url,
        api_key: integrationForm.api_key,
        user_id: user.value.id
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Add to local array
    integrations.value.push(data)
    
    // Reset and close dialog
    setupDialogOpen.value = false
    integrationForm.platform = ''
    integrationForm.store_url = ''
    integrationForm.api_key = ''
    
    toast({
      title: 'Success',
      description: 'Integration saved successfully',
    })
  } catch (e) {
    console.error('Error saving integration:', e)
    toast({
      title: 'Error',
      description: 'Failed to save integration',
      variant: 'destructive'
    })
  } finally {
    saving.value = false
  }
}

const removeIntegration = async (platformId: string) => {
  if (!user.value) return
  
  const integration = integrations.value.find(i => i.platform === platformId)
  if (!integration) return
  
  try {
    loadingPlatforms.value[platformId] = true
    
    const { error } = await supabase
      .from('ecommerce_integrations')
      .delete()
      .eq('id', integration.id)
    
    if (error) throw error
    
    // Remove from local array
    integrations.value = integrations.value.filter(i => i.id !== integration.id)
    
    toast({
      title: 'Success',
      description: 'Integration removed successfully',
    })
  } catch (e) {
    console.error('Error removing integration:', e)
    toast({
      title: 'Error',
      description: 'Failed to remove integration',
      variant: 'destructive'
    })
  } finally {
    loadingPlatforms.value[platformId] = false
  }
}

const isPlatformLoading = (platformId: string) => {
  return !!loadingPlatforms.value[platformId]
}

const maskApiKey = (apiKey: string) => {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return '*'.repeat(apiKey.length)
  
  return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4)
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast({
      title: 'Copied',
      description: 'Text copied to clipboard',
    })
  })
}
</script> 