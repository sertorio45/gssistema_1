<script setup lang="ts">
import type { ProductCategory } from '~/types/crm'

import { categoryColumns } from '~/components/crm/products/categoryColumns'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import DataTableViewOptions from '~/components/ui/table/DataTableViewOptions.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { useTenant } from '~/composables/useTenant'
import { deleteWithConfirm } from '~/composables/useConfirmDelete'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth', 'tenant'],
  title: 'Categorias de Produtos',
  description: 'Gerencie as categorias dos produtos e serviços',
})

const { tenantId } = useTenant()
const showDialog = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formName = ref('')
const editingCategory = ref<ProductCategory | null>(null)

const {
  data: categoriesRaw,
  pending,
  refresh,
  showSkeleton,
} = await useCachedAsyncData<ProductCategory[]>(
  computed(() => `crm-products-categories-page-${tenantId.value ?? 'none'}`),
  () => (tenantId.value ? $fetch<ProductCategory[]>('/api/crm/products/categories', { query: { tenant_id: tenantId.value } }) : Promise.resolve([])),
  { watch: [tenantId], default: () => null, server: false },
)

const categories = computed(() => categoriesRaw.value ?? [])

function openCreate() {
  formMode.value = 'create'
  formName.value = ''
  editingCategory.value = null
  showDialog.value = true
}

function handleEdit(cat: ProductCategory) {
  formMode.value = 'edit'
  editingCategory.value = cat
  formName.value = cat.name
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  formName.value = ''
  editingCategory.value = null
}

async function handleSave() {
  const name = formName.value?.trim()
  if (!name) {
    toast.error('Nome é obrigatório')
    return
  }
  const tid = tenantId.value
  if (!tid) {
    toast.error('Tenant não selecionado')
    return
  }
  try {
    if (formMode.value === 'edit' && editingCategory.value) {
      await $fetch(`/api/crm/products/categories/${editingCategory.value.id}`, {
        method: 'PUT',
        body: { tenant_id: tid, name },
      })
      toast.success('Categoria atualizada')
    }
    else {
      await $fetch('/api/crm/products/categories', {
        method: 'POST',
        body: { tenant_id: tid, name },
      })
      toast.success('Categoria criada')
    }
    closeDialog()
    refresh()
  }
  catch (e: any) {
    toast.error(e?.data?.message || e?.message || 'Erro ao salvar')
  }
}

async function handleDelete(cat: ProductCategory) {
  const tid = tenantId.value
  if (!tid)
    return

  const deleted = await deleteWithConfirm(
    () => $fetch(`/api/crm/products/categories/${cat.id}?tenant_id=${tid}`, { method: 'DELETE' }),
    {
      title: 'Excluir categoria?',
      description: `Tem certeza que deseja excluir "${cat.name}"? Os produtos desta categoria ficarão sem categoria.`,
      successMessage: 'Categoria excluída.',
      errorMessage: 'Não foi possível excluir a categoria.',
    },
  )

  if (deleted)
    refresh()
}
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Categorias de Produtos
        </h1>
        <p class="text-muted-foreground">
          Crie e edite categorias para organizar seus produtos e serviços.
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/crm/products">
          <Button variant="outline" size="default">
            <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
            Voltar aos Produtos
          </Button>
        </NuxtLink>
        <Button size="default" class="bg-primary hover:bg-primary/90" @click="openCreate">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>
    </div>

    <div v-if="showSkeleton" class="space-y-4">
      <Card class="border shadow-sm">
        <CardContent class="p-4">
          <div class="space-y-2">
            <Skeleton class="h-8 w-[250px]" />
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
    <template v-else>
      <DataTable
        :data="categories"
        :columns="categoryColumns"
        :meta="{ onEdit: handleEdit, onDelete: handleDelete }"
      >
        <template #toolbar="{ table }">
          <DataTableToolbar :table="table" placeholder="Buscar categorias..." filter-column="name">
            <template #options>
              <DataTableViewOptions :table="table" />
            </template>
          </DataTableToolbar>
        </template>
        <template #pagination="{ table }">
          <DataTablePagination :table="table" />
        </template>
      </DataTable>
    </template>

    <Dialog :open="showDialog" @update:open="showDialog = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {{ formMode === 'edit' ? 'Editar Categoria' : 'Nova Categoria' }}
          </DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="space-y-2">
            <Label for="category-name">Nome</Label>
            <Input
              id="category-name"
              v-model="formName"
              placeholder="ex.: Software, Consultoria"
              @keydown.enter.prevent="handleSave"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="closeDialog">
            Cancelar
          </Button>
          <Button @click="handleSave">
            {{ formMode === 'edit' ? 'Salvar' : 'Criar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
