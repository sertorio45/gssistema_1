<script setup lang="ts">
import { whatsappConversations, whatsappMessages } from '~/data/crm-mock'
import type { WhatsAppConversation, WhatsAppMessage } from '~/types/crm'

definePageMeta({
  title: 'WhatsApp',
  description: 'Manage WhatsApp conversations and messages',
})

const conversations = ref(whatsappConversations)
const messages = ref(whatsappMessages)
const selectedConversation = ref<WhatsAppConversation | null>(null)
const newMessage = ref('')

// Get messages for selected conversation
const conversationMessages = computed(() => {
  if (!selectedConversation.value) return []
  return messages.value.filter(msg => 
    msg.remoteJid === selectedConversation.value?.remoteJid
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
})

function selectConversation(conversation: WhatsAppConversation) {
  selectedConversation.value = conversation
  // Mark as read
  conversation.unreadCount = 0
}

function sendMessage() {
  if (!newMessage.value.trim() || !selectedConversation.value) return
  
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
        <h1 class="text-2xl font-bold">WhatsApp</h1>
        <p class="text-muted-foreground">Manage WhatsApp conversations and messages</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:settings" class="mr-2 h-4 w-4" />
          Settings
        </Button>
        <Button>
          <Icon name="lucide:qr-code" class="mr-2 h-4 w-4" />
          Connect
        </Button>
      </div>
    </div>

    <!-- Chat Interface -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      <!-- Conversations List -->
      <Card class="lg:col-span-1">
        <CardHeader>
          <CardTitle class="text-lg">Conversations</CardTitle>
          <div class="relative">
            <Icon name="lucide:search" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." class="pl-10" />
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div class="space-y-1">
            <div
              v-for="conversation in conversations"
              :key="conversation.id"
              class="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b"
              :class="{ 'bg-muted': selectedConversation?.id === conversation.id }"
              @click="selectConversation(conversation)"
            >
              <Avatar class="h-10 w-10">
                <AvatarImage v-if="conversation.profilePicture" :src="conversation.profilePicture" />
                <AvatarFallback>{{ conversation.contactName.split(' ').map(n => n[0]).join('') }}</AvatarFallback>
              </Avatar>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium truncate">{{ conversation.contactName }}</p>
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-muted-foreground">
                      {{ formatTime(conversation.lastMessageTime) }}
                    </span>
                    <div
                      v-if="conversation.isOnline"
                      class="w-2 h-2 bg-green-500 rounded-full"
                    ></div>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <p class="text-sm text-muted-foreground truncate">{{ conversation.lastMessage }}</p>
                  <Badge
                    v-if="conversation.unreadCount > 0"
                    variant="default"
                    class="text-xs min-w-[20px] h-5 flex items-center justify-center"
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
        <div v-if="selectedConversation" class="flex flex-col h-full">
          <!-- Chat Header -->
          <CardHeader class="border-b">
            <div class="flex items-center gap-3">
              <Avatar class="h-10 w-10">
                <AvatarImage v-if="selectedConversation.profilePicture" :src="selectedConversation.profilePicture" />
                <AvatarFallback>{{ selectedConversation.contactName.split(' ').map(n => n[0]).join('') }}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle class="text-lg">{{ selectedConversation.contactName }}</CardTitle>
                <p class="text-sm text-muted-foreground">{{ selectedConversation.contactPhone }}</p>
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
                :class="message.fromMe 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'"
              >
                <p class="text-sm">{{ message.message }}</p>
                <div class="flex items-center justify-end gap-1 mt-1">
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
              <Input
                v-model="newMessage"
                placeholder="Type a message..."
                class="flex-1"
                @keydown.enter="sendMessage"
              />
              <Button @click="sendMessage" :disabled="!newMessage.trim()">
                <Icon name="lucide:send" class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <!-- No Conversation Selected -->
        <div v-else class="flex items-center justify-center h-full">
          <div class="text-center">
            <Icon name="lucide:message-circle" class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 class="text-lg font-medium">Select a conversation</h3>
            <p class="text-muted-foreground">Choose a conversation from the list to start messaging</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Conversations</CardTitle>
          <Icon name="lucide:message-circle" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ conversations.length }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Unread Messages</CardTitle>
          <Icon name="lucide:mail" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ conversations.reduce((sum, conv) => sum + conv.unreadCount, 0) }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Online Contacts</CardTitle>
          <Icon name="lucide:users" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ conversations.filter(conv => conv.isOnline).length }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Messages Today</CardTitle>
          <Icon name="lucide:activity" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ messages.filter(msg => 
              new Date(msg.timestamp).toDateString() === new Date().toDateString()
            ).length }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template> 