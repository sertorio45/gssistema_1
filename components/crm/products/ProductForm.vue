<script setup lang="ts">
import type { Product, ProductCategory } from '~/types/crm'

import { toast } from 'vue-sonner'
import { useTenant } from '~/composables/useTenant'

const CATEGORY_NONE = '__none__'

interface Props {
  initialData?: Partial<Product> | null
  categories?: ProductCategory[]
}

const props = withDefaults(defineProps<Props>(), {
  initialData: null,
  categories: () => [],
})

const emit = defineEmits<{ (e: 'success'): void, (e: 'cancel'): void }>()

const { tenantId } = useTenant()
const isSubmitting = ref(false)

const formData = reactive({
  name: props.initialData?.name ?? '',
  description: props.initialData?.description ?? '',
  type: (props.initialData?.type ?? 'avulso') as 'recorrente' | 'avulso',
  price: props.initialData?.price ?? 0,
  recurrence: (props.initialData?.recurrence ?? null) as 'mensal' | 'trimestral' | 'semestral' | 'anual' | null,
  category_id: (props.initialData?.category_id ?? CATEGORY_NONE) as string,
  tags: [...(props.initialData?.tags ?? [])] as string[],
  active: props.initialData?.active !== false,
})

const newTag = ref('')

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !formData.tags.includes(tag)) {
    formData.tags.push(tag)
    newTag.value = ''
  }
}

function removeTag(index: number) {
  formData.tags.splice(index, 1)
}

async function handleSubmit() {
  if (!formData.name.trim()) {
    toast.error('Nome é obrigatório')
    return
  }
  if (typeof formData.price !== 'number' || formData.price < 0) {
    toast.error('Preço deve ser um número positivo válido')
    return
  }
  const tid = tenantId.value
  if (!tid) {
    toast.error('Nenhum tenant selecionado')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      tenant_id: tid,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      type: formData.type,
      price: Number(formData.price),
      recurrence: formData.type === 'recorrente' ? (formData.recurrence ?? null) : null,
      category_id: formData.category_id === CATEGORY_NONE || !formData.category_id ? null : formData.category_id,
      tags: formData.tags,
      active: formData.active,
    }

    if (props.initialData?.id) {
      await $fetch(`/api/crm/products/${props.initialData.id}`, { method: 'PUT', body: payload })
      toast.success('Produto atualizado com sucesso')
    }
    else {
      await $fetch('/api/crm/products', { method: 'POST', body: payload })
      toast.success('Produto criado com sucesso')
    }
    emit('success')
  }
  catch (e: any) {
    toast.error(e?.data?.message || e?.message || 'Erro ao salvar produto')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form id="product-form" class="space-y-6" @submit.prevent="handleSubmit">
    <div class="space-y-2">
      <Label for="product-name">Nome <span class="text-destructive">*</span></Label>
      <Input id="product-name" v-model="formData.name" placeholder="Nome do produto ou serviço" required />
    </div>

    <div class="space-y-2">
      <Label for="product-description">Descrição</Label>
      <Textarea
        id="product-description"
        v-model="formData.description"
        placeholder="Descrição breve"
        :rows="3"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="product-type">Tipo</Label>
        <Select v-model="formData.type">
          <SelectTrigger id="product-type">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="avulso">Avulso</SelectItem>
            <SelectItem value="recorrente">Recorrente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div v-if="formData.type === 'recorrente'" class="space-y-2">
        <Label for="product-recurrence">Recorrência</Label>
        <Select v-model="formData.recurrence">
          <SelectTrigger id="product-recurrence">
            <SelectValue placeholder="Selecione a recorrência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="trimestral">Trimestral</SelectItem>
            <SelectItem value="semestral">Semestral</SelectItem>
            <SelectItem value="anual">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="space-y-2">
      <Label for="product-price">Preço (R$) <span class="text-destructive">*</span></Label>
      <Input
        id="product-price"
        v-model.number="formData.price"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
      />
    </div>

    <div class="space-y-2">
      <Label for="product-category">Categoria</Label>
      <Select v-model="formData.category_id">
        <SelectTrigger id="product-category">
          <SelectValue placeholder="Selecione a categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="CATEGORY_NONE">
            Nenhuma
          </SelectItem>
          <SelectItem v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label>Tags</Label>
      <div class="flex gap-2">
        <Input v-model="newTag" placeholder="Adicionar tag" @keyup.enter.prevent="addTag" />
        <Button type="button" variant="outline" size="sm" @click="addTag">
          Adicionar
        </Button>
      </div>
      <div v-if="formData.tags.length > 0" class="flex flex-wrap gap-2">
        <Badge v-for="(tag, i) in formData.tags" :key="i" variant="outline" class="text-xs">
          {{ tag }}
          <button type="button" class="ml-1 hover:text-destructive" @click="removeTag(i)">
            ×
          </button>
        </Badge>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Switch id="product-active" v-model:checked="formData.active" />
      <Label for="product-active">Ativo</Label>
    </div>
  </form>
</template>
