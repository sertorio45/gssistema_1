<script setup lang="ts">
import CampaignForm from '~/components/whatsapp/campaigns/CampaignForm.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'

definePageMeta({
  middleware: ['auth'],
  title: 'Nova campanha',
})
</script>

<template>
  <div>
    <WhatsAppPageHeader
      title="Nova campanha"
      description="Configure mensagem, público e instância Evolution."
    >
      <template #actions>
        <NuxtLink to="/whatsapp/campaigns">
          <Button variant="outline">
            Voltar
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <CampaignForm
      @saved="(campaign) => navigateTo(`/whatsapp/campaigns/${campaign.id}`)"
      @cancel="navigateTo('/whatsapp/campaigns')"
    />
  </div>
</template>
