<script setup lang="ts">
import { Switch } from '~/components/ui/switch'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import AdminUserTenantSection, { type AdminTenantFormState } from '~/components/users/AdminUserTenantSection.vue'
import {
  ROLE_LABELS,
  STAFF_ROLES,
  TENANT_SCOPED_ROLES,
  isTenantScopedRole,
  type AppRoleSlug,
} from '~/constants/roles'
import { useAuth } from '~/composables/useAuth'

export interface UserFormData {
  email: string
  password: string
  user_metadata: {
    name: string
  }
  email_confirm: boolean
  role: AppRoleSlug
  tenant: AdminTenantFormState
}

interface PasswordStrength {
  hasMinLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumbers: boolean
  hasSpecialChars: boolean
  isValid: boolean
}

const props = defineProps<{
  initialForm?: UserFormData
  isEditing?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', form: UserFormData): void
  (e: 'cancel'): void
}>()

const defaultTenantState = (): AdminTenantFormState => ({
  tenantMode: 'existing',
  tenant_id: '',
  new_tenant_name: '',
})

const form = ref<UserFormData>(
  props.initialForm || {
    email: '',
    password: '',
    user_metadata: {
      name: '',
    },
    email_confirm: true,
    role: 'cliente',
    tenant: defaultTenantState(),
  },
)

const passwordStrength = ref<PasswordStrength>({
  hasMinLength: false,
  hasUppercase: false,
  hasLowercase: false,
  hasNumbers: false,
  hasSpecialChars: false,
  isValid: false,
})

const { currentRole } = useAuth()

const assignableRoles = computed<AppRoleSlug[]>(() => {
  if (currentRole.value === 'admin')
    return [...STAFF_ROLES, ...TENANT_SCOPED_ROLES]
  if (currentRole.value === 'funcionario')
    return [...TENANT_SCOPED_ROLES]
  return [...TENANT_SCOPED_ROLES]
})

const requiresTenant = computed(() => isTenantScopedRole(form.value.role))

function validatePassword(password: string) {
  passwordStrength.value = {
    hasMinLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    isValid: false,
  }

  passwordStrength.value.isValid
    = passwordStrength.value.hasMinLength
      && passwordStrength.value.hasUppercase
      && passwordStrength.value.hasLowercase
      && passwordStrength.value.hasNumbers
      && passwordStrength.value.hasSpecialChars
}

function generateSecurePassword() {
  const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowerChars = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'

  const allChars = upperChars + lowerChars + numbers + specialChars
  let password = ''

  password += upperChars.charAt(Math.floor(Math.random() * upperChars.length))
  password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length))
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length))

  for (let i = password.length; i < 12; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }

  password = password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('')

  form.value.password = password
  validatePassword(password)
}

function validateTenant() {
  if (!requiresTenant.value)
    return true

  if (form.value.tenant.tenantMode === 'existing')
    return Boolean(form.value.tenant.tenant_id)

  return Boolean(form.value.tenant.new_tenant_name.trim())
}

function validate() {
  if (props.isEditing) {
    if (form.value.password && form.value.password.trim() !== '')
      return form.value.email && passwordStrength.value.isValid
    return Boolean(form.value.email)
  }

  return Boolean(
    form.value.email
    && form.value.password
    && passwordStrength.value.isValid
    && validateTenant(),
  )
}

defineExpose({
  form,
  validate,
})

function handleSubmit() {
  if (validate())
    emit('submit', form.value)
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="grid grid-cols-1 gap-6 py-4">
    <div class="space-y-6">
      <div>
        <h3 class="mb-3 text-sm text-muted-foreground font-medium">
          INFORMAÇÕES PESSOAIS
        </h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="grid gap-2">
            <Label :for="isEditing ? 'edit-name' : 'name'">Nome</Label>
            <Input
              :id="isEditing ? 'edit-name' : 'name'"
              v-model="form.user_metadata.name"
              placeholder="Nome completo"
            />
          </div>
          <div class="grid gap-2">
            <Label :for="isEditing ? 'edit-email' : 'email'">E-mail</Label>
            <Input :id="isEditing ? 'edit-email' : 'email'" v-model="form.email" placeholder="exemplo@email.com" />
          </div>
          <div v-if="!isEditing" class="grid gap-2">
            <Label>Função</Label>
            <Select v-model="form.role">
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="role in assignableRoles" :key="role" :value="role">
                  {{ ROLE_LABELS[role] }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label for="email-confirm-switch">Confirmar e-mail</Label>
            <Switch id="email-confirm-switch" v-model:checked="form.email_confirm" />
          </div>
        </div>
      </div>

      <AdminUserTenantSection
        v-if="!isEditing && requiresTenant"
        v-model="form.tenant"
        required
      />

      <div>
        <h3 class="mb-3 text-sm text-muted-foreground font-medium">
          CREDENCIAIS
        </h3>
        <div class="grid gap-2">
          <div class="flex items-center justify-between">
            <Label :for="isEditing ? 'edit-password' : 'password'">
              {{ isEditing ? 'Senha (deixe em branco para manter)' : 'Senha' }}
            </Label>
            <Button variant="outline" size="sm" class="h-7 px-2 py-1 text-xs" @click="generateSecurePassword">
              Gerar senha
            </Button>
          </div>
          <PasswordInput
            :id="isEditing ? 'edit-password' : 'password'"
            v-model="form.password"
            :placeholder="isEditing ? 'Nova senha' : '********'"
            @input="validatePassword(form.password)"
          />

          <div v-if="form.password" class="mt-2 rounded-md bg-muted/50 p-3">
            <div class="mb-2 text-sm font-medium">
              Requisitos de senha:
            </div>
            <div class="grid grid-cols-2 gap-x-6 gap-y-1">
              <div
                :class="passwordStrength.hasMinLength ? 'text-green-500' : 'text-red-500'"
                class="flex items-center text-sm"
              >
                <span class="mr-1 text-xs">{{ passwordStrength.hasMinLength ? '✓' : '✗' }}</span>
                Mínimo de 12 caracteres
              </div>
              <div
                :class="passwordStrength.hasUppercase ? 'text-green-500' : 'text-red-500'"
                class="flex items-center text-sm"
              >
                <span class="mr-1 text-xs">{{ passwordStrength.hasUppercase ? '✓' : '✗' }}</span>
                Letra maiúscula
              </div>
              <div
                :class="passwordStrength.hasLowercase ? 'text-green-500' : 'text-red-500'"
                class="flex items-center text-sm"
              >
                <span class="mr-1 text-xs">{{ passwordStrength.hasLowercase ? '✓' : '✗' }}</span>
                Letra minúscula
              </div>
              <div
                :class="passwordStrength.hasNumbers ? 'text-green-500' : 'text-red-500'"
                class="flex items-center text-sm"
              >
                <span class="mr-1 text-xs">{{ passwordStrength.hasNumbers ? '✓' : '✗' }}</span>
                Número
              </div>
              <div
                :class="passwordStrength.hasSpecialChars ? 'text-green-500' : 'text-red-500'"
                class="flex items-center text-sm"
              >
                <span class="mr-1 text-xs">{{ passwordStrength.hasSpecialChars ? '✓' : '✗' }}</span>
                Caractere especial
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
