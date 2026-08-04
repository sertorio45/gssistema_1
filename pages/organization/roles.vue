<script setup lang="ts">
import type { WorkspaceCapability } from '~/constants/workspace'

import type { OrganizationRole } from '~/types/workspace'
import { computed, ref } from 'vue'

import { toast } from 'vue-sonner'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import { deleteWithConfirm } from '~/composables/useConfirmDelete'
import { useWorkspace } from '~/composables/useWorkspace'
import {
  CAPABILITY_GROUPS,
  CAPABILITY_LABELS,

} from '~/constants/workspace'

definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'organization.roles.read',
  title: 'Cargos e permissões',
})

const { organization, can } = useWorkspace()
const organizationId = computed(() => organization.value?.id ?? null)
const canManage = computed(() => can('organization.roles.manage'))

const { data: rolesRaw, refresh, pending, showSkeleton } = await useCachedAsyncData<OrganizationRole[]>(
  computed(() => `organization-roles-${organizationId.value ?? 'none'}`),
  async () => {
    if (!organizationId.value)
      return []
    const response = await $fetch<{ data: OrganizationRole[] }>(
      `/api/organizations/${organizationId.value}/roles`,
    )
    return response.data
  },
  { default: () => null, watch: [organizationId] },
)

const roles = computed(() => rolesRaw.value ?? [])

const editorOpen = ref(false)
const editingRole = ref<OrganizationRole | null>(null)
const saving = ref(false)
const deletingId = ref<string | null>(null)

const form = ref({
  name: '',
  description: '',
  capabilities: [] as string[],
})

const actorCapabilities = computed(() => {
  const workspace = useWorkspace()
  return new Set<string>(workspace.context.value?.capabilities ?? [])
})

function openCreate(duplicateFrom?: OrganizationRole) {
  editingRole.value = null
  form.value = {
    name: duplicateFrom ? `${duplicateFrom.name} (cópia)` : '',
    description: duplicateFrom?.description || '',
    capabilities: duplicateFrom?.capabilities?.map(item => item.capability) || [],
  }
  editorOpen.value = true
  if (duplicateFrom)
    (form.value as { duplicateFromRoleId?: string }).duplicateFromRoleId = duplicateFrom.id
}

function openEdit(role: OrganizationRole) {
  if (!role.is_editable || role.is_protected) {
    toast.error('Este cargo é protegido e não pode ser editado')
    return
  }
  editingRole.value = role
  form.value = {
    name: role.name,
    description: role.description,
    capabilities: role.capabilities?.map(item => item.capability) || [],
  }
  editorOpen.value = true
}

function toggleCapability(capability: string) {
  if (!actorCapabilities.value.has(capability)
    && !form.value.capabilities.includes(capability)) {
    toast.error('Você não pode conceder uma permissão que não possui')
    return
  }
  const index = form.value.capabilities.indexOf(capability)
  if (index >= 0)
    form.value.capabilities.splice(index, 1)
  else
    form.value.capabilities.push(capability)
}

async function saveRole() {
  if (!organizationId.value || !form.value.name.trim())
    return

  saving.value = true
  try {
    if (editingRole.value) {
      await $fetch(`/api/organizations/${organizationId.value}/roles/${editingRole.value.id}`, {
        method: 'PUT',
        body: {
          name: form.value.name,
          description: form.value.description,
          capabilities: form.value.capabilities,
        },
      })
      toast.success('Cargo atualizado')
    }
    else {
      await $fetch(`/api/organizations/${organizationId.value}/roles`, {
        method: 'POST',
        body: {
          name: form.value.name,
          description: form.value.description,
          capabilities: form.value.capabilities,
          duplicateFromRoleId: (form.value as any).duplicateFromRoleId,
        },
      })
      toast.success('Cargo criado')
    }
    editorOpen.value = false
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Não foi possível salvar o cargo')
  }
  finally {
    saving.value = false
  }
}

async function deleteRole(role: OrganizationRole) {
  if (!organizationId.value)
    return
  if (role.is_protected || role.is_system) {
    toast.error('Cargos protegidos não podem ser excluídos')
    return
  }

  let replacementRoleId: string | undefined
  if ((role.member_count || 0) > 0) {
    const candidates = roles.value.filter(item => item.id !== role.id)
    if (!candidates.length) {
      toast.error('Não há cargo substituto disponível')
      return
    }
    replacementRoleId = candidates[0]!.id
  }

  const ok = await deleteWithConfirm(
    async () => {
      deletingId.value = role.id
      try {
        await $fetch(`/api/organizations/${organizationId.value}/roles/${role.id}`, {
          method: 'DELETE',
          body: replacementRoleId ? { replacementRoleId } : {},
        })
      }
      finally {
        deletingId.value = null
      }
    },
    {
      title: 'Excluir cargo?',
      description: `Tem certeza que deseja excluir "${role.name}"? Esta ação não pode ser desfeita.`,
      successMessage: 'Cargo excluído com sucesso.',
    },
  )
  if (ok)
    await refresh()
}

function capabilityLabel(capability: string) {
  return CAPABILITY_LABELS[capability as WorkspaceCapability] || capability
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Cargos e permissões
        </h1>
        <p class="mt-1 text-muted-foreground">
          {{ organization?.name || 'Organização' }} — o cargo define o que a pessoa pode fazer;
          a atribuição a clientes define onde ela pode fazer.
        </p>
      </div>
      <Button v-if="canManage" @click="openCreate()">
        Novo cargo
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Cargos da organização</CardTitle>
        <CardDescription>
          Cargos do sistema são protegidos. Cargos personalizados herdam apenas permissões que você já possui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="showSkeleton" class="space-y-3 py-2">
          <Skeleton v-for="n in 5" :key="n" class="h-12 w-full" />
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Cargo</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead class="text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="role in roles" :key="role.id">
              <TableCell>
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ role.name }}</span>
                    <Badge v-if="role.is_protected" variant="secondary">
                      Protegido
                    </Badge>
                    <Badge v-else-if="role.is_system" variant="outline">
                      Sistema
                    </Badge>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {{ role.description }}
                  </p>
                </div>
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">
                {{ role.capabilities?.length || 0 }} capabilities
              </TableCell>
              <TableCell>
                {{ role.member_count || 0 }}
              </TableCell>
              <TableCell class="text-right space-x-2">
                <Button
                  v-if="canManage"
                  variant="outline"
                  size="sm"
                  @click="openCreate(role)"
                >
                  Duplicar
                </Button>
                <Button
                  v-if="canManage && role.is_editable && !role.is_protected"
                  variant="outline"
                  size="sm"
                  @click="openEdit(role)"
                >
                  Editar
                </Button>
                <Button
                  v-if="canManage && !role.is_protected && !role.is_system"
                  variant="ghost"
                  size="sm"
                  :disabled="deletingId === role.id"
                  @click="deleteRole(role)"
                >
                  Excluir
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog :open="editorOpen" @update:open="value => !value && (editorOpen = false)">
      <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ editingRole ? 'Editar cargo' : 'Novo cargo' }}
          </DialogTitle>
          <DialogDescription>
            Marque apenas as permissões necessárias. Deny e elevação são validados no servidor.
          </DialogDescription>
        </DialogHeader>

        <div class="py-2 space-y-4">
          <div class="space-y-2">
            <Label>Nome</Label>
            <Input v-model="form.name" placeholder="Ex.: Coordenador de conteúdo" />
          </div>
          <div class="space-y-2">
            <Label>Descrição</Label>
            <Textarea v-model="form.description" rows="2" />
          </div>

          <div
            v-for="group in CAPABILITY_GROUPS"
            :key="group.key"
            class="space-y-2"
          >
            <p class="text-sm font-medium">
              {{ group.label }}
            </p>
            <div class="border rounded-lg divide-y">
              <label
                v-for="capability in group.capabilities"
                :key="capability"
                class="flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-muted/40"
              >
                <Checkbox
                  :checked="form.capabilities.includes(capability)"
                  :disabled="!actorCapabilities.has(capability) && !form.capabilities.includes(capability)"
                  @update:checked="() => toggleCapability(capability)"
                />
                <span>
                  <span class="font-medium">{{ capabilityLabel(capability) }}</span>
                  <span class="block text-xs text-muted-foreground">{{ capability }}</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="editorOpen = false">
            Cancelar
          </Button>
          <Button :disabled="saving || !form.name.trim()" @click="saveRole">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
