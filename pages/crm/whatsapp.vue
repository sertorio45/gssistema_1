<script setup lang="ts">
import type { WhatsAppConversation, WhatsAppMessage } from '~/types/crm'
import { whatsappConversations, whatsappMessages } from '~/data/crm-mock'

definePageMeta({
  title: 'WhatsApp',
  description: 'Gerencie conversas e mensagens do WhatsApp',
})

const conversations = ref(whatsappConversations)
const messages = ref(whatsappMessages)
const selectedConversation = ref<WhatsAppConversation | null>(null)
const newMessage = ref('')

// Get messages for selected conversation
const conversationMessages = computed(() => {
  if (!selectedConversation.value)
    return []
  return messages.value
    .filter(msg => msg.remoteJid === selectedConversation.value?.remoteJid)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
})

function selectConversation(conversation: WhatsAppConversation) {
  selectedConversation.value = conversation
  // Mark as read
  conversation.unreadCount = 0
}

function sendMessage() {
  if (!newMessage.value.trim() || !selectedConversation.value)
    return

  const message: WhatsAppMessage = {
    id: `msg-${Date.now()}`,
    instanceId: 'instance-1',
    remoteJid: selectedConversation.value.remoteJid,
    fromMe: true,
    messageType: 'text',
    message: newMessage.value,
    timestamp: new Date().toISOString(),
    status: 'sent',
    contact_id: selectedConversation.value.contact_id,
    lead_id: selectedConversation.value.lead_id,
    tenant_id: 'tenant-1',
  }

  messages.value.push(message)

  // Update conversation last message
  selectedConversation.value.lastMessage = newMessage.value
  selectedConversation.value.lastMessageTime = message.timestamp

  newMessage.value = ''
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          WhatsApp
        </h1>
        <p class="text-muted-foreground">
          Gerencie conversas e mensagens do WhatsApp
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:settings" class="mr-2 h-4 w-4" />
          Configurações
        </Button>
        <Button>
          <Icon name="lucide:qr-code" class="mr-2 h-4 w-4" />
          Conectar
        </Button>
      </div>
    </div>

    <!-- Chat Interface -->
    <div class="grid grid-cols-1 h-[600px] gap-4 lg:grid-cols-3">
      <!-- Conversations List -->
      <Card class="lg:col-span-1">
        <CardHeader>
          <CardTitle class="text-lg">
            Conversas
          </CardTitle>
          <div class="relative">
            <Icon
              name="lucide:search"
              class="absolute left-3 top-1/2 h-4 w-4 transform text-muted-foreground -translate-y-1/2"
            />
            <Input placeholder="Buscar conversas..." class="pl-10" />
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div class="space-y-1">
            <div
              v-for="conversation in conversations"
              :key="conversation.id"
              class="flex cursor-pointer items-center gap-3 border-b p-3 hover:bg-muted/50"
              :class="{ 'bg-muted': selectedConversation?.id === conversation.id }"
              @click="selectConversation(conversation)"
            >
              <Avatar class="h-10 w-10">
                <AvatarImage v-if="conversation.profilePicture" :src="conversation.profilePicture" />
                <AvatarFallback>
                  {{
                    conversation.contactName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                  }}
                </AvatarFallback>
              </Avatar>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between">
                  <p class="truncate text-sm font-medium">
                    {{ conversation.contactName }}
                  </p>
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-muted-foreground">
                      {{ formatTime(conversation.lastMessageTime) }}
                    </span>
                    <div v-if="conversation.isOnline" class="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <p class="truncate text-sm text-muted-foreground">
                    {{ conversation.lastMessage }}
                  </p>
                  <Badge
                    v-if="conversation.unreadCount > 0"
                    variant="default"
                    class="h-5 min-w-[20px] flex items-center justify-center text-xs"
                  >
                    {{ conversation.unreadCount }}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Chat Area -->
      <Card class="lg:col-span-2">
        <div v-if="selectedConversation" class="h-full flex flex-col">
          <!-- Chat Header -->
          <CardHeader class="border-b">
            <div class="flex items-center gap-3">
              <Avatar class="h-10 w-10">
                <AvatarImage v-if="selectedConversation.profilePicture" :src="selectedConversation.profilePicture" />
                <AvatarFallback>
                  {{
                    selectedConversation.contactName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                  }}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle class="text-lg">
                  {{ selectedConversation.contactName }}
                </CardTitle>
                <p class="text-sm text-muted-foreground">
                  {{ selectedConversation.contactPhone }}
                </p>
              </div>
              <div class="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Icon name="lucide:phone" class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Icon name="lucide:video" class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Icon name="lucide:more-vertical" class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <!-- Messages -->
          <CardContent class="flex-1 overflow-y-auto p-4 space-y-4">
            <div
              v-for="message in conversationMessages"
              :key="message.id"
              class="flex"
              :class="message.fromMe ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[70%] rounded-lg p-3"
                :class="message.fromMe ? 'bg-primary text-primary-foreground' : 'bg-muted'"
              >
                <p class="text-sm">
                  {{ message.message }}
                </p>
                <div class="mt-1 flex items-center justify-end gap-1">
                  <span class="text-xs opacity-70">
                    {{ formatTime(message.timestamp) }}
                  </span>
                  <Icon
                    v-if="message.fromMe"
                    :name="message.status === 'read' ? 'lucide:check-check' : 'lucide:check'"
                    class="h-3 w-3"
                    :class="message.status === 'read' ? 'text-blue-400' : ''"
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <!-- Message Input -->
          <div class="border-t p-4">
            <div class="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Icon name="lucide:paperclip" class="h-4 w-4" />
              </Button>
              <Input v-model="newMessage" placeholder="Digite uma mensagem..." class="flex-1" @keydown.enter="sendMessage" />
              <Button :disabled="!newMessage.trim()" @click="sendMessage">
                <Icon name="lucide:send" class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <!-- No Conversation Selected -->
        <div v-else class="h-full flex items-center justify-center">
          <div class="text-center">
            <Icon name="lucide:message-circle" class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 class="text-lg font-medium">
              Selecione uma conversa
            </h3>
            <p class="text-muted-foreground">
              Escolha uma conversa na lista para começar a enviar mensagens
            </p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Total de Conversas
          </CardTitle>
          <Icon name="lucide:message-circle" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ conversations.length }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Mensagens Não Lidas
          </CardTitle>
          <Icon name="lucide:mail" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ conversations.reduce((sum, conv) => sum + conv.unreadCount, 0) }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Contatos Online
          </CardTitle>
          <Icon name="lucide:users" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ conversations.filter(conv => conv.isOnline).length }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Mensagens Hoje
          </CardTitle>
          <Icon name="lucide:activity" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ messages.filter(msg => new Date(msg.timestamp).toDateString() === new Date().toDateString()).length }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
