<script setup lang="ts">
import MetaBrandIcon from '@/components/brand/MetaBrandIcon.vue'
import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import { holdsCapability } from '~/constants/workspace'
import { useModule } from '~/composables/useModule'
import { useWorkspace } from '~/composables/useWorkspace'

definePageMeta({
  middleware: ['auth'],
  title: 'Integrações',
})

useSeoMeta({
  title: 'Integrações',
  description: 'Integrações gerais da empresa, disponíveis conforme os módulos contratados.',
})

const { context, modules } = useWorkspace()
const { availableModules } = useModule()
const capabilities = computed(() => new Set(context.value?.capabilities ?? []))

const contractedSlugs = computed(() => {
  const fromWorkspace = new Set(modules.value || [])
  if (fromWorkspace.size)
    return fromWorkspace
  return new Set(availableModules.value.map(m => m.slug))
})

function hasModule(slug: 'crm' | 'marketing' | 'whatsapp' | 'article') {
  return contractedSlugs.value.has(slug)
}

const canOpenMarketingIntegrations = computed(() =>
  hasModule('marketing')
  && holdsCapability(capabilities.value, 'marketing.social.integrations'),
)

const integrations = computed(() => [
  {
    id: 'meta-capi',
    title: 'Meta Conversões (CAPI)',
    description: 'Envie eventos Lead e Purchase do CRM para o Meta Ads.',
    to: '/settings/integrations/meta-capi',
    icon: 'meta' as const,
    available: hasModule('crm'),
  },
  {
    id: 'marketing',
    title: 'Marketing (Meta, Google, LinkedIn)',
    description: 'OAuth para publicação social e contas de anúncios.',
    to: '/marketing/integrations',
    icon: 'megaphone' as const,
    available: canOpenMarketingIntegrations.value,
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Instâncias Evolution / Cloud API para atendimento.',
    to: '/whatsapp/integrations',
    icon: 'message' as const,
    available: hasModule('whatsapp'),
  },
])

const visibleIntegrations = computed(() => integrations.value.filter(i => i.available))
</script>

<template>
  <div class="mx-auto max-w-4xl w-full px-4 py-8 md:py-10 space-y-8">
    <header>
      <h1 class="text-2xl text-foreground font-semibold tracking-tight md:text-3xl">
        Integrações
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
        Somente integrações dos módulos contratados para esta empresa.
      </p>
    </header>

    <div v-if="visibleIntegrations.length" class="grid gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="item in visibleIntegrations"
        :key="item.id"
        :to="item.to"
        class="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card class="h-full border border-border/60 bg-muted/15 shadow-none transition-all duration-200 hover:border-border hover:bg-muted/30 hover:shadow-sm hover:-translate-y-0.5">
          <CardContent class="flex flex-row items-start gap-4 p-5 sm:p-6">
            <div class="h-11 w-11 flex shrink-0 items-center justify-center border border-border/50 rounded-lg bg-background text-muted-foreground shadow-sm">
              <MetaBrandIcon v-if="item.icon === 'meta'" size="sm" />
              <Icon
                v-else-if="item.icon === 'megaphone'"
                name="lucide:megaphone"
                class="h-5 w-5"
              />
              <Icon
                v-else
                name="lucide:message-circle"
                class="h-5 w-5"
              />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-base text-foreground font-semibold leading-snug">
                {{ item.title }}
              </h2>
              <p class="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {{ item.description }}
              </p>
            </div>
            <Icon
              name="lucide:chevron-right"
              class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-foreground"
            />
          </CardContent>
        </Card>
      </NuxtLink>
    </div>

    <p v-else class="text-sm text-muted-foreground">
      Nenhuma integração disponível para os módulos desta empresa.
    </p>
  </div>
</template>
