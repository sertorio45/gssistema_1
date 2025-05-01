<script setup lang="ts">
import { useSupabaseClient } from '#imports'
import { useToast } from '~/components/ui/toast'
import UserForm from '~/components/users/UserForm.vue'

const emit = defineEmits<{
  (e: 'userCreated'): void
}>()

const formRef = ref()
const { toast } = useToast()
const isOpen = ref(false)
const isLoading = ref(false)

// Função para criar usuário
async function handleSubmit(formData?: any) {
  if (isLoading.value) {
    return
  }

  const userForm = formRef.value
  if (!userForm?.validate()) {
    toast({
      title: 'Erro',
      description: 'Por favor, preencha todos os campos corretamente',
      variant: 'destructive',
    })
    return
  }

  isLoading.value = true

  try {
    const form = formData || userForm.form

    // Fazer requisição para o endpoint do backend
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        user_metadata: {
          name: form.user_metadata.name,
        },
      }),
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error)
    }

    toast({
      title: 'Sucesso',
      description: 'Usuário criado com sucesso',
    })

    // Fechar diálogo e emitir evento
    isOpen.value = false
    emit('userCreated')
  }
  catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    toast({
      title: 'Erro',
      description: error?.message || 'Não foi possível criar o usuário',
      variant: 'destructive',
    })
  }
  finally {
    isLoading.value = false
  }
}

// Expor método para abrir o diálogo
defineExpose({
  open: () => {
    isOpen.value = true
  },
})
</script>

<template>
  <Dialog :open="isOpen" @update:open="isOpen = $event">
    <DialogContent class="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>Adicionar Novo Usuário</DialogTitle>
        <DialogDescription>
          Preencha os campos abaixo para criar um novo usuário.
        </DialogDescription>
      </DialogHeader>

      <UserForm
        ref="formRef"
        @submit="handleSubmit"
        @cancel="isOpen = false"
      />

      <DialogFooter class="mt-6">
        <div class="flex gap-2">
          <Button variant="outline" @click="isOpen = false">
            Cancelar
          </Button>
          <Button
            :disabled="isLoading"
            class="min-w-24"
            @click="handleSubmit()"
          >
            <Icon v-if="isLoading" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ isLoading ? 'Salvando...' : 'Salvar' }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template> 