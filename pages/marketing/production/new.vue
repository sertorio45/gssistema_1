<script setup lang="ts">
import type { SocialPostInput } from '~/types/marketing-social'

import { toast } from 'vue-sonner'
import SocialPostForm from '~/components/marketing/social/SocialPostForm.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Nova publicação',
})

const social = useMarketingSocial()
const saving = ref(false)

async function save(input: SocialPostInput) {
  saving.value = true
  try {
    const post = await social.createPost(input)
    toast.success('Rascunho criado')
    await navigateTo(`/marketing/production/${(post as any).id}`)
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível salvar')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <Button variant="ghost" class="mb-2 -ml-3" @click="navigateTo('/marketing/production')">
        <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
        Voltar para produção
      </Button>
      <h1 class="text-2xl font-bold tracking-tight">
        Nova publicação
      </h1>
      <p class="mt-1 text-muted-foreground">
        Prepare o conteúdo, selecione os canais e envie para aprovação.
      </p>
    </div>

    <SocialPostForm :saving="saving" @save="save" />
  </div>
</template>
