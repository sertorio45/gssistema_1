<script setup lang="ts">
import { Icon } from '#components'
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
import { Skeleton } from '@/components/ui/skeleton'
import { columns } from '@/components/users/columns'
import DataTable from '@/components/users/DataTable.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import { useToast } from '~/components/ui/toast'
import CreateUserDialog from '~/components/users/CreateUserDialog.vue'
import EditUserDialog from '~/components/users/EditUserDialog.vue'

const createUserDialog = ref<InstanceType<typeof CreateUserDialog> | null>(null)
const editUserDialog = ref<InstanceType<typeof EditUserDialog> | null>(null)

const { data: usersData, refresh } = await useFetch<{ users: User[] }>('/api/admin/users')

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'],
})

interface User {
  id: string
  email: string
  role: string
}

const { toast } = useToast()
const users = ref<User[]>([])
const isLoading = ref(true)
const isDeleteAlertOpen = ref(false)
const selectedUser = ref<User | null>(null)
const selectedItems = ref([])
const showMultiDeleteDialog = ref(false)

// Load data
async function loadData() {
  isLoading.value = true
  try {
    await refresh()
    if (usersData.value?.users) {
      users.value = usersData.value.users
    }
  }
  catch (error) {
    console.error('Error loading data:', error)
    toast({
      title: 'Error',
      description: 'Failed to load data',
      variant: 'destructive',
    })
  }
  finally {
    isLoading.value = false
  }
}

// Open delete confirmation dialog
function handleDeleteClick(user: User) {
  selectedUser.value = user
  isDeleteAlertOpen.value = true
}

// Delete user
async function deleteUser() {
  if (!selectedUser.value) {
    return
  }

  try {
    const { data } = await useFetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'DELETE',
    })

    if (!data.value?.success) {
      throw new Error('Error deleting user')
    }

    toast({
      title: 'Success',
      description: 'User deleted successfully',
    })

    // Close confirmation and reload data
    isDeleteAlertOpen.value = false
    selectedUser.value = null
    await loadData()
  }
  catch (error: any) {
    console.error('Error deleting user:', error)
    toast({
      title: 'Error',
      description: error?.message || 'Failed to delete user',
      variant: 'destructive',
    })
  }
}

// Update selected items
function updateSelectedItems(items: any) {
  selectedItems.value = items
}

// Show multi-delete dialog
function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

// Delete multiple users
async function handleMultiDeleteConfirm() {
  const itemIds = selectedItems.value.map((index: number) => users.value[index].id)
  let allSuccess = true

  for (const id of itemIds) {
    try {
      const { data } = await useFetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      })

      if (!data.value?.success) {
        allSuccess = false
      }
    }
    catch (error) {
      console.error(`Error deleting user ${id}:`, error)
      allSuccess = false
    }
  }

  if (allSuccess) {
    toast({
      title: 'Success',
      description: `${itemIds.length} users deleted successfully!`,
    })
  }
  else {
    toast({
      title: 'Warning',
      description: 'Some users could not be deleted.',
      variant: 'destructive',
    })
  }

  showMultiDeleteDialog.value = false
  selectedItems.value = []
  await loadData()
}

// Load data when component mounts
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          User Management
        </h1>
        <p class="text-muted-foreground">
          Manage system users
        </p>
      </div>
      <Button
        class="bg-primary hover:bg-primary/90"
        @click="createUserDialog?.open()"
      >
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        New User
      </Button>
    </div>

    <!-- User table with the new DataTable -->
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
      :data="users"
      :columns="columns"
      @delete="handleDeleteClick"
      @edit="user => editUserDialog?.open(user)"
      @selection-change="updateSelectedItems"
    />

    <!-- Action bar for multiple items -->
    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="showMultiDeleteConfirmation"
    />

    <!-- Dialog to create user -->
    <CreateUserDialog ref="createUserDialog" @user-created="loadData" />

    <!-- Dialog to edit user -->
    <EditUserDialog ref="editUserDialog" @user-updated="loadData" />

    <!-- Alert Dialog for individual delete confirmation -->
    <AlertDialog :open="isDeleteAlertOpen" @update:open="isDeleteAlertOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the user
            {{ selectedUser?.email }} and remove their data from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="isDeleteAlertOpen = false">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="deleteUser">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Multiple delete confirmation dialog -->
    <AlertDialog :open="showMultiDeleteDialog" @update:open="showMultiDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Multiple Users</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {{ selectedItems.length }} users? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showMultiDeleteDialog = false">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleMultiDeleteConfirm">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
