<script setup lang="ts">
import type { AgencyBranding } from '~/types/workspace'

import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'organization.manage',
  allowedOrganizationTypes: ['agency'],
  title: 'Configurações da agência',
})

const { organization } = useWorkspace()
const organizationId = computed(() => organization.value?.id ?? null)
const saving = ref(false)

const branding = reactive({
  commercial_name: '',
  logo_url: '',
  primary_color: '',
  custom_domain: '',
  invite_display_name: '',
  notification_signature: '',
})

const { data, pending, refresh, showSkeleton } = await useCachedAsyncData(
  computed(() => `agency-settings-${organizationId.value ?? 'none'}`),
  async () => {
    if (!organizationId.value)
      return null
    const response = await $fetch<{ data: { branding: AgencyBranding } }>(
      `/api/organizations/${organizationId.value}/settings`,
    )
    return response.data
  },
  { default: () => null, watch: [organizationId] },
)

watch(data, (value) => {
  if (!value?.branding)
    return
  branding.commercial_name = value.branding.commercial_name || ''
  branding.logo_url = value.branding.logo_url || ''
  branding.primary_color = value.branding.primary_color || ''
  branding.custom_domain = value.branding.custom_domain || ''
  branding.invite_display_name = value.branding.invite_display_name || ''
  branding.notification_signature = value.branding.notification_signature || ''
}, { immediate: true })

async function save() {
  if (!organizationId.value)
    return
  saving.value = true
  try {
    await $fetch(`/api/organizations/${organizationId.value}/settings`, {
      method: 'PUT',
      body: {
        branding: {
          commercial_name: branding.commercial_name || null,
          logo_url: branding.logo_url || null,
          primary_color: branding.primary_color || null,
          custom_domain: branding.custom_domain || null,
          invite_display_name: branding.invite_display_name || null,
          notification_signature: branding.notification_signature || null,
        },
      },
    })
    toast.success('Configurações salvas')
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Falha ao salvar')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Configurações da agência
      </h1>
      <p class="mt-1 text-muted-foreground">
        Personalização básica. O domínio personalizado fica reservado para uma etapa futura.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Identidade</CardTitle>
        <CardDescription>
          Dados usados em convites e notificações — sem acoplar a plataforma a uma única marca.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div v-if="showSkeleton" class="space-y-4">
          <Skeleton v-for="n in 6" :key="n" class="h-10 w-full" />
        </div>
        <template v-else>
        <div class="space-y-2">
          <Label>Nome comercial</Label>
          <Input v-model="branding.commercial_name" :disabled="pending" placeholder="Nome exibido da agência" />
        </div>
        <div class="space-y-2">
          <Label>Logotipo (URL)</Label>
          <Input v-model="branding.logo_url" :disabled="pending" placeholder="https://..." />
        </div>
        <div class="space-y-2">
          <Label>Cor principal</Label>
          <Input v-model="branding.primary_color" :disabled="pending" placeholder="#0F172A" />
        </div>
        <div class="space-y-2">
          <Label>Domínio personalizado (futuro)</Label>
          <Input
            v-model="branding.custom_domain"
            :disabled="pending"
            placeholder="clientes.suaagencia.com.br"
          />
          <p class="text-xs text-muted-foreground">
            Armazenado apenas como dado. Ainda não altera DNS, SSL nem roteamento.
          </p>
        </div>
        <div class="space-y-2">
          <Label>Nome nos convites</Label>
          <Input v-model="branding.invite_display_name" :disabled="pending" />
        </div>
        <div class="space-y-2">
          <Label>Assinatura das notificações</Label>
          <Textarea v-model="branding.notification_signature" :disabled="pending" rows="3" />
        </div>
        </template>
      </CardContent>
      <CardFooter>
        <Button :disabled="saving || pending" @click="save">
          Salvar
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
