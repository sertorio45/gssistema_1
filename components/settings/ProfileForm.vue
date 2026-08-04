<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'

import { toast } from '~/components/ui/toast'
import { useUserProfile } from '~/composables/useUserProfile'

const {
  user,
  email,
  displayName,
  phone,
  avatarUrl,
  saving,
  uploading,
  uploadAvatar,
  removeAvatar,
  updateProfile,
} = useUserProfile()

const fileInput = ref<HTMLInputElement | null>(null)

const profileFormSchema = toTypedSchema(
  z.object({
    name: z
      .string({ required_error: 'Informe seu nome.' })
      .min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' })
      .max(80, { message: 'O nome deve ter no máximo 80 caracteres.' }),
    phone: z.string().max(20, { message: 'Telefone inválido.' }).optional(),
  }),
)

const { handleSubmit, resetForm } = useForm({
  validationSchema: profileFormSchema,
  initialValues: {
    name: displayName.value,
    phone: phone.value,
  },
})

// Auth user loads asynchronously — sync the form when data arrives
watch(user, (value) => {
  if (value)
    resetForm({ values: { name: displayName.value, phone: phone.value } })
}, { immediate: true })

const onSubmit = handleSubmit(async (values) => {
  const result = await updateProfile({ name: values.name, phone: values.phone })

  if (result.success) {
    toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas com sucesso.' })
  }
  else {
    toast({ title: 'Erro ao salvar', description: result.error, variant: 'destructive' })
  }
})

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file)
    return

  const result = await uploadAvatar(file)

  if (result.success) {
    toast({ title: 'Foto atualizada', description: 'Sua foto de perfil foi alterada.' })
  }
  else {
    toast({ title: 'Erro ao enviar foto', description: result.error, variant: 'destructive' })
  }
}

async function handleRemoveAvatar() {
  const result = await removeAvatar()

  if (result.success) {
    toast({ title: 'Foto removida', description: 'Sua foto de perfil foi removida.' })
  }
  else {
    toast({ title: 'Erro ao remover foto', description: result.error, variant: 'destructive' })
  }
}
</script>

<template>
  <div>
    <h3 class="text-lg font-medium">
      Perfil
    </h3>
    <p class="text-sm text-muted-foreground">
      Estas são as informações da sua conta no sistema.
    </p>
  </div>
  <Separator />

  <!-- Avatar -->
  <div class="flex items-center gap-5">
    <button
      type="button"
      class="group relative shrink-0 rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      :disabled="uploading"
      aria-label="Alterar foto de perfil"
      @click="openFilePicker"
    >
      <UserAvatar
        :name="displayName"
        :email="email"
        :src="avatarUrl || null"
        size="xl"
      />
      <span
        class="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100"
        :class="{ 'opacity-100': uploading }"
      >
        <Icon v-if="uploading" name="i-lucide-loader-2" class="size-5 animate-spin" />
        <Icon v-else name="i-lucide-camera" class="size-5" />
      </span>
    </button>

    <div class="space-y-2">
      <div class="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" :disabled="uploading" @click="openFilePicker">
          <Icon name="i-lucide-upload" class="mr-1.5 size-3.5" />
          Alterar foto
        </Button>
        <Button
          v-if="avatarUrl"
          type="button"
          variant="ghost"
          size="sm"
          class="text-muted-foreground hover:text-destructive"
          :disabled="uploading"
          @click="handleRemoveAvatar"
        >
          <Icon name="i-lucide-trash-2" class="mr-1.5 size-3.5" />
          Remover
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">
        JPG, PNG, WEBP ou GIF. Tamanho máximo de 5MB.
      </p>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      @change="handleFileChange"
    >
  </div>

  <!-- Dados -->
  <form class="space-y-6" @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="name">
      <FormItem>
        <FormLabel>Nome completo</FormLabel>
        <FormControl>
          <Input type="text" placeholder="Seu nome" v-bind="componentField" />
        </FormControl>
        <FormDescription>
          É assim que seu nome aparece no sistema.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="phone">
      <FormItem>
        <FormLabel>Telefone</FormLabel>
        <FormControl>
          <Input type="tel" placeholder="(00) 00000-0000" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="space-y-2">
      <Label for="profile-email">E-mail</Label>
      <Input id="profile-email" type="email" :model-value="email" disabled />
      <p class="text-sm text-muted-foreground">
        O e-mail de acesso não pode ser alterado por aqui.
      </p>
    </div>

    <div class="flex justify-start">
      <Button type="submit" :disabled="saving">
        <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1.5 size-4 animate-spin" />
        Salvar alterações
      </Button>
    </div>
  </form>
</template>
