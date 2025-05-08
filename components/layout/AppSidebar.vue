<script setup lang="ts">
import type { NavGroup, NavLink, NavMenu, NavSectionTitle } from '~/types/nav'
import { useRole } from '@/composables/useRole'
import { onMounted, ref } from 'vue'
import { navMenu, navMenuBottom } from '~/constants/menus'

function resolveNavItemComponent(item: NavLink | NavGroup | NavSectionTitle): any {
  if ('children' in item)
    return resolveComponent('LayoutSidebarNavGroup')

  return resolveComponent('LayoutSidebarNavLink')
}

const teams: {
  name: string
  logo: string
  plan: string
}[] = [
  {
    name: 'Acme Inc',
    logo: 'i-lucide-gallery-vertical-end',
    plan: 'Enterprise',
  },
  {
    name: 'Acme Corp.',
    logo: 'i-lucide-audio-waveform',
    plan: 'Startup',
  },
  {
    name: 'Evil Corp.',
    logo: 'i-lucide-command',
    plan: 'Free',
  },
]

const user: {
  name: string
  email: string
  avatar: string
} = {
  name: 'Dian Pratama',
  email: 'dianpratama2@gmail.com',
  avatar: '/avatars/avatartion.png',
}

const { sidebar } = useAppSettings()

// --- Lógica de role ---
const { userRole, fetchUserRole, hasRole } = useRole()
const filteredMenu = ref<NavMenu[]>([])
const isLoadingMenu = ref(true)

function filterMenuByRole(menu: NavMenu[]) {
  return menu
    .map((section: NavMenu) => ({
      ...section,
      items: section.items
        .filter((item: NavLink | NavGroup | NavSectionTitle) => {
          // Se for grupo
          if ('children' in item) {
            // Verifica se o grupo tem permissão
            if (item.roles && !hasRole(item.roles)) {
              return false
            }
            // Verifica se algum filho tem permissão
            return item.children.some(child => !child.roles || hasRole(child.roles))
          }
          // Se for link
          if ('link' in item) {
            return !item.roles || hasRole(item.roles)
          }
          // Se for título de seção, sempre mostra
          return true
        })
        // Se for grupo, filtra os filhos também
        .map((item: NavLink | NavGroup | NavSectionTitle) => {
          if ('children' in item) {
            return {
              ...item,
              children: item.children.filter(child => !child.roles || hasRole(child.roles)),
            }
          }
          return item
        }),
    }))
    // Remove se a seção ficou sem itens
    .filter((section: NavMenu) => section.items.length > 0)
}

onMounted(async () => {
  await fetchUserRole()
  console.warn('Role do usuário:', userRole.value) // Debug
  filteredMenu.value = filterMenuByRole(navMenu)
  console.warn('Menu filtrado:', filteredMenu.value) // Debug
  isLoadingMenu.value = false
})
</script>

<template>
  <Sidebar :collapsible="sidebar.collapsible" :side="sidebar.side" :variant="sidebar.variant">
    <SidebarHeader>
      <LayoutSidebarNavLogo />
      <Search />
    </SidebarHeader>
    <SidebarContent>
      <template v-if="isLoadingMenu">
        <SidebarGroup v-for="n in 4" :key="n">
          <SidebarMenuSkeleton showIcon class="mb-1" />
          <SidebarMenuSkeleton class="mb-1 ml-6" />
          <SidebarMenuSkeleton class="mb-1 ml-6" />
        </SidebarGroup>
      </template>
      <template v-else>
        <SidebarGroup v-for="(nav, indexGroup) in filteredMenu" :key="indexGroup">
          <SidebarGroupLabel v-if="nav.heading">
            {{ nav.heading }}
          </SidebarGroupLabel>
          <component :is="resolveNavItemComponent(item)" v-for="(item, index) in nav.items" :key="index" :item="item" />
        </SidebarGroup>
        <SidebarGroup class="mt-auto">
          <component :is="resolveNavItemComponent(item)" v-for="(item, index) in navMenuBottom" :key="index" :item="item" size="sm" />
        </SidebarGroup>
      </template>
    </SidebarContent>
    <SidebarFooter>
      <LayoutSidebarNavFooter :user="user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

<style scoped>

</style>
