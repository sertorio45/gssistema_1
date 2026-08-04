<script setup lang="ts">
import type { AgencyOnboarding, OrganizationMember } from '~/types/workspace'

import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import { useWorkspace } from '~/composables/useWorkspace'
import { AGENCY_ONBOARDING_STEPS } from '~/constants/workspace'
import { slugify } from '~/utils/slugify'

definePageMeta({
  middleware: ['auth', 'organization'],
  requiredCapability: 'agency.clients.manage',
  allowedOrganizationTypes: ['agency'],
  title: 'Onboarding de cliente',
})

const STEP_LABELS: Record<string, string> = {
  client_data: 'Dados do cliente',
  tenant: 'Tenant',
  modules: 'Módulos',
  agency_owners: 'Responsáveis',
  client_invite: 'Convite do cliente',
  approval_flow: 'Fluxo de aprovação',
  social_connect: 'Redes sociais',
  review: 'Revisão',
}

const { organization } = useWorkspace()
const organizationId = computed(() => organization.value?.id ?? null)

const onboardingId = ref<string | null>(null)
const stepIndex = ref(0)
const saving = ref(false)
const completing = ref(false)

const form = ref({
  displayName: '',
  logoUrl: '',
  tenantMode: 'create' as 'create' | 'select',
  tenantName: '',
  tenantSlug: '',
  tenantId: '',
  modules: ['marketing'] as string[],
  internalOwnerUserId: '',
  agencyOwnerMembershipIds: [] as string[],
  inviteEmail: '',
  inviteName: '',
  approvalPolicy: 'any',
  minimumApprovals: 1,
  requireInternal: true,
  requireClient: true,
  connectInstagram: true,
  connectFacebook: true,
})

const currentStep = computed(() => AGENCY_ONBOARDING_STEPS[stepIndex.value])

const { data: members } = await useAsyncData<OrganizationMember[]>(
  'agency-onboarding-members',
  async () => {
    if (!organizationId.value)
      return []
    const response = await $fetch<{ data: OrganizationMember[] }>(
      `/api/organizations/${organizationId.value}/members`,
    )
    return response.data
  },
  { default: () => [], watch: [organizationId] },
)

const slugManuallyEdited = ref(false)

watch(() => form.value.displayName, (name) => {
  if (form.value.tenantMode !== 'create')
    return
  form.value.tenantName = name
  if (!slugManuallyEdited.value)
    form.value.tenantSlug = slugify(name)
})

watch(() => form.value.tenantName, (name) => {
  if (form.value.tenantMode !== 'create' || slugManuallyEdited.value)
    return
  form.value.tenantSlug = slugify(name)
})

watch(() => form.value.tenantSlug, (slug, previous) => {
  // Mark as manual only when the user types a value that diverges from auto-slugify.
  if (form.value.tenantMode !== 'create')
    return
  const expected = slugify(form.value.tenantName || form.value.displayName)
  if (previous !== undefined && slug !== expected)
    slugManuallyEdited.value = true
})

watch(() => form.value.tenantMode, (mode) => {
  if (mode === 'create') {
    slugManuallyEdited.value = false
    const source = form.value.tenantName || form.value.displayName
    if (source)
      form.value.tenantSlug = slugify(source)
  }
})

function buildPayload() {
  return {
    client_data: {
      displayName: form.value.displayName,
      logoUrl: form.value.logoUrl || null,
    },
    tenant: {
      mode: form.value.tenantMode,
      name: form.value.tenantName,
      slug: form.value.tenantSlug,
      tenantId: form.value.tenantId || null,
    },
    modules: form.value.modules,
    agency_owners: {
      internalOwnerUserId: form.value.internalOwnerUserId || null,
      membershipIds: form.value.agencyOwnerMembershipIds,
    },
    client_invite: form.value.inviteEmail
      ? { email: form.value.inviteEmail, name: form.value.inviteName || undefined }
      : null,
    approval_flow: {
      policy: form.value.approvalPolicy,
      minimumApprovals: form.value.minimumApprovals,
      requireInternal: form.value.requireInternal,
      requireClient: form.value.requireClient,
    },
    social_connect: {
      instagram: form.value.connectInstagram,
      facebook: form.value.connectFacebook,
    },
  }
}

async function ensureDraft() {
  if (!organizationId.value)
    throw new Error('Organização ausente')
  if (onboardingId.value)
    return onboardingId.value

  const response = await $fetch<{ data: AgencyOnboarding }>(
    `/api/organizations/${organizationId.value}/onboardings`,
    {
      method: 'POST',
      body: {
        currentStep: currentStep.value,
        payload: buildPayload(),
      },
    },
  )
  onboardingId.value = response.data.id
  return response.data.id
}

async function saveDraft(advance = false) {
  if (!organizationId.value)
    return

  if (advance && currentStep.value === 'client_invite' && !form.value.inviteEmail.trim()) {
    toast.error('Informe o e-mail do aprovador para enviar o convite oficial.')
    return
  }

  saving.value = true
  try {
    const id = await ensureDraft()
    const nextIndex = advance ? Math.min(stepIndex.value + 1, AGENCY_ONBOARDING_STEPS.length - 1) : stepIndex.value
    await $fetch(`/api/organizations/${organizationId.value}/onboardings/${id}`, {
      method: 'PUT',
      body: {
        currentStep: AGENCY_ONBOARDING_STEPS[nextIndex],
        payload: buildPayload(),
        status: 'in_progress',
      },
    })
    if (advance)
      stepIndex.value = nextIndex
    toast.success(advance ? 'Etapa salva' : 'Rascunho salvo')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Não foi possível salvar o rascunho')
  }
  finally {
    saving.value = false
  }
}

async function complete() {
  if (!organizationId.value)
    return

  if (!form.value.inviteEmail?.trim()) {
    toast.error('Informe o e-mail do aprovador do cliente para enviar o convite.')
    return
  }

  completing.value = true
  try {
    const id = await ensureDraft()
    await $fetch(`/api/organizations/${organizationId.value}/onboardings/${id}`, {
      method: 'PUT',
      body: { currentStep: 'review', payload: buildPayload() },
    })

    const response = await $fetch<{ data: { tenant_id: string, invite: { email: string, invite_sent: boolean, existing_user: boolean } | null } }>(
      `/api/organizations/${organizationId.value}/onboardings/${id}/complete`,
      {
        method: 'POST',
        body: {
          tenantMode: form.value.tenantMode,
          tenantId: form.value.tenantId || undefined,
          tenantName: form.value.tenantName || undefined,
          tenantSlug: form.value.tenantSlug || undefined,
          displayName: form.value.displayName,
          logoUrl: form.value.logoUrl || null,
          internalOwnerUserId: form.value.internalOwnerUserId || null,
          modules: form.value.modules,
          agencyOwnerMembershipIds: form.value.agencyOwnerMembershipIds,
          clientInvite: {
            email: form.value.inviteEmail.trim(),
            name: form.value.inviteName || undefined,
          },
          approvalFlow: {
            policy: form.value.approvalPolicy,
            minimumApprovals: form.value.minimumApprovals,
            requireInternal: form.value.requireInternal,
            requireClient: form.value.requireClient,
          },
          metadata: {
            social_connect: {
              instagram: form.value.connectInstagram,
              facebook: form.value.connectFacebook,
            },
          },
        },
      },
    )

    if (response.data.invite?.invite_sent) {
      toast.success(`Cliente criado. Convite enviado para ${response.data.invite.email}.`)
    }
    else if (response.data.invite?.existing_user) {
      toast.success(`Cliente criado. O usuário ${response.data.invite.email} já existia e foi vinculado.`)
    }
    else {
      toast.success('Cliente provisionado com sucesso')
    }
    await navigateTo('/organization/clients')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Falha ao concluir o onboarding')
  }
  finally {
    completing.value = false
  }
}

function toggleModule(moduleName: string) {
  const set = new Set(form.value.modules)
  if (set.has(moduleName))
    set.delete(moduleName)
  else set.add(moduleName)
  form.value.modules = [...set]
}

function toggleMembership(membershipId: string) {
  const set = new Set(form.value.agencyOwnerMembershipIds)
  if (set.has(membershipId))
    set.delete(membershipId)
  else set.add(membershipId)
  form.value.agencyOwnerMembershipIds = [...set]
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Onboarding de cliente
      </h1>
      <p class="mt-1 text-muted-foreground">
        Fluxo em etapas com rascunho. Nada é criado de fato até a conclusão.
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <Badge
        v-for="(step, index) in AGENCY_ONBOARDING_STEPS"
        :key="step"
        :variant="index === stepIndex ? 'default' : index < stepIndex ? 'secondary' : 'outline'"
      >
        {{ index + 1 }}. {{ STEP_LABELS[step] }}
      </Badge>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ STEP_LABELS[currentStep] }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <template v-if="currentStep === 'client_data'">
          <div class="space-y-2">
            <Label>Nome comercial</Label>
            <Input v-model="form.displayName" placeholder="Ex.: Padaria Central" />
          </div>
          <div class="space-y-2">
            <Label>URL do logotipo (opcional)</Label>
            <Input v-model="form.logoUrl" placeholder="https://..." />
          </div>
        </template>

        <template v-else-if="currentStep === 'tenant'">
          <div class="flex gap-2">
            <Button
              size="sm"
              :variant="form.tenantMode === 'create' ? 'default' : 'outline'"
              @click="form.tenantMode = 'create'"
            >
              Criar tenant
            </Button>
            <Button
              size="sm"
              :variant="form.tenantMode === 'select' ? 'default' : 'outline'"
              @click="form.tenantMode = 'select'"
            >
              Selecionar existente
            </Button>
          </div>
          <template v-if="form.tenantMode === 'create'">
            <div class="space-y-2">
              <Label>Nome do tenant</Label>
              <Input v-model="form.tenantName" />
            </div>
            <div class="space-y-2">
              <Label>Slug</Label>
              <Input v-model="form.tenantSlug" />
            </div>
          </template>
          <div v-else class="space-y-2">
            <Label>ID do tenant existente</Label>
            <Input v-model="form.tenantId" placeholder="UUID do tenant" />
            <p class="text-xs text-muted-foreground">
              O tenant não pode estar vinculado a outra agência ativa.
            </p>
          </div>
        </template>

        <template v-else-if="currentStep === 'modules'">
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="moduleName in ['marketing', 'crm', 'whatsapp', 'article']"
              :key="moduleName"
              size="sm"
              :variant="form.modules.includes(moduleName) ? 'default' : 'outline'"
              @click="toggleModule(moduleName)"
            >
              {{ moduleName }}
            </Button>
          </div>
        </template>

        <template v-else-if="currentStep === 'agency_owners'">
          <div class="space-y-2">
            <Label>Responsável interno (user id)</Label>
            <Input v-model="form.internalOwnerUserId" placeholder="UUID do usuário da agência" />
          </div>
          <div class="space-y-2">
            <Label>Atribuir membros da agência</Label>
            <div class="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              <label
                v-for="member in members"
                :key="member.id"
                class="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  :checked="form.agencyOwnerMembershipIds.includes(member.id)"
                  @change="toggleMembership(member.id)"
                >
                <span>{{ member.email || member.user_id }} · {{ member.role_name || member.role }}</span>
              </label>
            </div>
          </div>
        </template>

        <template v-else-if="currentStep === 'client_invite'">
          <p class="mb-4 text-sm text-muted-foreground">
            O e-mail é obrigatório. Enviamos o convite oficial do Supabase Auth (template “Invite User”) para o cliente criar a senha e acessar o ambiente.
          </p>
          <div class="space-y-2">
            <Label>E-mail do administrador / aprovador <span class="text-destructive">*</span></Label>
            <Input v-model="form.inviteEmail" type="email" required placeholder="cliente@empresa.com" />
          </div>
          <div class="space-y-2">
            <Label>Nome</Label>
            <Input v-model="form.inviteName" placeholder="Nome do aprovador" />
          </div>
        </template>

        <template v-else-if="currentStep === 'approval_flow'">
          <div class="flex items-center gap-2">
            <input id="req-internal" v-model="form.requireInternal" type="checkbox">
            <Label for="req-internal">Exigir aprovação interna</Label>
          </div>
          <div class="flex items-center gap-2">
            <input id="req-client" v-model="form.requireClient" type="checkbox">
            <Label for="req-client">Exigir aprovação do cliente</Label>
          </div>
          <div class="space-y-2">
            <Label>Mínimo de aprovações</Label>
            <Input v-model.number="form.minimumApprovals" type="number" min="1" max="10" />
          </div>
        </template>

        <template v-else-if="currentStep === 'social_connect'">
          <p class="text-sm text-muted-foreground">
            A conexão OAuth acontece depois, no ambiente do cliente. Marque o que deve ser configurado.
          </p>
          <div class="flex items-center gap-2">
            <input id="ig" v-model="form.connectInstagram" type="checkbox">
            <Label for="ig">Instagram</Label>
          </div>
          <div class="flex items-center gap-2">
            <input id="fb" v-model="form.connectFacebook" type="checkbox">
            <Label for="fb">Facebook</Label>
          </div>
        </template>

        <template v-else>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-muted-foreground">
                Cliente
              </dt>
              <dd class="font-medium">
                {{ form.displayName }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted-foreground">
                Tenant
              </dt>
              <dd class="font-medium">
                {{ form.tenantMode === 'create' ? `${form.tenantName} (${form.tenantSlug})` : form.tenantId }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted-foreground">
                Módulos
              </dt>
              <dd class="font-medium">
                {{ form.modules.join(', ') || '—' }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted-foreground">
                Convite
              </dt>
              <dd class="font-medium">
                {{ form.inviteEmail || '—' }}
              </dd>
            </div>
          </dl>
        </template>
      </CardContent>
      <CardFooter class="flex flex-wrap justify-between gap-2">
        <Button variant="outline" :disabled="stepIndex === 0 || saving" @click="stepIndex -= 1">
          Voltar
        </Button>
        <div class="flex gap-2">
          <Button variant="secondary" :disabled="saving || completing" @click="saveDraft(false)">
            Salvar rascunho
          </Button>
          <Button
            v-if="stepIndex < AGENCY_ONBOARDING_STEPS.length - 1"
            :disabled="saving || completing"
            @click="saveDraft(true)"
          >
            Continuar
          </Button>
          <Button
            v-else
            :disabled="saving || completing || !form.displayName"
            @click="complete"
          >
            Concluir onboarding
          </Button>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>
