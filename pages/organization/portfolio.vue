<script setup lang="ts">
import { computed } from 'vue'

import { useWorkspace } from '~/composables/useWorkspace'
import { ORGANIZATION_RELATIONSHIP_LABELS } from '~/constants/workspace'

definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'organization.tenants.read',
  allowedOrganizationTypes: ['agency'],
  title: 'Carteira de clientes',
})

const { organization, tenants, tenant: currentTenant, switchContext } = useWorkspace()

const ownWorkspaces = computed(() =>
  tenants.value.filter(item => item.relationship_type !== 'managed'),
)

const managedWorkspaces = computed(() =>
  tenants.value.filter(item => item.relationship_type === 'managed'),
)

async function openWorkspace(tenantId: string) {
  await switchContext({ tenantId })
  await navigateTo('/marketing')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Carteira de clientes
      </h1>
      <p class="mt-1 text-muted-foreground">
        {{ organization?.name }} — empresas que você atende com o alcance atribuído ao seu usuário.
      </p>
    </div>

    <Card v-if="ownWorkspaces.length">
      <CardHeader>
        <CardTitle>{{ ORGANIZATION_RELATIONSHIP_LABELS.owner }}</CardTitle>
        <CardDescription>Workspace administrativo da própria agência.</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="workspaceTenant in ownWorkspaces"
          :key="workspaceTenant.id"
          class="border rounded-lg p-4"
        >
          <p class="text-sm font-medium">
            {{ workspaceTenant.name }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ workspaceTenant.slug }}
          </p>
          <Button
            class="mt-3 w-full"
            variant="outline"
            size="sm"
            :disabled="currentTenant?.id === workspaceTenant.id"
            @click="openWorkspace(workspaceTenant.id)"
          >
            {{ currentTenant?.id === workspaceTenant.id ? 'Workspace atual' : 'Abrir workspace' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{{ ORGANIZATION_RELATIONSHIP_LABELS.managed }}</CardTitle>
        <CardDescription>
          Apenas os clientes atribuídos ao seu usuário aparecem aqui.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="workspaceTenant in managedWorkspaces"
          :key="workspaceTenant.id"
          class="border rounded-lg p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm font-medium">
                {{ workspaceTenant.name }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ workspaceTenant.slug }}
              </p>
            </div>
            <Badge v-if="!workspaceTenant.is_active" variant="outline">
              Inativa
            </Badge>
          </div>
          <Button
            class="mt-3 w-full"
            variant="outline"
            size="sm"
            :disabled="currentTenant?.id === workspaceTenant.id"
            @click="openWorkspace(workspaceTenant.id)"
          >
            {{ currentTenant?.id === workspaceTenant.id ? 'Workspace atual' : 'Abrir workspace' }}
          </Button>
        </div>
        <p v-if="!managedWorkspaces.length" class="text-sm text-muted-foreground">
          Nenhum cliente atribuído ao seu usuário.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
