<script setup lang="ts">
import { useToast } from '~/components/ui/toast'
import UserForm from '~/components/users/UserForm.vue'
import { unref } from 'vue'

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
      description: 'Preencha todos os campos corretamente, incluindo a empresa quando necessário',
      variant: 'destructive',
    })
    return
  }

  isLoading.value = true

  try {
    const form = formData || unref(userForm.form)

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        name: form.user_metadata.name,
        role: form.role,
        tenant_id: form.tenant.tenantMode === 'existing' ? form.tenant.tenant_id : null,
        create_tenant: form.tenant.tenantMode === 'new',
        tenant_name: form.tenant.tenantMode === 'new' ? form.tenant.new_tenant_name : undefined,
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
    <DialogContent class="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Adicionar Novo Usuário</DialogTitle>
        <DialogDescription> Preencha os campos abaixo para criar um novo usuário. </DialogDescription>
      </DialogHeader>

      <UserForm ref="formRef" @submit="handleSubmit" @cancel="isOpen = false" />

      <DialogFooter class="mt-6">
        <div class="flex gap-2">
          <Button variant="outline" @click="isOpen = false">
            Cancelar
          </Button>
          <Button :disabled="isLoading" class="min-w-24" @click="handleSubmit()">
            <Icon v-if="isLoading" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ isLoading ? 'Salvando...' : 'Salvar' }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
