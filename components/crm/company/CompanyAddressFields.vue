<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import { useCEP } from '~/composables/useCEP'
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY_LABEL } from '~/constants/countries'

export interface CompanyAddressModel {
  cep: string
  address: string
  address_number: string
  address_complement: string
  city: string
  country: string
}

const model = defineModel<CompanyAddressModel>({ required: true })

const { fetchCEP, formatCEP, isLoading: cepLoading } = useCEP()

async function handleCEPLookup() {
  const raw = model.value.cep || ''
  if (raw.replace(/\D/g, '').length < 8)
    return

  const cepData = await fetchCEP(raw)
  if (!cepData) {
    toast.error('CEP não encontrado')
    return
  }

  model.value.address = cepData.logradouro || model.value.address
  model.value.city = cepData.localidade || model.value.city
  model.value.country = DEFAULT_COUNTRY_LABEL
  model.value.cep = formatCEP(raw)
  if (cepData.complemento && !model.value.address_complement)
    model.value.address_complement = cepData.complemento

  toast.success('Endereço preenchido pelo CEP')
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-sm text-muted-foreground font-medium">
      Endereço
    </h3>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="space-y-2">
        <Label for="company-address-cep">CEP</Label>
        <div class="relative">
          <Input
            id="company-address-cep"
            v-model="model.cep"
            placeholder="00000-000"
            :disabled="cepLoading"
            @blur="handleCEPLookup"
          />
          <Loader2
            v-if="cepLoading"
            class="absolute right-3 top-1/2 size-4 animate-spin text-muted-foreground -translate-y-1/2"
          />
        </div>
      </div>

      <div class="md:col-span-2 space-y-2">
        <Label for="company-address-street">Logradouro</Label>
        <Input
          id="company-address-street"
          v-model="model.address"
          placeholder="Rua, avenida…"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="space-y-2">
        <Label for="company-address-number">Número</Label>
        <Input
          id="company-address-number"
          v-model="model.address_number"
          placeholder="123"
        />
      </div>

      <div class="md:col-span-2 space-y-2">
        <Label for="company-address-complement">Complemento</Label>
        <Input
          id="company-address-complement"
          v-model="model.address_complement"
          placeholder="Sala, andar, bloco…"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="company-address-city">Cidade</Label>
        <Input id="company-address-city" v-model="model.city" placeholder="Cidade" />
      </div>

      <div class="space-y-2">
        <Label for="company-address-country">País</Label>
        <Select v-model="model.country">
          <SelectTrigger id="company-address-country">
            <SelectValue placeholder="Selecione o país" />
          </SelectTrigger>
          <SelectContent class="max-h-72">
            <SelectItem
              v-for="country in COUNTRY_OPTIONS"
              :key="country.code"
              :value="country.label"
            >
              {{ country.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</template>
