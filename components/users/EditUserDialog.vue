<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import { useToast } from '~/components/ui/toast'

const emit = defineEmits<{
  (e: 'userUpdated'): void
}>()

const { toast } = useToast()
const isOpen = ref(false)
const isLoading = ref(false)
const selectedUser = ref<any>(null)

// Função para atualizar usuário
async function handleSubmit(form: any) {
  if (!selectedUser.value) return

  isLoading.value = true

  try {
    const supabase = useSupabaseClient()
    
    // Verificar permissão do usuário
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const userMeta = currentUser?.user_metadata || {}
    
    if (userMeta.role !== 'admin') {
      toast({
        title: 'Erro',
        description: 'Apenas administradores podem editar usuários',
        variant: 'destructive',
      })
      return
    }

    // Preparar os metadados para atualização
    const userMetadata = {
      full_name: form.name,
    }

    // Atualizar dados do usuário no Supabase
    const { error } = await supabase.auth.admin.updateUserById(
      selectedUser.value.id,
      {
        email: form.email,
        user_metadata: userMetadata,
        banned: form.status === 0,
      },
    )

    if (error) throw error

    // Se a senha foi alterada, atualize-a separadamente
    if (form.password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        selectedUser.value.id,
        { password: form.password },
      )
      
      if (passwordError) throw passwordError
    }

    toast({
      title: 'Sucesso',
      description: 'Usuário atualizado com sucesso',
    })

    // Fechar diálogo e emitir evento
    isOpen.value = false
    emit('userUpdated')
  }
  catch (error: any) {
    console.error('Erro ao atualizar usuário:', error)
    toast({
      title: 'Erro',
      description: error?.message || 'Não foi possível atualizar o usuário',
      variant: 'destructive',
    })
  }
  finally {
    isLoading.value = false
  }
}

// Expor método para abrir o diálogo
defineExpose({
  open: (user: any) => {
    selectedUser.value = user
    isOpen.value = true
  },
})
</script>

<template>
  <Dialog :open="isOpen" @update:open="isOpen = $event">
    <DialogContent class="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>Editar Usuário</DialogTitle>
        <DialogDescription>
          Altere os campos que deseja atualizar.
        </DialogDescription>
      </DialogHeader>

      <UserForm
        v-if="selectedUser"
        :initial-form="{
          name: selectedUser.name,
          email: selectedUser.email,
          password: '',
          status: selectedUser.status,
        }"
        :is-editing="true"
        @submit="handleSubmit"
        @cancel="isOpen = false"
      />

      <DialogFooter class="mt-6 flex items-center justify-between">
        <div class="text-xs text-muted-foreground">
          Última atualização: {{ selectedUser ? new Date(selectedUser.updatedAt).toLocaleDateString('pt-BR') : '' }}
        </div>
        <div class="flex gap-2">
          <Button variant="outline" @click="isOpen = false">
            Cancelar
          </Button>
          <Button
            :disabled="isLoading"
            class="min-w-24"
            @click="handleSubmit"
          >
            <Icon v-if="isLoading" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ isLoading ? 'Atualizando...' : 'Atualizar' }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template> 