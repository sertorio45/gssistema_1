<script setup lang="ts">
import type { NavGroup, NavLink, NavMenu, NavSectionTitle } from '~/types/nav'

import { computed, onMounted, ref } from 'vue'

import { useRole } from '@/composables/useRole'
import { useAuth } from '~/composables/useAuth'
import { useModule } from '~/composables/useModule'
import { useTenant } from '~/composables/useTenant'
import { navMenu, navMenuAdmin, navMenuBottom } from '~/constants/menus'

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
const isLoadingMenu = ref(true)

// --- Lógica de módulo ---
const { currentModuleMeta } = useModule()

// --- Lógica de tenant ---
const { listTenants, restoreLastTenant } = useTenant()
const availableTenants = ref<any[]>([])
const isLoadingTenants = ref(true)
const { currentRole } = useAuth()
const showTenantSelector = computed(() => currentRole.value !== 'cliente')
const showAdminSection = computed(() => hasRole(['admin']))

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

function filterMenuByRoleAndModule(menu: NavMenu[]) {
  const moduleTitle = currentModuleMeta.value?.title
  return menu
    .map((section: NavMenu) => ({
      ...section,
      items: section.items
        .filter((item: NavLink | NavGroup | NavSectionTitle) => {
          // Filtro por módulo: quando há módulo selecionado, mostrar apenas o grupo com esse título
          if (moduleTitle && 'children' in item && item.children) {
            if (item.title !== moduleTitle) return false
          }
          // Itens sem children (links soltos) são ocultados quando há um módulo selecionado
          if (moduleTitle && !('children' in item)) return false
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
            return item
          }
          return item
        }),
    }))
    .filter((section: NavMenu) => section.items.length > 0)
}

const filteredMenuComputed = computed(() => filterMenuByRoleAndModule(navMenu))

/** When a module is selected, flatten the module group into a single list of links (no nested/collapsible). */
const flatModuleLinks = computed((): NavLink[] => {
  const moduleTitle = currentModuleMeta.value?.title
  if (!moduleTitle) return []
  const section = filteredMenuComputed.value.find(s => s.items.length > 0)
  const group = section?.items.find((i): i is NavGroup => 'children' in i && i.title === moduleTitle)
  if (!group || !('children' in group) || !group.children?.length) return []
  return group.children.map((child: any) => ({
    title: child.title,
    icon: child.icon,
    link: child.link || (child.children?.[0]?.link) || '#',
    roles: child.roles,
    new: child.new,
  }))
})

const showFlatModuleMenu = computed(() => flatModuleLinks.value.length > 0)

onMounted(async () => {
  await fetchUserRole()
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
      <!-- Seletor de Módulo -->
      <SidebarGroup class="mb-2">
        <TenantModuleDropdown />
      </SidebarGroup>

      <!-- Seletor de Tenant (Apenas admin e funcionario) -->
      <SidebarGroup v-if="showTenantSelector" class="">
        <div class="">
          <div v-if="isLoadingTenants">
            <SidebarGroup>
              <SidebarMenuSkeleton show-icon class="mb-1" />
              <SidebarMenuSkeleton class="mb-1 ml-6" />
            </SidebarGroup>
          </div>
          <div v-else class="mb-3">
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
        <!-- Module selected: flat list (one item per row, no submenus) -->
        <SidebarGroup v-if="showFlatModuleMenu">
          <SidebarMenu>
            <SidebarMenuItem v-for="(link, idx) in flatModuleLinks" :key="idx">
              <SidebarMenuButton as-child :tooltip="link.title">
                <NuxtLink :to="link.link">
                  <Icon :name="link.icon || 'i-lucide-circle'" mode="svg" />
                  <span>{{ link.title }}</span>
                  <span
                    v-if="link.new"
                    class="rounded-md bg-#adfa1d px-1.5 py-0.5 text-xs text-black leading-none"
                  >
                    New
                  </span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <!-- No module selected: show full menu with groups -->
        <template v-else>
          <SidebarGroup v-for="(nav, indexGroup) in filteredMenuComputed" :key="indexGroup">
            <SidebarGroupLabel v-if="nav.heading">
              {{ nav.heading }}
            </SidebarGroupLabel>
            <component :is="resolveNavItemComponent(item)" v-for="(item, index) in nav.items" :key="index" :item="item" />
          </SidebarGroup>
        </template>
        <!-- Administration: separate section, only for admins -->
        <SidebarGroup v-if="showAdminSection" class="mt-auto border-t pt-2">
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <component
            :is="resolveNavItemComponent(item)"
            v-for="(item, index) in navMenuAdmin[0].items"
            :key="index"
            :item="item"
          />
        </SidebarGroup>
        <SidebarGroup class="mt-auto">
          <component
            :is="resolveNavItemComponent(item)"
            v-for="(item, index) in navMenuBottom"
            :key="index"
            :item="item"
            size="sm"
          />
        </SidebarGroup>
      </template>
    </SidebarContent>
    <SidebarFooter>
      <LayoutSidebarNavFooter :user="user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

<style scoped></style>
