<script setup lang="ts">
import type { Company } from '~/types/crm'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useTenant } from '~/composables/useTenant'
import { useCEP } from '~/composables/useCEP'

interface Props {
  initialData?: Partial<Company>
}

interface Emits {
  success: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const { tenantId } = useTenant()
const { fetchCEP, formatCEP, isLoading: cepLoading } = useCEP()

// State
const isSubmitting = ref(false)

// Form data
const formData = reactive({
  name: props.initialData?.name || '',
  website: props.initialData?.website || '',
  industry: props.initialData?.industry || '',
  size: props.initialData?.size || '',
  address: props.initialData?.address || '',
  cep: props.initialData?.cep || '',
  city: props.initialData?.city || '',
  country: props.initialData?.country || '',
  notes: props.initialData?.notes || '',
})

// Size options
const sizeOptions = [
  { value: 'startup', label: 'Startup' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'enterprise', label: 'Enterprise' },
]

// Handle form submission
async function handleSubmit() {
  if (!formData.name.trim()) {
    toast.error('Company name is required')
    return
  }



  if (!tenantId.value) {
    toast.error('No tenant ID available')
    return
  }

  isSubmitting.value = true

  try {
    const payload = {
      ...formData,
      tenant_id: tenantId.value,
    }

    if (props.initialData?.id) {
      // Update existing company
      await $fetch(`/api/crm/company/${props.initialData.id}`, {
        method: 'PUT',
        body: payload,
      })
      toast.success('Company updated successfully')
    }
    else {
      // Create new company
      await $fetch('/api/crm/company', {
        method: 'POST',
        body: payload,
      })
      toast.success('Company created successfully')
    }

    emit('success')
  }
  catch (error: any) {
    toast.error(error?.data?.message || 'Failed to save company')
  }
  finally {
    isSubmitting.value = false
  }
}

// Handle CEP lookup using the composable
async function handleCEPLookup(cep: string) {
  if (!cep || cep.length < 8) {
    return
  }

  const cepData = await fetchCEP(cep)
  if (cepData) {
    formData.address = cepData.logradouro || ''
    formData.city = cepData.localidade || ''
    formData.country = 'Brasil'
    formData.cep = formatCEP(cep)
    toast.success('CEP data loaded successfully')
  }
}
</script>

<template>
  <form id="company-form" @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Company Name -->
    <div class="space-y-2">
      <Label for="name">Company Name <span class="text-destructive">*</span></Label>
      <Input
        id="name"
        v-model="formData.name"
        placeholder="Enter company name"
        required
      />
    </div>

    <!-- Website and Industry -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label for="website">Website</Label>
        <Input
          id="website"
          v-model="formData.website"
          placeholder="https://example.com"
          type="url"
        />
      </div>

      <div class="space-y-2">
        <Label for="industry">Industry</Label>
        <Input
          id="industry"
          v-model="formData.industry"
          placeholder="e.g., Technology, Healthcare"
        />
      </div>
    </div>

    <!-- Size -->
    <div class="space-y-2">
      <Label for="size">Company Size</Label>
      <Select v-model="formData.size">
        <SelectTrigger>
          <SelectValue placeholder="Select company size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in sizeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Address Section -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">
        Address Information
      </h3>

      <!-- CEP, City, Country -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <Label for="cep">CEP</Label>
          <div class="relative">
            <Input
              id="cep"
              v-model="formData.cep"
              placeholder="00000-000"
              @blur="handleCEPLookup($event.target.value)"
              :disabled="cepLoading"
            />
            <Loader2 v-if="cepLoading" class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="city">City</Label>
          <Input
            id="city"
            v-model="formData.city"
            placeholder="Enter city"
          />
        </div>

        <div class="space-y-2">
          <Label for="country">Country</Label>
          <Input
            id="country"
            v-model="formData.country"
            placeholder="Enter country"
          />
        </div>
      </div>

      <!-- Address -->
      <div class="space-y-2">
        <Label for="address">Address</Label>
        <Textarea
          id="address"
          v-model="formData.address"
          placeholder="Enter full address"
          :rows="2"
        />
      </div>
    </div>



    <!-- Notes -->
    <div class="space-y-2">
      <Label for="notes">Notes</Label>
      <Textarea
        id="notes"
        v-model="formData.notes"
        placeholder="Additional notes about the company"
        :rows="3"
      />
    </div>


  </form>
</template> 