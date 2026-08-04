<script setup lang="ts">
import type { Contact } from '~/types/crm'

import { useSupabaseClient } from '#imports'
import { columns } from '~/components/crm/contacts/columns'
import ContactForm from '~/components/crm/contacts/ContactForm.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import DataTableViewOptions from '~/components/ui/table/DataTableViewOptions.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { useTenantPage } from '~/composables/useTenantPage'

definePageMeta({
  middleware: ['auth'],
  title: 'Contatos',
  description: 'Gerencie seus contatos de negócios',
})

const supabase = useSupabaseClient()
const { tenantId } = useTenantPage()

const selectedContact = ref<Contact | null>(null)
const isDialogOpen = ref(false)
const selectedItems = ref<number[]>([])
const showMultiDeleteDialog = ref(false)

// Use useLazyAsyncData for proper SSR handling
const {
  data: contactsData,
  pending,
  refresh,
} = await useLazyAsyncData(
  'contacts',
  async () => {
    if (!tenantId.value)
      return []

    const { data, error } = await supabase
      .from('crm_contact')
      .select('*, company:crm_company(name)')
      .eq('tenant_id', tenantId.value)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch contacts:', error)
      return []
    }

    return (data || []).map((c: any) => ({
      ...c,
      company_name: c.company?.name || '',
    }))
  },
  {
    default: () => [],
    watch: [tenantId],
  },
)

function updateSelectedItems(items: number[]) {
  selectedItems.value = items
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  const toDelete = selectedItems.value.map(idx => contactsData.value?.[idx]?.id)
  if (contactsData.value) {
    contactsData.value = contactsData.value.filter(c => !toDelete.includes(c.id))
  }
  selectedItems.value = []
}

function handleEdit(contact: Contact) {
  selectedContact.value = contact
  isDialogOpen.value = true
}

function handleDelete(contact: Contact) {
  if (contactsData.value) {
    const index = contactsData.value.findIndex(c => c.id === contact.id)
    if (index > -1) {
      contactsData.value.splice(index, 1)
    }
  }
}

function handleNewContact() {
  selectedContact.value = null
  isDialogOpen.value = true
}

function closeDialog() {
  isDialogOpen.value = false
  selectedContact.value = null
}

function handleContactSaved() {
  closeDialog()
  // Use refresh from useLazyAsyncData
  refresh()
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          Contatos
        </h1>
        <p class="text-muted-foreground">
          Gerencie seus contatos de negócios
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Exportar
        </Button>
        <Button @click="handleNewContact">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Novo Contato
        </Button>
      </div>
    </div>

    <!-- DataTable with Skeleton -->
    <div v-if="pending" class="space-y-4">
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
      <!-- DataTable -->
      <DataTable
        :data="contactsData || []"
        :columns="columns"
        :meta="{ onEdit: handleEdit, onDelete: handleDelete }"
        @selection-change="updateSelectedItems"
      >
        <template #toolbar="{ table }">
          <DataTableToolbar :table="table" placeholder="Buscar contatos..." filter-column="name">
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

    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="showMultiDeleteConfirmation"
    />

    <!-- Multi Delete Dialog -->
    <div
      v-if="showMultiDeleteDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Excluir vários contatos
        </h2>
        <p class="mb-4">
          Tem certeza que deseja excluir {{ selectedItems.length }} contatos? Esta ação não pode ser desfeita.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showMultiDeleteDialog = false">
            Cancelar
          </Button>
          <Button variant="destructive" @click="handleMultiDeleteConfirm">
            Excluir todos
          </Button>
        </div>
      </div>
    </div>

    <!-- Contact Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="mx-auto w-full overflow-hidden p-0 lg:max-w-3xl md:max-w-2xl sm:max-w-lg">
        <DialogHeader class="border-b p-4 md:p-6">
          <DialogTitle class="text-xl">
            {{ selectedContact ? 'Editar Contato' : 'Criar Contato' }}
          </DialogTitle>
          <DialogDescription class="mt-1 text-sm text-muted-foreground">
            {{ selectedContact ? 'Edite os dados do contato.' : 'Adicione um novo contato ao seu cadastro.' }}
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-[calc(80vh-10rem)] overflow-y-auto p-4 md:p-6">
          <ContactForm
            :initial-data="selectedContact || undefined"
            @success="handleContactSaved"
            @cancel="closeDialog"
          />
        </div>
        <div class="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" @click="closeDialog">
            Cancelar
          </Button>
          <Button type="submit" form="contact-form">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
