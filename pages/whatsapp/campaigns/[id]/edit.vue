<script setup lang="ts">
import CampaignForm from '~/components/whatsapp/campaigns/CampaignForm.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Editar campanha',
})

const route = useRoute()
const campaignId = computed(() => route.params.id as string)
const { tenantId } = useTenant()
const { fetchCampaign } = useWhatsAppCampaigns()

const { data, pending } = await useAsyncData(
  () => `whatsapp-campaign-edit-${campaignId.value}-${tenantId.value}`,
  async () => {
    if (!tenantId.value || !campaignId.value)
      return null
    return fetchCampaign(campaignId.value)
  },
  { watch: [tenantId, campaignId] },
)

const campaign = computed(() => data.value?.data)

watch(campaign, (value) => {
  if (value && !['draft', 'paused'].includes(value.status)) {
    toast.message('Esta campanha não pode ser editada')
    navigateTo(`/whatsapp/campaigns/${value.id}`)
  }
}, { immediate: true })
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Editar campanha">
      <template #actions>
        <NuxtLink :to="`/whatsapp/campaigns/${campaignId}`">
          <Button variant="outline">
            Voltar
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <Skeleton v-if="pending" class="h-96 w-full rounded-xl" />

    <CampaignForm
      v-else-if="campaign"
      :campaign="campaign"
      @saved="(item) => navigateTo(`/whatsapp/campaigns/${item.id}`)"
      @cancel="navigateTo(`/whatsapp/campaigns/${campaignId}`)"
    />
  </div>
</template>
