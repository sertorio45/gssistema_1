<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Item {
  title: string
  href: string
  /** When true, the item is visible but not clickable yet. */
  comingSoon?: boolean
}

const route = useRoute()

const sidebarNavItems: Item[] = [
  {
    title: 'Perfil',
    href: '/settings/profile',
  },
  {
    title: 'Conta',
    href: '/settings/account',
    comingSoon: true,
  },
  {
    title: 'Aparência',
    href: '/settings/appearance',
  },
  {
    title: 'Notificações',
    href: '/settings/notifications',
    comingSoon: true,
  },
  {
    title: 'Exibição',
    href: '/settings/display',
    comingSoon: true,
  },
]
</script>

<template>
  <nav class="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-1">
    <template v-for="item in sidebarNavItems" :key="item.title">
      <Button
        v-if="!item.comingSoon"
        variant="ghost"
        :class="cn(
          'w-full justify-start text-left',
          route.path === item.href && 'bg-muted hover:bg-muted',
        )"
        as-child
      >
        <NuxtLink :to="item.href">
          {{ item.title }}
        </NuxtLink>
      </Button>
      <Button
        v-else
        variant="ghost"
        disabled
        :class="cn(
          'w-full justify-between text-left opacity-60',
          route.path === item.href && 'bg-muted',
        )"
      >
        <span>{{ item.title }}</span>
        <Badge variant="outline" class="ml-2 shrink-0 text-[10px] font-normal">
          Em breve
        </Badge>
      </Button>
    </template>
  </nav>
</template>
