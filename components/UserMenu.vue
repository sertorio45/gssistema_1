<script setup lang="ts">
import { LogOut, Shield, User, UserIcon } from 'lucide-vue-next'

const { currentUser, logout, loading, currentRole } = useAuth()

// Extrair o email do usuário para exibição
const userEmail = computed(() => currentUser.value?.email || '')

function handleLogout() {
  return logout()
}

// Obter o ícone e o texto para o role do usuário
const roleInfo = computed(() => {
  switch (currentRole.value) {
    case 'admin':
      return {
        icon: Shield,
        text: 'Administrador',
        color: 'text-purple-600',
      }
    case 'funcionario':
      return {
        icon: UserIcon,
        text: 'Funcionário',
        color: 'text-blue-600',
      }
    default:
      return {
        icon: User,
        text: 'Cliente',
        color: 'text-green-600',
      }
  }
})
</script>

<template>
  <div class="relative">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" class="relative size-8 rounded-full">
          <Avatar class="size-8">
            <AvatarFallback>
              <User class="size-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{{ userEmail }}</DropdownMenuLabel>
        <div v-if="currentRole" class="flex items-center gap-2 px-2 py-1 text-xs font-medium" :class="roleInfo.color">
          <component :is="roleInfo.icon" class="h-3.5 w-3.5" />
          {{ roleInfo.text }}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem as-child>
          <NuxtLink to="/profile" class="w-full">
            Profile
          </NuxtLink>
        </DropdownMenuItem>
        <DropdownMenuItem as-child>
          <NuxtLink to="/settings" class="w-full">
            Settings
          </NuxtLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem :disabled="loading" @click="handleLogout">
          <LogOut class="mr-2 size-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
