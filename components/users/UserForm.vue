<script setup lang="ts">
import { Switch } from '~/components/ui/switch'

interface UserForm {
  email: string
  password: string
  user_metadata: {
    name: string
  }
  email_confirm: boolean
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
  initialForm?: UserForm
  isEditing?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', form: UserForm): void
  (e: 'cancel'): void
}>()

const form = ref<UserForm>(
  props.initialForm || {
    email: '',
    password: '',
    user_metadata: {
      name: '',
    },
    email_confirm: true,
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

// Verificar força da senha
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

// Gerar senha segura
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

function validate() {
  // Se estiver editando, não exige senha
  if (props.isEditing) {
    // Se tiver senha preenchida, valida a força
    if (form.value.password && form.value.password.trim() !== '') {
      return form.value.email && passwordStrength.value.isValid
    }
    // Se não tiver senha, só valida o email
    return form.value.email
  }
  // Para criação, exige todos os campos
  return form.value.email && form.value.password && passwordStrength.value.isValid
}

// Expor o formulário e métodos
defineExpose({
  form: form.value,
  validate,
})

function handleSubmit() {
  if (validate()) {
    emit('submit', form.value)
  }
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="grid grid-cols-1 gap-6 py-4">
    <!-- Coluna de Campos -->
    <div class="space-y-6">
      <!-- Informações Básicas -->
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
            <Label :for="isEditing ? 'edit-email' : 'email'">Email</Label>
            <Input :id="isEditing ? 'edit-email' : 'email'" v-model="form.email" placeholder="exemplo@email.com" />
          </div>
          <div class="grid gap-2">
            <Label for="email-confirm-switch">Confirmar Email</Label>
            <Switch id="email-confirm-switch" v-model:checked="form.email_confirm" />
          </div>
        </div>
      </div>

      <!-- Credenciais -->
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
              Gerar Senha
            </Button>
          </div>
          <PasswordInput
            :id="isEditing ? 'edit-password' : 'password'"
            v-model="form.password"
            :placeholder="isEditing ? 'Nova senha' : '********'"
            @input="validatePassword(form.password)"
          />

          <!-- Indicador de força da senha -->
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
