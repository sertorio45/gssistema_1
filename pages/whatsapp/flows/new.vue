<script setup lang="ts">
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Novo flow',
})

const { createFlow } = useWhatsAppFlows()

const name = ref('')
const description = ref('')
const saving = ref(false)

async function handleCreate() {
  if (!name.value.trim()) {
    toast.error('Informe o nome do flow')
    return
  }

  saving.value = true
  try {
    const flow = await createFlow({
      name: name.value.trim(),
      description: description.value.trim() || undefined,
    })
    toast.success('Flow criado')
    navigateTo(`/whatsapp/flows/${flow.id}`)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao criar')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <WhatsAppPageHeader
      title="Novo flow"
      description="Depois você monta o fluxo visual no editor Drawflow."
    >
      <template #actions>
        <NuxtLink to="/whatsapp/flows">
          <Button variant="outline">
            Voltar
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <div class="space-y-4 rounded-xl border p-6">
      <div class="space-y-2">
        <Label for="flow-name">Nome</Label>
        <Input id="flow-name" v-model="name" placeholder="Ex: Boas-vindas automático" />
      </div>
      <div class="space-y-2">
        <Label for="flow-description">Descrição</Label>
        <Textarea id="flow-description" v-model="description" rows="3" placeholder="Opcional" />
      </div>
      <Button :disabled="saving" @click="handleCreate">
        {{ saving ? 'Criando...' : 'Criar e abrir editor' }}
      </Button>
    </div>
  </div>
</template>
