<script setup lang="ts">
import type { SocialPostInput } from '~/types/marketing-social'

import { toast } from 'vue-sonner'
import SocialPostForm from '~/components/marketing/social/SocialPostForm.vue'

definePageMeta({
  middleware: ['auth'],
  title: 'Nova publicação',
})

const route = useRoute()
const social = useMarketingSocial()
const { isClientExperience } = useMarketingAudience()
const saving = ref(false)
const formReady = ref(false)

onMounted(() => {
  formReady.value = true
})

const initialValue = computed(() => {
  const scheduledAt = typeof route.query.scheduledAt === 'string' ? route.query.scheduledAt : undefined
  return scheduledAt ? { scheduledAt } as SocialPostInput : undefined
})

async function save(input: SocialPostInput) {
  saving.value = true
  try {
    const post = await social.createPost(input)
    toast.success('Rascunho criado')
    await navigateTo(`/marketing/content/${(post as any).id}`)
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
  <MarketingPageSkeleton v-if="!formReady" variant="detail" />
  <div v-else class="mx-auto max-w-5xl space-y-6">
    <div>
      <Button variant="ghost" class="mb-2 -ml-3" @click="navigateTo('/marketing/content')">
        <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
        {{ isClientExperience ? 'Voltar para publicações' : 'Voltar para produção' }}
      </Button>
      <h1 class="text-2xl font-bold tracking-tight">
        Nova publicação
      </h1>
      <p class="mt-1 text-muted-foreground">
        {{ isClientExperience
          ? 'Prepare o conteúdo, escolha os canais e agende ou publique na hora.'
          : 'Prepare o conteúdo, selecione os canais e envie para aprovação.' }}
      </p>
    </div>

    <SocialPostForm :initial-value="initialValue" :saving="saving" @save="save" />
  </div>
</template>
