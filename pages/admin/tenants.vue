<script setup lang="ts">
import type { Tenant } from '@/components/users/tenant-columns'

import { Icon } from '#components'
import { useSupabaseClient } from '#imports'

import { onMounted, ref } from 'vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import DataTable from '@/components/users/DataTable.vue'
import { columns } from '@/components/users/tenant-columns'

import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import { useToast } from '~/components/ui/toast'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'funcionario'],
})

const { toast } = useToast()
const tenants = ref<Tenant[]>([])
const isLoading = ref(true)
const isDeleteAlertOpen = ref(false)
const selectedTenant = ref<Tenant | null>(null)
const selectedItems = ref([])
const showMultiDeleteDialog = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingTenant = ref<Tenant | null>(null)

// Form data with separate boolean state
const formData = ref({
  name: '',
})

// Separate explicit boolean state for active state
const isTenantActive = ref(true)

// Supabase client
const supabase = useSupabaseClient()

// Load tenant data
async function loadData() {
  isLoading.value = true
  try {
    const { data, error } = await supabase.from('tenant').select('*').order('name')

    if (error) {
      throw error
    }

    tenants.value = data as Tenant[]
  }
  catch (error: any) {
    console.error('Error loading data:', error)
    toast({
      title: 'Erro',
      description: error.message || 'Não foi possível carregar as empresas',
      variant: 'destructive',
    })
  }
  finally {
    isLoading.value = false
  }
}

// Open delete confirmation dialog
function handleDeleteClick(tenant: Tenant) {
  selectedTenant.value = tenant
  isDeleteAlertOpen.value = true
}

// Delete tenant
async function deleteTenant() {
  if (!selectedTenant.value) {
    return
  }

  try {
    const { error } = await supabase.from('tenant').delete().eq('id', selectedTenant.value.id)

    if (error) {
      throw error
    }

    toast({
      title: 'Sucesso',
      description: 'Empresa excluída com sucesso',
    })

    // Close confirmation and reload data
    isDeleteAlertOpen.value = false
    selectedTenant.value = null
    await loadData()
  }
  catch (error: any) {
    console.error('Error deleting tenant:', error)
    toast({
      title: 'Erro',
      description: error?.message || 'Não foi possível excluir a empresa',
      variant: 'destructive',
    })
  }
}

// Generate slug from name
function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Create tenant
async function createTenant() {
  try {
    const slug = generateSlug(formData.value.name)

    const { error } = await supabase
      .from('tenant')
      .insert([
        {
          name: formData.value.name,
          slug,
          is_active: isTenantActive.value,
        },
      ])
      .select()

    if (error) {
      throw error
    }

    toast({
      title: 'Sucesso',
      description: 'Empresa criada com sucesso',
    })

    showCreateDialog.value = false
    formData.value.name = ''
    isTenantActive.value = true
    await loadData()
  }
  catch (error: any) {
    console.error('Error creating tenant:', error)
    toast({
      title: 'Erro',
      description: error?.message || 'Não foi possível criar a empresa',
      variant: 'destructive',
    })
  }
}

// Open edit dialog
function handleEditClick(tenant: Tenant) {
  editingTenant.value = tenant
  formData.value.name = tenant.name

  // Explicitly set the boolean value from database
  isTenantActive.value = tenant.is_active === true

  showEditDialog.value = true
}

// Update tenant
async function updateTenant() {
  if (!editingTenant.value) {
    return
  }

  try {
    const { error } = await supabase
      .from('tenant')
      .update({
        name: formData.value.name,
        is_active: isTenantActive.value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingTenant.value.id)

    if (error) {
      throw error
    }

    toast({
      title: 'Sucesso',
      description: 'Empresa atualizada com sucesso',
    })

    showEditDialog.value = false
    editingTenant.value = null
    formData.value.name = ''
    isTenantActive.value = true
    await loadData()
  }
  catch (error: any) {
    console.error('Error updating tenant:', error)
    toast({
      title: 'Erro',
      description: error?.message || 'Não foi possível atualizar a empresa',
      variant: 'destructive',
    })
  }
}

// Update selected items
function updateSelectedItems(items: any) {
  selectedItems.value = items
}

// Show multiple delete confirmation
function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

// Delete multiple tenants
async function handleMultiDeleteConfirm() {
  const itemIds = selectedItems.value.map((index: number) => tenants.value[index].id)
  let allSuccess = true

  for (const id of itemIds) {
    try {
      const { error } = await supabase.from('tenant').delete().eq('id', id)

      if (error) {
        allSuccess = false
      }
    }
    catch (error) {
      console.error(`Error deleting tenant ${id}:`, error)
      allSuccess = false
    }
  }

  if (allSuccess) {
    toast({
      title: 'Sucesso',
      description: `${itemIds.length} empresa(s) excluída(s) com sucesso`,
    })
  }
  else {
    toast({
      title: 'Aviso',
      description: 'Algumas empresas não puderam ser excluídas',
      variant: 'destructive',
    })
  }

  showMultiDeleteDialog.value = false
  selectedItems.value = []
  await loadData()
}

// Reset form
function resetForm() {
  formData.value.name = ''
  isTenantActive.value = true
}

// Load data when component is mounted
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Empresas (tenants)
        </h1>
        <p class="text-muted-foreground">
          Gerencie as empresas clientes do sistema
        </p>
      </div>
      <Button class="bg-primary hover:bg-primary/90" @click="showCreateDialog = true">
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        Nova empresa
      </Button>
    </div>

    <!-- Tenants Table -->
    <div v-if="isLoading" class="space-y-4">
      <Card class="border shadow-sm">
        <CardContent class="p-4">
          <div class="space-y-2">
            <Skeleton class="h-8 w-[250px]" />
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
    <DataTable
      v-else
      :data="tenants"
      :columns="columns"
      @delete="handleDeleteClick"
      @edit="handleEditClick"
      @selection-change="updateSelectedItems"
    />

    <!-- Multi-item action bar -->
    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="showMultiDeleteConfirmation"
    />

    <!-- Create tenant dialog -->
    <AlertDialog :open="showCreateDialog" @update:open="showCreateDialog = $event">
      <AlertDialogContent class="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle class="text-xl">
            Nova empresa
          </AlertDialogTitle>
          <AlertDialogDescription>
            Preencha as informações abaixo para cadastrar uma nova empresa. Cada empresa isola os dados de CRM, WhatsApp e demais módulos.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div class="py-4 space-y-6">
          <div class="space-y-2">
            <label
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              for="name"
            >
              Nome <span class="text-destructive">*</span>
            </label>
            <Input id="name" v-model="formData.name" placeholder="Nome da empresa" auto-focus />
            <p class="text-sm text-muted-foreground">
              Nome exibido na interface do sistema.
            </p>
          </div>

          <div class="flex flex-row items-center justify-between border rounded-lg p-3 shadow-sm">
            <div class="space-y-0.5">
              <label class="text-sm font-medium leading-none" for="tenant-active">Ativa</label>
              <p class="text-sm text-muted-foreground">
                Define se a empresa está ativa no sistema.
              </p>
            </div>
            <Switch id="tenant-active" :checked="isTenantActive" @update:checked="isTenantActive = $event" />
          </div>

          <div v-if="formData.name" class="space-y-2">
            <label class="text-sm font-medium leading-none">Identificador (slug)</label>
            <div
              class="h-10 w-full flex items-center border border-input rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
            >
              {{ generateSlug(formData.name) }}
            </div>
            <p class="text-sm text-muted-foreground">
              Identificador único usado em URLs e referências internas.
            </p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            @click="showCreateDialog = false; resetForm()"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            :disabled="!formData.name"
            @click="createTenant"
          >
            <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
            Criar empresa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Edit tenant dialog -->
    <AlertDialog :open="showEditDialog" @update:open="showEditDialog = $event">
      <AlertDialogContent class="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle class="text-xl">
            Editar empresa
          </AlertDialogTitle>
          <AlertDialogDescription>
            Atualize as informações da empresa selecionada.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div class="py-4 space-y-6">
          <div class="space-y-2">
            <label
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              for="edit-name"
            >
              Nome <span class="text-destructive">*</span>
            </label>
            <Input id="edit-name" v-model="formData.name" placeholder="Nome da empresa" auto-focus />
          </div>

          <div class="flex flex-row items-center justify-between border rounded-lg p-3 shadow-sm">
            <div class="space-y-0.5">
              <label class="text-sm font-medium leading-none" for="edit-tenant-active">Ativa</label>
              <p class="text-sm text-muted-foreground">
                Define se a empresa está ativa no sistema.
              </p>
            </div>
            <Switch id="edit-tenant-active" :checked="isTenantActive" @update:checked="isTenantActive = $event" />
          </div>

          <div v-if="editingTenant" class="space-y-2">
            <label class="text-sm font-medium leading-none">Identificador (slug)</label>
            <div
              class="h-10 w-full flex items-center border border-input rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
            >
              {{ editingTenant.slug }}
            </div>
            <p class="text-sm text-muted-foreground">
              O identificador não pode ser alterado após a criação.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            @click="
              showEditDialog = false;
              resetForm();
            "
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            :disabled="!formData.name"
            @click="updateTenant"
          >
            <Icon name="lucide:save" class="mr-2 h-4 w-4" />
            Salvar alterações
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Delete confirmation dialog -->
    <AlertDialog :open="isDeleteAlertOpen" @update:open="isDeleteAlertOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. A empresa
            <span class="font-medium">{{ selectedTenant?.name }}</span>
            será excluída permanentemente do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="isDeleteAlertOpen = false">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="deleteTenant"
          >
            <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Multiple delete confirmation dialog -->
    <AlertDialog :open="showMultiDeleteDialog" @update:open="showMultiDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir várias empresas</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir
            <span class="font-medium">{{ selectedItems.length }}</span>
            empresa(s)? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showMultiDeleteDialog = false">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleMultiDeleteConfirm"
          >
            <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
            Excluir {{ selectedItems.length }} empresa(s)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
