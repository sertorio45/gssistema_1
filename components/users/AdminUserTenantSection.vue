<script setup lang="ts">
import { Label } from '~/components/ui/label'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'

export interface AdminTenantFormState {
  tenantMode: 'existing' | 'new'
  tenant_id: string
  new_tenant_name: string
}

const props = defineProps<{
  modelValue: AdminTenantFormState
  required?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AdminTenantFormState]
}>()

const { data: tenantsData, pending } = useFetch<{ tenants: Array<{ id: string, name: string, slug: string }> }>(
  '/api/admin/tenants',
)

const tenants = computed(() => tenantsData.value?.tenants || [])

function patch(partial: Partial<AdminTenantFormState>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-sm font-medium text-muted-foreground">
      EMPRESA (TENANT)
    </h3>
    <p v-if="required" class="text-xs text-muted-foreground">
      Obrigatório para clientes e atendentes. Vincula o usuário aos dados do CRM e WhatsApp.
    </p>

    <Tabs
      :model-value="modelValue.tenantMode"
      @update:model-value="patch({ tenantMode: $event as 'existing' | 'new' })"
    >
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="existing">
          Empresa existente
        </TabsTrigger>
        <TabsTrigger value="new">
          Criar nova empresa
        </TabsTrigger>
      </TabsList>

      <TabsContent value="existing" class="mt-4 space-y-2">
        <Label>Empresa</Label>
        <Select
          :model-value="modelValue.tenant_id || undefined"
          :disabled="pending"
          @update:model-value="patch({ tenant_id: String($event || '') })"
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="tenant in tenants"
              :key="tenant.id"
              :value="tenant.id"
            >
              {{ tenant.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </TabsContent>

      <TabsContent value="new" class="mt-4 space-y-2">
        <Label for="new-tenant-name">Nome da nova empresa</Label>
        <Input
          id="new-tenant-name"
          :model-value="modelValue.new_tenant_name"
          placeholder="Ex.: Clínica Exemplo"
          @update:model-value="patch({ new_tenant_name: String($event) })"
        />
        <p class="text-xs text-muted-foreground">
          O identificador (slug) será gerado automaticamente a partir do nome.
        </p>
      </TabsContent>
    </Tabs>
  </div>
</template>
