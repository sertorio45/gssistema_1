<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import { useToast } from '~/components/ui/toast'
import UserForm from './UserForm.vue'

const emit = defineEmits<{
  (e: 'userUpdated'): void
}>()

const { toast } = useToast()
const isOpen = ref(false)
const isLoading = ref(false)
const selectedUser = ref<any>(null)
const userForm = ref<any>(null)

// Função para atualizar usuário
async function handleSubmit() {
  if (!selectedUser.value || !userForm.value) {
    return
  }

  if (!userForm.value.validate()) {
    toast({
      title: 'Erro',
      description: 'Por favor, preencha os campos corretamente',
      variant: 'destructive',
    })
    return
  }

  isLoading.value = true

  try {
    const formData = userForm.value.form
    const updateData: any = {}

    if (formData.email) {
      updateData.email = formData.email
      updateData.email_confirm = true
    }

    if (formData.password && formData.password.trim() !== '') {
      updateData.password = formData.password
    }

    // Se não há dados para atualizar, retorna
    if (Object.keys(updateData).length === 0) {
      toast({
        title: 'Aviso',
        description: 'Nenhum dado foi alterado',
        variant: 'default',
      })
      return
    }

    const response = await fetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error)
    }

    toast({
      title: 'Sucesso',
      description: data.message,
    })

    isOpen.value = false
    emit('userUpdated')
  }
  catch (error: any) {
    toast({
      title: 'Erro',
      description: error.message,
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
          Altere o email ou senha do usuário.
        </DialogDescription>
      </DialogHeader>

      <UserForm
        ref="userForm"
        v-if="selectedUser"
        :initial-form="{
          email: selectedUser.email,
          password: '',
          user_metadata: { name: '' },
          email_confirm: true,
        }"
        :is-editing="true"
      />

      <DialogFooter class="mt-6 flex items-center justify-between">
        <div class="text-xs text-muted-foreground">
          Última atualização: {{ selectedUser ? new Date(selectedUser.updated_at).toLocaleDateString('pt-BR') : '' }}
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