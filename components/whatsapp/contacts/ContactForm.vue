<script setup lang="ts">
import type { WhatsAppContact } from '~/types/whatsapp'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import { toast } from 'vue-sonner'

const props = defineProps<{
  initialData?: Partial<WhatsAppContact> | null
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const { createContact, updateContact } = useWhatsAppContacts()
const isSubmitting = ref(false)

const form = reactive({
  name: props.initialData?.name || '',
  phone: props.initialData?.phone || '',
  tagsText: (props.initialData?.tags || []).join(', '),
  optIn: props.initialData?.optIn ?? true,
  blocked: props.initialData?.blocked ?? false,
})

watch(() => props.initialData, (data) => {
  form.name = data?.name || ''
  form.phone = data?.phone || ''
  form.tagsText = (data?.tags || []).join(', ')
  form.optIn = data?.optIn ?? true
  form.blocked = data?.blocked ?? false
})

async function handleSubmit() {
  if (!form.phone.trim()) {
    toast.error('Informe o telefone')
    return
  }

  const tags = form.tagsText
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  isSubmitting.value = true
  try {
    if (props.initialData?.id) {
      await updateContact(props.initialData.id, {
        name: form.name.trim() || undefined,
        phone: form.phone.trim(),
        tags,
        opt_in: form.optIn,
        blocked: form.blocked,
      })
      toast.success('Contato atualizado')
    }
    else {
      await createContact({
        name: form.name.trim() || undefined,
        phone: form.phone.trim(),
        tags,
        opt_in: form.optIn,
        blocked: form.blocked,
      })
      toast.success('Contato criado')
    }
    emit('success')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao salvar contato')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form id="whatsapp-contact-form" class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-2">
      <Label for="wa-name">Nome</Label>
      <Input id="wa-name" v-model="form.name" placeholder="Nome do contato" />
    </div>

    <div class="space-y-2">
      <Label for="wa-phone">Telefone *</Label>
      <Input
        id="wa-phone"
        v-model="form.phone"
        placeholder="5511999999999"
        v-maska
        data-maska="['+## (##) #####-####', '#####################']"
      />
    </div>

    <div class="space-y-2">
      <Label for="wa-tags">Tags</Label>
      <Textarea
        id="wa-tags"
        v-model="form.tagsText"
        placeholder="cliente, vip (separadas por vírgula)"
        rows="2"
      />
    </div>

    <div class="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p class="text-sm font-medium">
          Opt-in
        </p>
        <p class="text-xs text-muted-foreground">
          Contato autorizou receber mensagens
        </p>
      </div>
      <Switch v-model:checked="form.optIn" />
    </div>

    <div class="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p class="text-sm font-medium">
          Bloqueado
        </p>
        <p class="text-xs text-muted-foreground">
          Impede envio de mensagens
        </p>
      </div>
      <Switch v-model:checked="form.blocked" />
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancel')">
        Cancelar
      </Button>
      <Button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Salvando...' : 'Salvar' }}
      </Button>
    </div>
  </form>
</template>
