<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToast } from '~/components/ui/toast'
import CreateUserDialog from '~/components/users/CreateUserDialog.vue'

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
const isCreateDialogOpen = ref(false)
const isEditDialogOpen = ref(false)
const isDeleteAlertOpen = ref(false)
const selectedUser = ref<User | null>(null)

// Formulário de criação/edição
const form = ref({
  email: '',
  role: '',
  password: '',
  confirmPassword: ''
})

// Reset do formulário
function resetForm() {
  form.value = {
    email: '',
    role: '',
    password: '',
    confirmPassword: ''
  }
}

// Função para abrir o diálogo de criação de usuário
function openCreateUserDialog() {
  isCreateDialogOpen.value = true
}

// Carregar dados
async function loadData() {
  isLoading.value = true
  try {
    await refresh()
    if (usersData.value?.users) {
      users.value = usersData.value.users
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
    toast({
      title: 'Erro',
      description: 'Não foi possível carregar os dados',
      variant: 'destructive',
    })
  } finally {
    isLoading.value = false
  }
}

// Validar senha
function validatePassword() {
  if (form.value.password !== form.value.confirmPassword) {
    toast({
      title: 'Erro',
      description: 'As senhas não coincidem',
      variant: 'destructive'
    })
    return false
  }
  if (form.value.password.length < 6) {
    toast({
      title: 'Erro',
      description: 'A senha deve ter no mínimo 6 caracteres',
      variant: 'destructive'
    })
    return false
  }
  return true
}

// Abrir edição de usuário
function openEditDialog(user: User) {
  selectedUser.value = user
  form.value = {
    email: user.email,
    role: user.role,
    password: '',
    confirmPassword: ''
  }
  isEditDialogOpen.value = true
}

// Atualizar usuário
async function updateUser() {
  if (!selectedUser.value) return

  // Se a senha foi preenchida, valide-a
  if (form.value.password && !validatePassword()) return

  try {
    const { error } = await useFetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'PUT',
      body: {
        email: form.value.email,
        role: form.value.role,
        ...(form.value.password && { password: form.value.password })
      },
    })

    if (error.value) throw error.value

    toast({
      title: 'Sucesso',
      description: 'Usuário atualizado com sucesso',
    })

    // Fechar diálogo e recarregar dados
    isEditDialogOpen.value = false
    await loadData()
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error)
    toast({
      title: 'Erro',
      description: error?.message || 'Não foi possível atualizar o usuário',
      variant: 'destructive',
    })
  }
}

// Abrir diálogo de confirmação de exclusão
function openDeleteAlert(user: User) {
  selectedUser.value = user
  isDeleteAlertOpen.value = true
}

// Excluir usuário
async function deleteUser() {
  if (!selectedUser.value) return

  try {
    const { error } = await useFetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'DELETE',
    })

    if (error.value) throw error.value

    toast({
      title: 'Sucesso',
      description: 'Usuário excluído com sucesso',
    })

    // Fechar confirmação e recarregar dados
    isDeleteAlertOpen.value = false
    selectedUser.value = null
    await loadData()
  } catch (error: any) {
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
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Gerenciamento de Usuários
      </h1>
      <Button class="bg-primary hover:bg-primary/90" @click="$refs.createUserDialog.open()">
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
                      variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary"
                      @click="openEditDialog(user)"
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
    <CreateUserDialog ref="createUserDialog" @userCreated="loadData" />

    <!-- Dialog para editar usuário -->
    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Altere os campos que deseja atualizar. Deixe a senha em branco para mantê-la inalterada.
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" v-model="form.email" placeholder="exemplo@email.com" />
          </div>
          <div class="grid gap-2">
            <Label for="role">Função</Label>
            <Select v-model="form.role">
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="role in ['admin', 'funcionario', 'cliente']" :key="role" :value="role">
                  {{ role }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label for="password">Nova Senha</Label>
            <Input id="password" v-model="form.password" type="password" placeholder="Deixe em branco para manter a senha atual" />
          </div>
          <div class="grid gap-2">
            <Label for="confirmPassword">Confirmar Nova Senha</Label>
            <Input id="confirmPassword" v-model="form.confirmPassword" type="password" placeholder="Confirme a nova senha" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="isEditDialogOpen = false">
            Cancelar
          </Button>
          <Button @click="updateUser">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
