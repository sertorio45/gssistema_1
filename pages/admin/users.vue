<script setup lang="ts">
import { onMounted, ref } from 'vue'
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

// Carregar dados
async function loadData() {
  isLoading.value = true
  try {
    await refresh()
    if (usersData.value?.users) {
      users.value = usersData.value.users
    }
  }
  catch (error) {
    console.error('Erro ao carregar dados:', error)
    toast({
      title: 'Erro',
      description: 'Não foi possível carregar os dados',
      variant: 'destructive',
    })
  }
  finally {
    isLoading.value = false
  }
}

// Abrir diálogo de confirmação de exclusão
function openDeleteAlert(user: User) {
  selectedUser.value = user
  isDeleteAlertOpen.value = true
}

// Excluir usuário
async function deleteUser() {
  if (!selectedUser.value) {
    return
  }

  try {
    const { data } = await useFetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'DELETE',
    })

    if (!data.value?.success) {
      throw new Error(data.value?.error || 'Erro ao excluir usuário')
    }

    toast({
      title: 'Sucesso',
      description: 'Usuário excluído com sucesso',
    })

    // Fechar confirmação e recarregar dados
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

// Carregar dados ao montar o componente
onMounted(() => {
  loadData()
})
</script>

<template>
  <!-- Topo abaixo de breadcrumb -->
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Gerenciamento de Usuários
      </h1>
      <Button
        class="bg-primary hover:bg-primary/90"
        @click="createUserDialog?.open()"
      >
        <Icon name="lucide:plus-circle" class="mr-2 h-4 w-4" />
        Novo Usuário
      </Button>
    </div>

    <!-- Tabela de usuários -->
    <Card class="border shadow-sm">
      <CardContent class="p-0">
        <Table>
          <TableHeader class="bg-muted/50">
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead class="text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="isLoading">
              <TableRow v-for="i in 5" :key="i">
                <TableCell><Skeleton class="h-5 w-[250px]" /></TableCell>
                <TableCell><Skeleton class="h-5 w-[180px]" /></TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-2">
                    <Skeleton class="h-8 w-8 rounded" />
                    <Skeleton class="h-8 w-8 rounded" />
                  </div>
                </TableCell>
              </TableRow>
            </template>
            <TableRow v-else-if="users.length === 0">
              <TableCell colspan="3" class="h-24 text-center">
                <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Icon name="lucide:users-x" class="h-8 w-8" />
                  <p>Nenhum usuário encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
            <template v-else>
              <TableRow v-for="user in users" :key="user.id" class="transition-colors hover:bg-muted/30">
                <TableCell class="text-muted-foreground">
                  {{ user.email }}
                </TableCell>
                <TableCell>
                  <div
                    class="inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="{
                      'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300': user.role === 'admin',
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300': user.role === 'funcionario',
                      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300': user.role === 'cliente',
                    }"
                  >
                    <Icon
                      :name="{
                        admin: 'lucide:shield',
                        funcionario: 'lucide:briefcase',
                        cliente: 'lucide:user',
                      }[user.role]"
                      class="mr-1 h-3.5 w-3.5"
                    />
                    {{
                      {
                        admin: 'Administrador',
                        funcionario: 'Funcionário',
                        cliente: 'Cliente',
                      }[user.role]
                    }}
                  </div>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-muted-foreground hover:text-primary"
                      @click="editUserDialog?.open(user)"
                    >
                      <Icon name="lucide:pencil" class="h-4 w-4" />
                      <span class="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive"
                      @click="openDeleteAlert(user)"
                    >
                      <Icon name="lucide:trash-2" class="h-4 w-4" />
                      <span class="sr-only">Excluir</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Dialog para criar usuário -->
    <CreateUserDialog ref="createUserDialog" @user-created="loadData" />

    <!-- Dialog para editar usuário -->
    <EditUserDialog ref="editUserDialog" @user-updated="loadData" />

    <!-- Alert Dialog para confirmação de exclusão -->
    <AlertDialog :open="isDeleteAlertOpen" @update:open="isDeleteAlertOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário
            {{ selectedUser?.email }} e removerá seus dados do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="isDeleteAlertOpen = false">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="deleteUser">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
