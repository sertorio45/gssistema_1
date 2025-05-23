<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRole } from '@/composables/useRole'
import type { NavGroup, NavLink, NavMenu, NavSectionTitle } from '~/types/nav'
import { useAuth } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'
import { navMenu, navMenuBottom } from '~/constants/menus'

function resolveNavItemComponent(item: NavLink | NavGroup | NavSectionTitle): any {
  if ('children' in item)
    return resolveComponent('LayoutSidebarNavGroup')
  return resolveComponent('LayoutSidebarNavLink')
}

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
const { fetchUserRole, hasRole } = useRole()
const filteredMenu = ref<NavMenu[]>([])
const isLoadingMenu = ref(true)

// --- Lógica de tenant ---
const { listTenants, restoreLastTenant } = useTenant()
const availableTenants = ref<any[]>([])
const isLoadingTenants = ref(true)
const { currentRole } = useAuth()
const showTenantSelector = computed(() => currentRole.value !== 'cliente')

// Carregar lista de tenants disponíveis
async function loadTenants() {
  if (!showTenantSelector.value) {
    return
  }
  isLoadingTenants.value = true
  try {
    availableTenants.value = await listTenants()
  }
  catch (error) {
    console.error('Error loading tenants:', error)
  }
  finally {
    isLoadingTenants.value = false
  }
}

function filterMenuByRole(menu: NavMenu[]) {
  return menu
    .map((section: NavMenu) => ({
      ...section,
      items: section.items
        .filter((item: NavLink | NavGroup | NavSectionTitle) => {
          // Se for cliente, aplica filtro de roles normalmente
          if (currentRole.value === 'cliente') {
            if ('children' in item) {
              if (item.roles && !hasRole(item.roles)) {
                return false
              }
              return item.children.some(child => !child.roles || hasRole(child.roles))
            }
            if ('link' in item) {
              return !item.roles || hasRole(item.roles)
            }
            return true
          }
          // Para admin/funcionário, não filtra por role (mostra tudo)
          return true
        })
        .map((item: NavLink | NavGroup | NavSectionTitle) => {
          if ('children' in item) {
            if (currentRole.value === 'cliente') {
              return {
                ...item,
                children: item.children.filter(child => !child.roles || hasRole(child.roles)),
              }
            }
            // Para admin/funcionário, mostra todos os filhos
            return item
          }
          return item
        }),
    }))
    .filter((section: NavMenu) => section.items.length > 0)
}

onMounted(async () => {
  await fetchUserRole()
  filteredMenu.value = filterMenuByRole(navMenu)
  // Carregar e restaurar tenant
  await restoreLastTenant()
  await loadTenants()
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
      <!-- Seletor de Tenant (Apenas admin e funcionario) -->
      <SidebarGroup v-if="showTenantSelector" class="mb-4">
        <SidebarGroupLabel>
          Current Tenant
        </SidebarGroupLabel>
        <div class="px-4 py-2">
          <div v-if="isLoadingTenants" class="flex items-center justify-center py-2">
            <div class="w-5 h-5 border-2 border-primary rounded-full animate-spin border-t-transparent"></div>
          </div>
          <div v-else>
            <!-- Tenant Dropdown -->
            <TenantDropdown />
          </div>
        </div>
      </SidebarGroup>

      <!-- Menu Principal -->
      <template v-if="isLoadingMenu">
        <SidebarGroup v-for="n in 4" :key="n">
          <SidebarMenuSkeleton show-icon class="mb-1" />
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
