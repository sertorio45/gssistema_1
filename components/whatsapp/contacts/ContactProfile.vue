<script setup lang="ts">
import type { WhatsAppContactDetail } from '~/types/whatsapp'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { toast } from 'vue-sonner'

const props = defineProps<{
  contact: WhatsAppContactDetail
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const { syncToCrm } = useWhatsAppContacts()
const syncing = ref(false)

const initials = computed(() =>
  (props.contact.name || props.contact.phone).slice(0, 2).toUpperCase(),
)

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  return phone
}

async function handleSync(createIfMissing = true) {
  syncing.value = true
  try {
    const response = await syncToCrm(props.contact.id, { createIfMissing })
    if (response.leadCreated) {
      toast.success('Contato e lead criados no funil')
    }
    else if (response.lead) {
      toast.success('Contato sincronizado e lead vinculado ao funil')
    }
    else {
      toast.success('Contato sincronizado com o CRM')
    }
    emit('refreshed')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao sincronizar')
  }
  finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-3">
    <Card class="lg:col-span-1">
      <CardHeader class="text-center">
        <Avatar class="mx-auto h-20 w-20">
          <AvatarImage :src="contact.profilePicture || undefined" />
          <AvatarFallback class="text-lg">
            {{ initials }}
          </AvatarFallback>
        </Avatar>
        <CardTitle class="mt-4">
          {{ contact.name || 'Sem nome' }}
        </CardTitle>
        <p class="text-sm text-muted-foreground">
          {{ formatPhone(contact.phone) }}
        </p>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <Badge v-if="contact.blocked" variant="destructive">
            Bloqueado
          </Badge>
          <Badge v-else-if="!contact.optIn" variant="secondary">
            Opt-out
          </Badge>
          <Badge v-else>
            Ativo
          </Badge>
          <Badge v-if="contact.crmContactId" variant="outline">
            CRM vinculado
          </Badge>
        </div>

        <div class="flex flex-col gap-2 pt-2">
          <Button :disabled="syncing" @click="handleSync(true)">
            <span class="i-lucide-refresh-cw mr-2 h-4 w-4" />
            {{ contact.crmContactId ? 'Atualizar no CRM' : 'Vincular ao CRM' }}
          </Button>
          <NuxtLink
            v-if="contact.conversationsCount"
            :to="{ path: '/whatsapp/conversations', query: { contact: contact.id } }"
          >
            <Button variant="outline" class="w-full">
              Ver conversas
            </Button>
          </NuxtLink>
        </div>
      </CardContent>
    </Card>

    <div class="space-y-6 lg:col-span-2">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Informações
          </CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p class="text-muted-foreground">
              Criado em
            </p>
            <p>{{ new Date(contact.createdAt).toLocaleDateString('pt-BR') }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">
              Conversas
            </p>
            <p>{{ contact.conversationsCount ?? 0 }}</p>
          </div>
          <div v-if="contact.lastConversationAt">
            <p class="text-muted-foreground">
              Última conversa
            </p>
            <p>{{ new Date(contact.lastConversationAt).toLocaleString('pt-BR') }}</p>
          </div>
          <div v-if="contact.tags?.length">
            <p class="text-muted-foreground">
              Tags
            </p>
            <p>{{ contact.tags.join(', ') }}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            CRM
          </CardTitle>
        </CardHeader>
        <CardContent class="text-sm">
          <template v-if="contact.crmContactId">
            <p class="font-medium">
              {{ contact.crmContactName }}
            </p>
            <p v-if="contact.crmContactEmail" class="text-muted-foreground">
              {{ contact.crmContactEmail }}
            </p>
            <p v-if="contact.crmCompanyName" class="text-muted-foreground">
              {{ contact.crmCompanyName }}
            </p>
            <NuxtLink
              :to="`/crm/contacts`"
              class="mt-3 inline-flex text-sm text-primary hover:underline"
            >
              Abrir no CRM →
            </NuxtLink>
          </template>
          <p v-else class="text-muted-foreground">
            Este contato ainda não está vinculado ao CRM. Use o botão acima para criar ou vincular automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
