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
  requiredRoles: ['admin', 'funcionario'],
})

interface User {
  id: string
  email: string
  role: string
  tenant_name?: string | null
}

const { toast } = useToast()
const users = ref<User[]>([])
const isLoading = ref(true)
const isDeleteAlertOpen = ref(false)
const selectedUser = ref<User | null>(null)
const selectedItems = ref([])
const showMultiDeleteDialog = ref(false)

async function loadData() {
  isLoading.value = true
  try {
    await refresh()
    if (usersData.value?.users)
      users.value = usersData.value.users
  }
  catch (error) {
    console.error('Erro ao carregar usuários:', error)
    toast({
      title: 'Erro',
      description: 'Não foi possível carregar os usuários',
      variant: 'destructive',
    })
  }
  finally {
    isLoading.value = false
  }
}

function handleDeleteClick(user: User) {
  selectedUser.value = user
  isDeleteAlertOpen.value = true
}

async function deleteUser() {
  if (!selectedUser.value)
    return

  try {
    const { data } = await useFetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'DELETE',
    })

    if (!data.value?.success)
      throw new Error('Erro ao excluir usuário')

    toast({
      title: 'Sucesso',
      description: 'Usuário excluído com sucesso',
    })

    isDeleteAlertOpen.value = false
    selectedUser.value = null
    await loadData()
  }
  catch (error: any) {
    console.error('Erro ao excluir usuário:', error)
    toast({
      title: 'Erro',
      description: error?.message || 'Não foi possível excluir o usuário',
      variant: 'destructive',
    })
  }
}

function updateSelectedItems(items: any) {
  selectedItems.value = items
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

async function handleMultiDeleteConfirm() {
  const itemIds = selectedItems.value.map((index: number) => users.value[index].id)
  let allSuccess = true

  for (const id of itemIds) {
    try {
      const { data } = await useFetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      })

      if (!data.value?.success)
        allSuccess = false
    }
    catch (error) {
      console.error(`Erro ao excluir usuário ${id}:`, error)
      allSuccess = false
    }
  }

  if (allSuccess) {
    toast({
      title: 'Sucesso',
      description: `${itemIds.length} usuário(s) excluído(s) com sucesso`,
    })
  }
  else {
    toast({
      title: 'Aviso',
      description: 'Alguns usuários não puderam ser excluídos',
      variant: 'destructive',
    })
  }

  showMultiDeleteDialog.value = false
  selectedItems.value = []
  await loadData()
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Usuários do sistema
        </h1>
        <p class="text-muted-foreground">
          Crie usuários e vincule à empresa (tenant) correspondente
        </p>
      </div>
      <Button class="bg-primary hover:bg-primary/90" @click="createUserDialog?.open()">
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        Novo usuário
      </Button>
    </div>

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

    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="showMultiDeleteConfirmation"
    />

    <CreateUserDialog ref="createUserDialog" @user-created="loadData" />
    <EditUserDialog ref="editUserDialog" @user-updated="loadData" />

    <AlertDialog :open="isDeleteAlertOpen" @update:open="isDeleteAlertOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O usuário
            <span class="font-medium">{{ selectedUser?.email }}</span>
            será excluído permanentemente do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="isDeleteAlertOpen = false">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="deleteUser"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="showMultiDeleteDialog" @update:open="showMultiDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir vários usuários</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir {{ selectedItems.length }} usuário(s)? Esta ação não pode ser desfeita.
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
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
