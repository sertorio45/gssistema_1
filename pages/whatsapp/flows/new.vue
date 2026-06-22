<script setup lang="ts">
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
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

const templates = [
  {
    name: 'Boas-vindas automático',
    description: 'Responde na primeira mensagem recebida com saudação e menu.',
  },
  {
    name: 'Qualificação de lead',
    description: 'Pergunta interesse, sincroniza no CRM e encaminha para humano.',
  },
  {
    name: 'Fora do horário',
    description: 'Informa horário comercial e registra contato para retorno.',
  },
]

function applyTemplate(template: { name: string, description: string }) {
  name.value = template.name
  description.value = template.description
}

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
  <div class="mx-auto max-w-5xl space-y-6">
    <WhatsAppPageHeader
      title="Novo flow"
      description="Defina o básico agora e monte o fluxo visual no editor em seguida."
    >
      <template #actions>
        <NuxtLink to="/whatsapp/flows">
          <Button variant="outline">
            Voltar
          </Button>
        </NuxtLink>
      </template>
    </WhatsAppPageHeader>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card class="border-border/60 shadow-none">
        <CardHeader>
          <CardTitle class="text-base">
            Informações do flow
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="flow-name">Nome</Label>
            <Input id="flow-name" v-model="name" placeholder="Ex: Boas-vindas automático" />
          </div>
          <div class="space-y-2">
            <Label for="flow-description">Descrição</Label>
            <Textarea
              id="flow-description"
              v-model="description"
              rows="4"
              placeholder="Descreva o objetivo desta automação (opcional)"
            />
          </div>
          <Button :disabled="saving" class="w-full sm:w-auto" @click="handleCreate">
            <span class="i-lucide-arrow-right mr-2 h-4 w-4" />
            {{ saving ? 'Criando...' : 'Criar e abrir editor' }}
          </Button>
        </CardContent>
      </Card>

      <div class="space-y-4">
        <Card class="border-border/60 bg-muted/10 shadow-none">
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-semibold">
              Modelos sugeridos
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <button
              v-for="template in templates"
              :key="template.name"
              type="button"
              class="w-full rounded-lg border border-border/60 bg-background px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              @click="applyTemplate(template)"
            >
              <p class="text-sm font-medium">
                {{ template.name }}
              </p>
              <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
                {{ template.description }}
              </p>
            </button>
          </CardContent>
        </Card>

        <Card class="border-border/60 shadow-none">
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-semibold">
              Dicas rápidas
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 text-sm text-muted-foreground">
            <p class="flex gap-2">
              <span class="i-lucide-zap mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Comece sempre com o bloco <strong class="text-foreground">Gatilho</strong>.
            </p>
            <p class="flex gap-2">
              <span class="i-lucide-save mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Salve antes de ativar para não perder alterações.
            </p>
            <p class="flex gap-2">
              <span class="i-lucide-message-square mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Flows respondem apenas a mensagens <strong class="text-foreground">recebidas</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
