<script setup lang="ts">
import ContactForm from '~/components/whatsapp/contacts/ContactForm.vue'
import ContactProfile from '~/components/whatsapp/contacts/ContactProfile.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Skeleton } from '~/components/ui/skeleton'

definePageMeta({
  middleware: ['auth'],
  title: 'Contato WhatsApp',
})

const route = useRoute()
const contactId = computed(() => route.params.id as string)
const { tenantId } = useTenant()
const { fetchContact } = useWhatsAppContacts()

const isEditOpen = ref(false)

const { data, pending, refresh } = await useAsyncData(
  () => `whatsapp-contact-detail-${contactId.value}-${tenantId.value}`,
  async () => {
    if (!tenantId.value || !contactId.value)
      return null
    const response = await fetchContact(contactId.value)
    return response.data
  },
  { watch: [tenantId, contactId] },
)
</script>

<template>
  <div>
    <WhatsAppPageHeader
      :title="data?.name || 'Contato'"
      description="Perfil e sincronização com CRM."
    >
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/whatsapp/contacts">
            <Button variant="outline">
              Voltar
            </Button>
          </NuxtLink>
          <Button v-if="data" @click="isEditOpen = true">
            Editar
          </Button>
        </div>
      </template>
    </WhatsAppPageHeader>

    <Skeleton v-if="pending" class="h-64 w-full" />
    <ContactProfile v-else-if="data" :contact="data" @refreshed="refresh()" />

    <Dialog v-model:open="isEditOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar contato</DialogTitle>
        </DialogHeader>
        <ContactForm
          v-if="data"
          :initial-data="data"
          @success="isEditOpen = false; refresh()"
          @cancel="isEditOpen = false"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
