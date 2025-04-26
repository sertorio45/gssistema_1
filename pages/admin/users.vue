<script setup lang="ts">
import { useToast } from '~/components/ui/toast'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin'],
})

// Definindo interface para o usuário
interface User {
  id: string
  name: string
  email: string
  bio: string | null
  avatar: string | null
  status: number
  role: string
  createdAt: string
  updatedAt: string
}

// Interface para o formulário
interface UserForm {
  name: string
  email: string
  password: string
  bio: string
  avatar: string
  status: number
  role: string
}

// Interface para validação de senha
interface PasswordStrength {
  hasMinLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumbers: boolean
  hasSpecialChars: boolean
  isValid: boolean
}

const { toast } = useToast()
const users = ref<User[]>([])
const isLoading = ref(true)
const isCreateDialogOpen = ref(false)
const isEditDialogOpen = ref(false)
const isDeleteAlertOpen = ref(false)
const selectedUser = ref<User | null>(null)
const originalFormState = ref<UserForm | null>(null)
const passwordStrength = ref<PasswordStrength>({
  hasMinLength: false,
  hasUppercase: false,
  hasLowercase: false,
  hasNumbers: false,
  hasSpecialChars: false,
  isValid: false,
})
const isUploading = ref(false)
const avatarPreview = ref<string | null>(null)

// Formulário de criação/edição
const form = ref({
  name: '',
  email: '',
  password: '',
  bio: '',
  avatar: '',
  status: 1,
  role: 'cliente',
})

// Reset do formulário
function resetForm() {
  form.value = {
    name: '',
    email: '',
    password: '',
    bio: '',
    avatar: '',
    status: 1,
    role: 'cliente',
  }
  avatarPreview.value = null
  validatePassword(form.value.password)
}

// Verificar força da senha
function validatePassword(password: string) {
  passwordStrength.value = {
    hasMinLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    isValid: false,
  }

  // Senha válida se atender a todos os critérios
  passwordStrength.value.isValid
    = passwordStrength.value.hasMinLength
      && passwordStrength.value.hasUppercase
      && passwordStrength.value.hasLowercase
      && passwordStrength.value.hasNumbers
      && passwordStrength.value.hasSpecialChars
}

// Gerar senha segura
function generateSecurePassword() {
  const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowerChars = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'

  const allChars = upperChars + lowerChars + numbers + specialChars
  let password = ''

  // Garantir pelo menos um de cada categoria
  password += upperChars.charAt(Math.floor(Math.random() * upperChars.length))
  password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length))
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length))

  // Completar até 12 caracteres
  for (let i = password.length; i < 12; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }

  // Embaralhar a senha
  password = password.split('').sort(() => 0.5 - Math.random()).join('')

  form.value.password = password
  validatePassword(password)
}

// Fazer upload de avatar
async function uploadAvatar(event: Event) {
  const fileInput = event.target as HTMLInputElement
  if (!fileInput.files || fileInput.files.length === 0)
    return

  const file = fileInput.files[0]

  // Validar tipo de arquivo
  if (!file.type.startsWith('image/')) {
    toast({
      title: 'Erro',
      description: 'O arquivo deve ser uma imagem',
      variant: 'destructive',
    })
    return
  }

  try {
    isUploading.value = true

    // Converter para base64
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = async () => {
      try {
        const imageData = reader.result

        // Mostrar preview
        avatarPreview.value = imageData as string

        // Enviar para o servidor
        const response = await $fetch('/api/upload/avatar', {
          method: 'POST',
          body: { imageData },
        })

        // Atualizar o campo avatar com a URL retornada
        form.value.avatar = response.avatarUrl

        toast({
          title: 'Sucesso',
          description: 'Avatar enviado com sucesso',
        })
      }
      catch (error: any) {
        console.error('Erro ao processar imagem:', error)
        toast({
          title: 'Erro',
          description: error?.data?.message || 'Não foi possível processar a imagem',
          variant: 'destructive',
        })
      }
      finally {
        isUploading.value = false
      }
    }

    reader.onerror = () => {
      toast({
        title: 'Erro',
        description: 'Erro ao ler o arquivo',
        variant: 'destructive',
      })
      isUploading.value = false
    }
  }
  catch (error: any) {
    console.error('Erro ao fazer upload do avatar:', error)
    toast({
      title: 'Erro',
      description: error?.data?.message || 'Não foi possível fazer o upload da imagem',
      variant: 'destructive',
    })
    isUploading.value = false
  }
}

// Carregar usuários
async function fetchUsers() {
  /**
   * Mockup de dados de usuários para fins de demonstração
   * Os dados reais seriam carregados da API do Supabase
   * Mantendo o campo role no frontend para simular diferentes níveis de acesso
   * Funções de CRUD também foram adaptadas para trabalhar com esses dados mockup
   */
  isLoading.value = true
  try {
    // Dados mockup em vez de requisição à API
    const mockupUsers: User[] = [
      {
        id: '1',
        name: 'João Silva',
        email: 'joao.silva@exemplo.com',
        bio: 'Administrador do sistema',
        avatar: '/avatars/user1.png',
        status: 1,
        role: 'admin',
        createdAt: new Date(2024, 0, 15).toISOString(),
        updatedAt: new Date(2024, 1, 20).toISOString(),
      },
      {
        id: '2',
        name: 'Maria Oliveira',
        email: 'maria.oliveira@exemplo.com',
        bio: 'Cliente premium',
        avatar: '/avatars/user2.png',
        status: 1,
        role: 'cliente',
        createdAt: new Date(2024, 1, 5).toISOString(),
        updatedAt: new Date(2024, 1, 5).toISOString(),
      },
      {
        id: '3',
        name: 'Pedro Santos',
        email: 'pedro.santos@exemplo.com',
        bio: 'Vendedor da região sul',
        avatar: '/avatars/user3.png',
        status: 1,
        role: 'vendedor',
        createdAt: new Date(2024, 2, 10).toISOString(),
        updatedAt: new Date(2024, 3, 15).toISOString(),
      },
      {
        id: '4',
        name: 'Ana Pereira',
        email: 'ana.pereira@exemplo.com',
        bio: 'Gerente de marketing',
        avatar: null,
        status: 1,
        role: 'gerente',
        createdAt: new Date(2024, 3, 1).toISOString(),
        updatedAt: new Date(2024, 3, 1).toISOString(),
      },
      {
        id: '5',
        name: 'Carlos Mendes',
        email: 'carlos.mendes@exemplo.com',
        bio: 'Cliente novo',
        avatar: '/avatars/user5.png',
        status: 0, // Inativo
        role: 'cliente',
        createdAt: new Date(2024, 4, 5).toISOString(),
        updatedAt: new Date(2024, 4, 5).toISOString(),
      },
    ]

    // Atribuir os dados mockup
    users.value = mockupUsers

    console.log('Dados mockup de usuários carregados com sucesso')
  }
  catch (error: any) {
    console.error('Erro ao buscar usuários:', error)
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

// Criar usuário
async function createUser() {
  // Verificar se a senha é válida
  if (!passwordStrength.value.isValid) {
    toast({
      title: 'Erro',
      description: 'A senha não atende aos requisitos de segurança',
      variant: 'destructive',
    })
    return
  }

  try {
    // Simulando um atraso de resposta da API
    await new Promise(resolve => setTimeout(resolve, 800))

    // Criar um novo ID único
    const newId = (Math.max(...users.value.map(u => Number.parseInt(u.id, 10))) + 1).toString()

    // Criar novo usuário com os dados do formulário
    const newUser: User = {
      id: newId,
      name: form.value.name,
      email: form.value.email,
      bio: form.value.bio,
      avatar: form.value.avatar,
      status: form.value.status,
      role: form.value.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Adicionar à lista de usuários
    users.value.push(newUser)

    toast({
      title: 'Sucesso',
      description: 'Usuário criado com sucesso',
    })

    // Fechar diálogo e resetar formulário
    isCreateDialogOpen.value = false
    resetForm()
  }
  catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    toast({
      title: 'Erro',
      description: 'Não foi possível criar o usuário',
      variant: 'destructive',
    })
  }
}

// Função para obter ícone e cor baseado na role
function getRoleIcon(role: string): { icon: string, color: string, badge: string, label: string } {
  switch (role) {
    case 'admin':
      return {
        icon: 'lucide:shield',
        color: 'text-purple-600',
        badge: 'bg-purple-100 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60',
        label: 'Administrador',
      }
    case 'funcionario':
      return {
        icon: 'lucide:briefcase',
        color: 'text-blue-600',
        badge: 'bg-blue-100 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60',
        label: 'Funcionário',
      }
    default:
      return {
        icon: 'lucide:user',
        color: 'text-green-600',
        badge: 'bg-green-100 dark:bg-green-950/30 border-green-200 dark:border-green-800/60',
        label: 'Cliente',
      }
  }
}

// Abrir edição de usuário
function openEditDialog(user: User) {
  selectedUser.value = user
  form.value = {
    name: user.name,
    email: user.email,
    password: '',
    bio: user.bio || '',
    avatar: user.avatar || '',
    status: user.status,
    role: user.role,
  }
  // Salvar estado original para comparação
  originalFormState.value = { ...form.value }
  avatarPreview.value = user.avatar
  validatePassword(form.value.password)
  isEditDialogOpen.value = true
}

// Verifica se houve alterações no formulário
function hasFormChanges(): boolean {
  if (!selectedUser.value || !originalFormState.value)
    return false

  // Se tiver senha, verifica se é válida
  if (form.value.password && !passwordStrength.value.isValid) {
    return false
  }

  // Verifica se há alguma diferença entre o estado atual e o original
  return form.value.name !== originalFormState.value.name
    || form.value.email !== originalFormState.value.email
    || form.value.bio !== originalFormState.value.bio
    || form.value.status !== originalFormState.value.status
    || form.value.avatar !== originalFormState.value.avatar
    || form.value.role !== originalFormState.value.role
    || form.value.password.length > 0
}

// Atualizar usuário
async function updateUser() {
  if (!selectedUser.value)
    return

  try {
    // Simulando um atraso de resposta da API
    await new Promise(resolve => setTimeout(resolve, 800))

    // Encontrar o índice do usuário na lista
    const userIndex = users.value.findIndex(u => u.id === selectedUser.value?.id)

    if (userIndex >= 0) {
      // Atualizar os dados do usuário
      users.value[userIndex] = {
        ...users.value[userIndex],
        name: form.value.name,
        email: form.value.email,
        bio: form.value.bio,
        avatar: avatarPreview.value || form.value.avatar,
        status: form.value.status,
        role: form.value.role,
        updatedAt: new Date().toISOString(),
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso',
      })

      // Fechar diálogo
      isEditDialogOpen.value = false
    }
    else {
      throw new Error('Usuário não encontrado')
    }
  }
  catch (error: any) {
    console.error('Erro ao atualizar usuário:', error)
    toast({
      title: 'Erro',
      description: 'Não foi possível atualizar o usuário',
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
  if (!selectedUser.value)
    return

  try {
    // Simulando um atraso de resposta da API
    await new Promise(resolve => setTimeout(resolve, 800))

    // Remover o usuário da lista
    users.value = users.value.filter(u => u.id !== selectedUser.value?.id)

    toast({
      title: 'Sucesso',
      description: 'Usuário excluído com sucesso',
    })

    // Fechar confirmação
    isDeleteAlertOpen.value = false
    selectedUser.value = null
  }
  catch (error: any) {
    console.error('Erro ao excluir usuário:', error)
    toast({
      title: 'Erro',
      description: 'Não foi possível excluir o usuário',
      variant: 'destructive',
    })
  }
}

// Formatação de data
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Alternar status do usuário diretamente na tabela
async function toggleUserStatus(user: User) {
  try {
    // Indicador de carregamento apenas para este usuário
    const userId = user.id

    // Novo status (inverso do atual)
    const newStatus = user.status === 1 ? 0 : 1
    console.error('Status a ser enviado:', { userId, oldStatus: user.status, newStatus })

    // Atualizar o status do usuário
    const _response = await $fetch<User>(`/api/users/${userId}`, {
      method: 'PATCH',
      body: { status: newStatus },
    })

    // Atualizar a lista de usuários localmente para feedback imediato
    users.value = users.value.map((u) => {
      if (u.id === userId) {
        return { ...u, status: newStatus }
      }
      return u
    })

    // Mostrar notificação de sucesso
    toast({
      title: 'Sucesso',
      description: `Status do usuário atualizado com sucesso`,
    })
  }
  catch (error: any) {
    console.error('Erro ao alterar status do usuário:', error)
    toast({
      title: 'Erro',
      description: error?.data?.message || 'Não foi possível alterar o status do usuário',
      variant: 'destructive',
    })

    // Recarregar usuários para garantir dados consistentes
    await fetchUsers()
  }
}

// Carregar usuários ao montar o componente
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Gerenciamento de Usuários
      </h1>
      <Button class="bg-primary hover:bg-primary/90" @click="isCreateDialogOpen = true; resetForm()">
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
              <TableHead class="w-14">
                Avatar
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Função</TableHead>
              <TableHead class="text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="isLoading">
              <TableRow v-for="i in 5" :key="i">
                <TableCell><Skeleton class="h-10 w-10 rounded-full" /></TableCell>
                <TableCell><Skeleton class="h-5 w-[250px]" /></TableCell>
                <TableCell><Skeleton class="h-5 w-[180px]" /></TableCell>
                <TableCell><Skeleton class="h-5 w-[150px]" /></TableCell>
                <TableCell><Skeleton class="h-5 w-[80px]" /></TableCell>
                <TableCell><Skeleton class="h-5 w-[100px]" /></TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-2">
                    <Skeleton class="h-8 w-8 rounded" />
                    <Skeleton class="h-8 w-8 rounded" />
                  </div>
                </TableCell>
              </TableRow>
            </template>
            <TableRow v-else-if="users.length === 0">
              <TableCell colspan="7" class="h-24 text-center">
                <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Icon name="lucide:users-x" class="h-8 w-8" />
                  <p>Nenhum usuário encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
            <template v-else>
              <TableRow v-for="user in users" :key="user.id" class="transition-colors hover:bg-muted/30">
                <TableCell class="text-center">
                  <Avatar size="sm" shape="circle" class="mx-auto border-2 border-muted">
                    <AvatarImage v-if="user.avatar" :src="user.avatar" />
                    <AvatarFallback class="bg-primary/10 text-primary">
                      {{ user.name.charAt(0).toUpperCase() }}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div class="font-medium">
                    {{ user.name }}
                  </div>
                </TableCell>
                <TableCell class="text-muted-foreground">
                  {{ user.email }}
                </TableCell>
                <TableCell class="text-sm text-muted-foreground">
                  {{ formatDate(user.createdAt) }}
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Switch
                      :checked="user.status === 1"
                      class="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200"
                      @update:checked="toggleUserStatus(user)"
                    />
                    <span class="text-xs font-medium" :class="user.status === 1 ? 'text-green-600' : 'text-red-600'">
                      {{ user.status === 1 ? 'Ativo' : 'Inativo' }}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div
                    class="inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="[getRoleIcon(user.role).badge, getRoleIcon(user.role).color]"
                  >
                    <Icon :name="getRoleIcon(user.role).icon" class="mr-1 h-3.5 w-3.5" />
                    {{ getRoleIcon(user.role).label }}
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
    <Dialog :open="isCreateDialogOpen" @update:open="isCreateDialogOpen = $event">
      <DialogContent class="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para criar um novo usuário.
          </DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-1 gap-6 py-4 md:grid-cols-[250px_1fr]">
          <!-- Coluna do Avatar -->
          <div class="flex flex-col items-center gap-4">
            <Avatar size="lg" class="h-40 w-40 border-2 border-muted">
              <AvatarImage v-if="avatarPreview" :src="avatarPreview" />
              <AvatarFallback class="text-4xl">
                {{ form.name ? form.name.charAt(0).toUpperCase() : 'U' }}
              </AvatarFallback>
            </Avatar>

            <div class="w-full flex flex-col items-center gap-2">
              <label
                for="new-avatar-upload"
                class="h-9 w-full inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-center text-sm text-primary-foreground font-medium hover:bg-primary/90"
              >
                Selecionar Imagem
              </label>
              <Input
                id="new-avatar-upload"
                type="file"
                accept="image/*"
                class="hidden"
                :disabled="isUploading"
                @change="uploadAvatar"
              />
              <p class="text-xs text-muted-foreground">
                JPG, PNG ou GIF. Máximo 5MB.
              </p>
            </div>

            <!-- Status do usuário -->
            <div class="mt-4 w-full">
              <div class="mb-3 text-sm text-muted-foreground font-medium">
                STATUS
              </div>
              <div
                class="grid grid-cols-2 w-full overflow-hidden border rounded-md"
              >
                <button
                  type="button"
                  class="px-4 py-2 text-center text-sm font-medium transition-colors"
                  :class="form.status === 1
                    ? 'bg-green-500/20 text-green-700'
                    : 'bg-background hover:bg-muted/30 border-r'"
                  @click="form.status = 1"
                >
                  <div class="flex items-center justify-center gap-2">
                    <div class="h-2 w-2 rounded-full bg-green-500" />
                    Ativo
                  </div>
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-center text-sm font-medium transition-colors"
                  :class="form.status === 0
                    ? 'bg-red-500/10 text-red-700'
                    : 'bg-background hover:bg-muted/30'"
                  @click="form.status = 0"
                >
                  <div class="flex items-center justify-center gap-2">
                    <div class="h-2 w-2 rounded-full bg-red-500" />
                    Inativo
                  </div>
                </button>
              </div>
            </div>

            <!-- Role do usuário -->
            <div class="mt-4 w-full">
              <div class="mb-3 text-sm text-muted-foreground font-medium">
                FUNÇÃO
              </div>
              <div class="grid grid-cols-1 w-full gap-1 overflow-hidden border rounded-md p-1">
                <button
                  type="button"
                  class="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors"
                  :class="form.role === 'admin'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-background hover:bg-muted/30'"
                  @click="form.role = 'admin'"
                >
                  <Icon name="lucide:shield" class="h-4 w-4" />
                  Administrador
                </button>
                <button
                  type="button"
                  class="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors"
                  :class="form.role === 'funcionario'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-background hover:bg-muted/30'"
                  @click="form.role = 'funcionario'"
                >
                  <Icon name="lucide:briefcase" class="h-4 w-4" />
                  Funcionário
                </button>
                <button
                  type="button"
                  class="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors"
                  :class="form.role === 'cliente'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-background hover:bg-muted/30'"
                  @click="form.role = 'cliente'"
                >
                  <Icon name="lucide:user" class="h-4 w-4" />
                  Cliente
                </button>
              </div>
            </div>
          </div>

          <!-- Coluna de Campos -->
          <div class="space-y-6">
            <!-- Informações Básicas -->
            <div>
              <h3 class="mb-3 text-sm text-muted-foreground font-medium">
                INFORMAÇÕES PESSOAIS
              </h3>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="grid gap-2">
                  <Label for="name">Nome</Label>
                  <Input id="name" v-model="form.name" placeholder="Nome completo" />
                </div>
                <div class="grid gap-2">
                  <Label for="email">Email</Label>
                  <Input id="email" v-model="form.email" placeholder="exemplo@email.com" />
                </div>
                <div class="grid gap-2 md:col-span-2">
                  <Label for="bio">Biografia</Label>
                  <Textarea
                    id="bio"
                    v-model="form.bio"
                    placeholder="Uma breve descrição sobre o usuário"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <!-- Credenciais -->
            <div>
              <h3 class="mb-3 text-sm text-muted-foreground font-medium">
                CREDENCIAIS
              </h3>
              <div class="grid gap-2">
                <div class="flex items-center justify-between">
                  <Label for="password">Senha</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 px-2 py-1 text-xs"
                    @click="generateSecurePassword"
                  >
                    Gerar Senha
                  </Button>
                </div>
                <PasswordInput
                  id="password"
                  v-model="form.password"
                  placeholder="********"
                  @input="validatePassword(form.password)"
                />

                <!-- Indicador de força da senha -->
                <div class="mt-2 rounded-md bg-muted/50 p-3">
                  <div class="mb-2 text-sm font-medium">
                    Requisitos de senha:
                  </div>
                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <div :class="passwordStrength.hasMinLength ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasMinLength ? '✓' : '✗' }}</span>
                      Mínimo de 12 caracteres
                    </div>
                    <div :class="passwordStrength.hasUppercase ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasUppercase ? '✓' : '✗' }}</span>
                      Letra maiúscula
                    </div>
                    <div :class="passwordStrength.hasLowercase ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasLowercase ? '✓' : '✗' }}</span>
                      Letra minúscula
                    </div>
                    <div :class="passwordStrength.hasNumbers ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasNumbers ? '✓' : '✗' }}</span>
                      Número
                    </div>
                    <div :class="passwordStrength.hasSpecialChars ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasSpecialChars ? '✓' : '✗' }}</span>
                      Caractere especial
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="mt-6">
          <div class="flex gap-2">
            <Button variant="outline" @click="isCreateDialogOpen = false">
              Cancelar
            </Button>
            <Button
              :disabled="!passwordStrength.isValid"
              class="min-w-24"
              @click="createUser"
            >
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog para editar usuário -->
    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Altere os campos que deseja atualizar.
          </DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-1 gap-6 py-4 md:grid-cols-[250px_1fr]">
          <!-- Coluna do Avatar -->
          <div class="flex flex-col items-center gap-4">
            <Avatar size="lg" class="h-40 w-40 border-2 border-muted">
              <AvatarImage v-if="avatarPreview" :src="avatarPreview" />
              <AvatarFallback class="text-4xl">
                {{ form.name ? form.name.charAt(0).toUpperCase() : 'U' }}
              </AvatarFallback>
            </Avatar>

            <div class="w-full flex flex-col items-center gap-2">
              <label
                for="avatar-upload"
                class="h-9 w-full inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-center text-sm text-primary-foreground font-medium hover:bg-primary/90"
              >
                Alterar Imagem
              </label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                class="hidden"
                :disabled="isUploading"
                @change="uploadAvatar"
              />
              <p class="text-xs text-muted-foreground">
                JPG, PNG ou GIF. Máximo 5MB.
              </p>
            </div>

            <!-- Status do usuário -->
            <div class="mt-4 w-full">
              <div class="mb-3 text-sm text-muted-foreground font-medium">
                STATUS
              </div>
              <div
                class="grid grid-cols-2 w-full overflow-hidden border rounded-md"
              >
                <button
                  type="button"
                  class="px-4 py-2 text-center text-sm font-medium transition-colors"
                  :class="form.status === 1
                    ? 'bg-green-500/20 text-green-700'
                    : 'bg-background hover:bg-muted/30 border-r'"
                  @click="form.status = 1"
                >
                  <div class="flex items-center justify-center gap-2">
                    <div class="h-2 w-2 rounded-full bg-green-500" />
                    Ativo
                  </div>
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-center text-sm font-medium transition-colors"
                  :class="form.status === 0
                    ? 'bg-red-500/10 text-red-700'
                    : 'bg-background hover:bg-muted/30'"
                  @click="form.status = 0"
                >
                  <div class="flex items-center justify-center gap-2">
                    <div class="h-2 w-2 rounded-full bg-red-500" />
                    Inativo
                  </div>
                </button>
              </div>
            </div>

            <!-- Role do usuário -->
            <div class="mt-4 w-full">
              <div class="mb-3 text-sm text-muted-foreground font-medium">
                FUNÇÃO
              </div>
              <div class="grid grid-cols-1 w-full gap-1 overflow-hidden border rounded-md p-1">
                <button
                  type="button"
                  class="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors"
                  :class="form.role === 'admin'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-background hover:bg-muted/30'"
                  @click="form.role = 'admin'"
                >
                  <Icon name="lucide:shield" class="h-4 w-4" />
                  Administrador
                </button>
                <button
                  type="button"
                  class="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors"
                  :class="form.role === 'funcionario'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-background hover:bg-muted/30'"
                  @click="form.role = 'funcionario'"
                >
                  <Icon name="lucide:briefcase" class="h-4 w-4" />
                  Funcionário
                </button>
                <button
                  type="button"
                  class="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors"
                  :class="form.role === 'cliente'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-background hover:bg-muted/30'"
                  @click="form.role = 'cliente'"
                >
                  <Icon name="lucide:user" class="h-4 w-4" />
                  Cliente
                </button>
              </div>
            </div>
          </div>

          <!-- Coluna de Campos -->
          <div class="space-y-6">
            <!-- Informações Básicas -->
            <div>
              <h3 class="mb-3 text-sm text-muted-foreground font-medium">
                INFORMAÇÕES PESSOAIS
              </h3>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="grid gap-2">
                  <Label for="edit-name">Nome</Label>
                  <Input id="edit-name" v-model="form.name" placeholder="Nome completo" />
                </div>
                <div class="grid gap-2">
                  <Label for="edit-email">Email</Label>
                  <Input id="edit-email" v-model="form.email" placeholder="exemplo@email.com" />
                </div>
                <div class="grid gap-2 md:col-span-2">
                  <Label for="edit-bio">Biografia</Label>
                  <Textarea
                    id="edit-bio"
                    v-model="form.bio"
                    placeholder="Uma breve descrição sobre o usuário"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <!-- Credenciais -->
            <div>
              <h3 class="mb-3 text-sm text-muted-foreground font-medium">
                CREDENCIAIS
              </h3>
              <div class="grid gap-2">
                <div class="flex items-center justify-between">
                  <Label for="edit-password">Senha (deixe em branco para manter)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 px-2 py-1 text-xs"
                    @click="generateSecurePassword"
                  >
                    Gerar Senha
                  </Button>
                </div>
                <PasswordInput
                  id="edit-password"
                  v-model="form.password"
                  placeholder="Nova senha"
                  @input="validatePassword(form.password)"
                />

                <!-- Indicador de força da senha (apenas se estiver alterando a senha) -->
                <div v-if="form.password" class="mt-2 rounded-md bg-muted/50 p-3">
                  <div class="mb-2 text-sm font-medium">
                    Requisitos de senha:
                  </div>
                  <div class="grid grid-cols-2 gap-x-6 gap-y-1">
                    <div :class="passwordStrength.hasMinLength ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasMinLength ? '✓' : '✗' }}</span>
                      Mínimo de 12 caracteres
                    </div>
                    <div :class="passwordStrength.hasUppercase ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasUppercase ? '✓' : '✗' }}</span>
                      Letra maiúscula
                    </div>
                    <div :class="passwordStrength.hasLowercase ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasLowercase ? '✓' : '✗' }}</span>
                      Letra minúscula
                    </div>
                    <div :class="passwordStrength.hasNumbers ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasNumbers ? '✓' : '✗' }}</span>
                      Número
                    </div>
                    <div :class="passwordStrength.hasSpecialChars ? 'text-green-500' : 'text-red-500'" class="flex items-center text-sm">
                      <span class="mr-1 text-xs">{{ passwordStrength.hasSpecialChars ? '✓' : '✗' }}</span>
                      Caractere especial
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="mt-6 flex items-center justify-between">
          <div class="text-xs text-muted-foreground">
            Última atualização: {{ selectedUser ? formatDate(selectedUser.updatedAt) : '' }}
          </div>
          <div class="flex gap-2">
            <Button variant="outline" @click="isEditDialogOpen = false">
              Cancelar
            </Button>
            <Button
              :disabled="!hasFormChanges()"
              class="min-w-24"
              @click="updateUser"
            >
              Atualizar
            </Button>
          </div>
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
            {{ selectedUser?.name }} e removerá seus dados do sistema.
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
