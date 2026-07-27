<script setup lang="ts">
import type { NavGroup, NavLink, NavMenu, NavSectionTitle } from '~/types/nav'

import { computed, onMounted } from 'vue'

import { useRole } from '@/composables/useRole'
import { useAuth } from '~/composables/useAuth'
import { useMarketingAudience } from '~/composables/marketing/useMarketingAudience'
import { useModule } from '~/composables/useModule'
import { useWorkspace } from '~/composables/useWorkspace'
import { isClientPortalMarketingLink } from '~/constants/marketing-audience'
import { navMenu, navMenuAdmin, navMenuOrganization, navMenuTenant } from '~/constants/menus'
import { isTenantScopedRole } from '~/constants/roles'
import { holdsCapability } from '~/constants/workspace'
import { canEnterWorkspaceRoute, matchesNavAudience } from '~/utils/workspace-guard'

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

const { fetchUserRole, hasRole } = useRole()
const { currentRole, updateUserRole } = useAuth()
const { isClientExperience } = useMarketingAudience()

const {
  context: workspaceContext,
  isLoading: isLoadingTenants,
  organizationType,
  isPlatformStaff,
  showTenantSwitcher: showTenantSelector,
  load: loadWorkspace,
} = useWorkspace()

const { currentModuleMeta } = useModule()

/** Menu waits only for workspace context — roles refresh in parallel without blocking UI. */
const isLoadingMenu = computed(() => !workspaceContext.value)

const capabilities = computed(() => new Set<string>(workspaceContext.value?.capabilities ?? []))

/** Platform console — only global staff. */
const showPlatformSection = computed(() => isPlatformStaff.value || hasRole(['admin', 'funcionario']))

/** Client company team — never for platform staff (they use Agência / Plataforma). */
const showTenantTeamSection = computed(() =>
  !showPlatformSection.value && hasRole(['cliente']),
)

const scopeHeading = computed(() =>
  organizationType.value === 'agency' ? 'Workspace' : 'Organização',
)

function hasCapability(item: NavLink | NavGroup | NavSectionTitle) {
  return !('capability' in item) || !item.capability || holdsCapability(capabilities.value, item.capability)
}

function matchesAudience(item: NavLink | NavGroup | NavSectionTitle) {
  // Hard whitelist for Marketing on the client portal — ignore stale caps.
  if (isClientExperience.value && 'link' in item && item.link?.startsWith('/marketing'))
    return isClientPortalMarketingLink(item.link)

  if (!('audience' in item) || !item.audience)
    return true
  return matchesNavAudience(item.audience, isClientExperience.value)
}

function resolveItemTitle(item: NavLink | NavGroup): string {
  if (isClientExperience.value && item.clientTitle)
    return item.clientTitle
  return item.title
}

function matchesOrganizationType(item: NavLink | NavGroup | NavSectionTitle) {
  return canEnterWorkspaceRoute(
    {
      capabilities: capabilities.value,
      organizationType: organizationType.value,
      isClientExperience: isClientExperience.value,
    },
    {
      organizationTypes: 'organizationTypes' in item ? item.organizationTypes : null,
      audience: 'audience' in item ? item.audience : null,
    },
  )
}

function filterNavChildren(children: NavLink[] = []) {
  return children
    .filter(child =>
      hasCapability(child)
      && matchesAudience(child)
      && matchesOrganizationType(child)
      && (!child.roles || hasRole(child.roles)),
    )
    .map(child => ({
      ...child,
      title: resolveItemTitle(child),
    }))
}

/**
 * One org group only: "Agência" for agencies, "Organização" for direct.
 * Children are capability-filtered so empty groups disappear.
 */
const organizationMenuItems = computed(() => {
  // End customers never see the agency portfolio block.
  if (isClientExperience.value)
    return []

  const preferredTitle = organizationType.value === 'agency' ? 'Agência' : 'Organização'
  return navMenuOrganization[0].items
    .filter((item): item is NavGroup => 'children' in item && item.title === preferredTitle)
    .map(group => ({
      ...group,
      children: filterNavChildren(group.children),
    }))
    .filter(group => group.children.length > 0)
})

const platformMenuItems = computed(() => {
  if (!showPlatformSection.value)
    return []
  return navMenuAdmin[0].items.filter((item) => {
    if ('roles' in item && item.roles && !hasRole(item.roles))
      return false
    return true
  })
})

function filterMenuByRoleAndModule(menu: NavMenu[]) {
  const moduleTitle = currentModuleMeta.value?.title
  return menu
    .map((section: NavMenu) => ({
      ...section,
      items: section.items
        .filter((item: NavLink | NavGroup | NavSectionTitle) => {
          if (moduleTitle && 'children' in item && item.children) {
            if (item.title !== moduleTitle)
              return false
          }
          if (moduleTitle && !('children' in item))
            return false
          const isTenantUser = isTenantScopedRole(currentRole.value)
          if (isTenantUser) {
            if ('children' in item) {
              if (item.roles && !hasRole(item.roles))
                return false
              return item.children?.some(child =>
                hasCapability(child)
                && matchesAudience(child)
                && (!child.roles || hasRole(child.roles)),
              ) ?? false
            }
            if ('link' in item)
              return hasCapability(item) && matchesAudience(item) && (!item.roles || hasRole(item.roles))
            return true
          }
          if ('children' in item) {
            return item.children?.some(child =>
              hasCapability(child)
              && matchesAudience(child)
              && (!child.roles || hasRole(child.roles)),
            ) ?? false
          }
          return hasCapability(item)
            && matchesAudience(item)
            && (!('roles' in item) || !item.roles || hasRole(item.roles))
        })
        .map((item: NavLink | NavGroup | NavSectionTitle) => {
          if ('children' in item) {
            return {
              ...item,
              children: filterNavChildren(item.children || []),
            }
          }
          if ('link' in item)
            return { ...item, title: resolveItemTitle(item) }
          return item
        }),
    }))
    .filter((section: NavMenu) => section.items.length > 0)
}

const filteredMenuComputed = computed(() => filterMenuByRoleAndModule(navMenu))

const flatModuleLinks = computed((): NavLink[] => {
  const moduleTitle = currentModuleMeta.value?.title
  if (!moduleTitle)
    return []
  for (const section of filteredMenuComputed.value) {
    const group = section.items.find((i): i is NavGroup => 'children' in i && i.title === moduleTitle)
    if (group?.children?.length) {
      return group.children.map((child: NavLink) => ({
        title: resolveItemTitle(child),
        icon: child.icon,
        link: child.link || (child.children?.[0]?.link) || '#',
        roles: child.roles,
        new: child.new,
      }))
    }
  }
  return []
})

const showFlatModuleMenu = computed(() => flatModuleLinks.value.length > 0)

const showSecondaryNav = computed(() =>
  organizationMenuItems.value.length > 0
  || platformMenuItems.value.length > 0
  || showTenantTeamSection.value,
)

onMounted(() => {
  void Promise.all([
    updateUserRole(),
    fetchUserRole(),
    workspaceContext.value ? Promise.resolve() : loadWorkspace(),
  ]).catch(() => {})
})
</script>

<template>
  <Sidebar :collapsible="sidebar.collapsible" :side="sidebar.side" :variant="sidebar.variant">
    <SidebarHeader>
      <LayoutSidebarNavLogo />
      <Search />
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup class="mb-1">
        <TenantModuleDropdown />
      </SidebarGroup>

      <SidebarGroup v-if="showTenantSelector">
        <div v-if="isLoadingTenants">
          <LayoutSidebarNavSkeleton show-icon class="mb-1" width="72%" />
          <LayoutSidebarNavSkeleton class="mb-1 ml-6" width="58%" />
        </div>
        <div v-else class="mb-2">
          <TenantDropdown />
        </div>
      </SidebarGroup>

      <template v-if="isLoadingMenu">
        <SidebarGroup v-for="n in 3" :key="n">
          <LayoutSidebarNavSkeleton show-icon class="mb-1" :width="`${60 + n * 8}%`" />
          <LayoutSidebarNavSkeleton class="mb-1 ml-6" :width="`${48 + n * 6}%`" />
          <LayoutSidebarNavSkeleton class="mb-1 ml-6" :width="`${52 + n * 5}%`" />
        </SidebarGroup>
      </template>

      <template v-else>
        <!-- Primary: current module -->
        <SidebarGroup>
          <SidebarGroupLabel>
            {{ currentModuleMeta?.title || 'Módulos' }}
          </SidebarGroupLabel>
          <SidebarMenu v-if="showFlatModuleMenu">
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
          <template v-else>
            <component
              :is="resolveNavItemComponent(item)"
              v-for="(item, index) in filteredMenuComputed.flatMap(nav => nav.items)"
              :key="index"
              :item="item"
            />
          </template>
        </SidebarGroup>

        <!-- Secondary: org + platform (no marketing duplicates) -->
        <SidebarGroup v-if="showSecondaryNav" class="mt-auto border-t pt-3">
          <SidebarGroupLabel>{{ scopeHeading }}</SidebarGroupLabel>

          <component
            :is="resolveNavItemComponent(item)"
            v-for="(item, index) in organizationMenuItems"
            :key="`org-${index}`"
            :item="item"
          />

          <component
            :is="resolveNavItemComponent(item)"
            v-for="(item, index) in platformMenuItems"
            :key="`platform-${index}`"
            :item="item"
          />

          <template v-if="showTenantTeamSection">
            <component
              :is="resolveNavItemComponent(item)"
              v-for="(item, index) in navMenuTenant[0].items"
              :key="`tenant-${index}`"
              :item="item"
            />
          </template>
        </SidebarGroup>
      </template>
    </SidebarContent>
    <SidebarFooter>
      <LayoutSidebarNavFooter :user="user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
