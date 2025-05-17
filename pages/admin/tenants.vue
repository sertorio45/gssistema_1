<script setup lang="ts">
import { Icon } from '#components'
import { useSupabaseClient } from '#imports'
import { onMounted, ref } from 'vue'
import type { Tenant } from '@/components/users/tenant-columns'
import { columns } from '@/components/users/tenant-columns'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import DataTable from '@/components/users/DataTable.vue'
import { useToast } from '~/components/ui/toast'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'],
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
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('name')

    if (error) {
      throw error
    }
    
    tenants.value = data as Tenant[]
  }
  catch (error: any) {
    console.error('Error loading data:', error)
    toast({
      title: 'Error',
      description: error.message || 'Failed to load data',
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
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', selectedTenant.value.id)

    if (error) {
      throw error
    }

    toast({
      title: 'Success',
      description: 'Tenant deleted successfully',
    })

    // Close confirmation and reload data
    isDeleteAlertOpen.value = false
    selectedTenant.value = null
    await loadData()
  }
  catch (error: any) {
    console.error('Error deleting tenant:', error)
    toast({
      title: 'Error',
      description: error?.message || 'Failed to delete tenant',
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
      .from('tenants')
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
      title: 'Success',
      description: 'Tenant created successfully',
    })

    showCreateDialog.value = false
    formData.value.name = ''
    isTenantActive.value = true
    await loadData()
  }
  catch (error: any) {
    console.error('Error creating tenant:', error)
    toast({
      title: 'Error',
      description: error?.message || 'Failed to create tenant',
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
      .from('tenants')
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
      title: 'Success',
      description: 'Tenant updated successfully',
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
      title: 'Error',
      description: error?.message || 'Failed to update tenant',
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
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id)
      
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
      title: 'Success',
      description: `${itemIds.length} tenants deleted successfully!`,
    })
  }
  else {
    toast({
      title: 'Warning',
      description: 'Some tenants could not be deleted.',
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
          Tenant Management
        </h1>
        <p class="text-muted-foreground">
          Manage system tenants
        </p>
      </div>
      <Button
        class="bg-primary hover:bg-primary/90"
        @click="showCreateDialog = true"
      >
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        New Tenant
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
      @selectionChange="updateSelectedItems"
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
          <AlertDialogTitle class="text-xl">Create New Tenant</AlertDialogTitle>
          <AlertDialogDescription>
            Fill in the information below to create a new tenant.
            Tenants are used to separate data between different organizations.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div class="space-y-6 py-4">
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" for="name">
              Name <span class="text-destructive">*</span>
            </label>
            <Input 
              id="name"
              v-model="formData.name"
              placeholder="Enter tenant name" 
              autoFocus
            />
            <p class="text-sm text-muted-foreground">
              The name will be displayed in the user interface.
            </p>
          </div>
          
          <div class="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
            <div class="space-y-0.5">
              <label class="text-sm font-medium leading-none" for="tenant-active">Active</label>
              <p class="text-sm text-muted-foreground">
                Determines if the tenant is active in the system.
              </p>
            </div>
            <Switch id="tenant-active" :checked="isTenantActive" @update:checked="isTenantActive = $event" />
          </div>
          
          <div v-if="formData.name" class="space-y-2">
            <label class="text-sm font-medium leading-none">Slug</label>
            <div class="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              {{ generateSlug(formData.name) }}
            </div>
            <p class="text-sm text-muted-foreground">
              Unique identifier used in URLs and internal references.
            </p>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel @click="showCreateDialog = false; resetForm()">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            @click="createTenant"
            :disabled="!formData.name"
          >
            <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
            Create Tenant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Edit tenant dialog -->
    <AlertDialog :open="showEditDialog" @update:open="showEditDialog = $event">
      <AlertDialogContent class="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle class="text-xl">Edit Tenant</AlertDialogTitle>
          <AlertDialogDescription>
            Update the selected tenant information.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div class="space-y-6 py-4">
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" for="edit-name">
              Name <span class="text-destructive">*</span>
            </label>
            <Input 
              id="edit-name"
              v-model="formData.name"
              placeholder="Enter tenant name" 
              autoFocus
            />
          </div>
          
          <div class="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
            <div class="space-y-0.5">
              <label class="text-sm font-medium leading-none" for="edit-tenant-active">Active</label>
              <p class="text-sm text-muted-foreground">
                Determines if the tenant is active in the system.
              </p>
            </div>
            <Switch id="edit-tenant-active" :checked="isTenantActive" @update:checked="isTenantActive = $event" />
          </div>
          
          <div v-if="editingTenant" class="space-y-2">
            <label class="text-sm font-medium leading-none">Slug</label>
            <div class="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              {{ editingTenant.slug }}
            </div>
            <p class="text-sm text-muted-foreground">
              The slug cannot be changed after creation.
            </p>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel @click="showEditDialog = false; resetForm()">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            @click="updateTenant"
            :disabled="!formData.name"
          >
            <Icon name="lucide:save" class="mr-2 h-4 w-4" />
            Save Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Delete confirmation dialog -->
    <AlertDialog :open="isDeleteAlertOpen" @update:open="isDeleteAlertOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the tenant
            <span class="font-medium">{{ selectedTenant?.name }}</span> and remove its data from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="isDeleteAlertOpen = false">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="deleteTenant">
            <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Multiple delete confirmation dialog -->
    <AlertDialog :open="showMultiDeleteDialog" @update:open="showMultiDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Multiple Tenants</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span class="font-medium">{{ selectedItems.length }}</span> tenants? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showMultiDeleteDialog = false">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleMultiDeleteConfirm">
            <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
            Delete {{ selectedItems.length }} Tenants
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
