<script setup lang="ts">
import type { WhatsAppContact } from '~/types/whatsapp'

import { columns } from '~/components/whatsapp/contacts/columns'
import ContactForm from '~/components/whatsapp/contacts/ContactForm.vue'
import WhatsAppPageHeader from '~/components/whatsapp/shared/WhatsAppPageHeader.vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Contatos WhatsApp',
  description: 'Contatos do módulo WhatsApp',
})

const {
  contacts,
  total,
  pending,
  search,
  refresh,
  deleteContact,
  syncToCrm,
} = useWhatsAppContacts()

const isDialogOpen = ref(false)
const selectedContact = ref<WhatsAppContact | null>(null)
const syncingId = ref<string | null>(null)

const linkedCount = computed(() => contacts.value.filter(c => c.crmContactId).length)
const blockedCount = computed(() => contacts.value.filter(c => c.blocked).length)

function handleNew() {
  selectedContact.value = null
  isDialogOpen.value = true
}

function handleEdit(contact: WhatsAppContact) {
  selectedContact.value = contact
  isDialogOpen.value = true
}

function handleView(contact: WhatsAppContact) {
  navigateTo(`/whatsapp/contacts/${contact.id}`)
}

async function handleDelete(contact: WhatsAppContact) {
  if (!import.meta.client || !confirm(`Excluir contato ${contact.name || contact.phone}?`))
    return

  try {
    await deleteContact(contact.id)
    toast.success('Contato excluído')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao excluir')
  }
}

async function handleSync(contact: WhatsAppContact) {
  syncingId.value = contact.id
  try {
    await syncToCrm(contact.id, { createIfMissing: true })
    toast.success('Sincronizado com CRM')
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Erro ao sincronizar')
  }
  finally {
    syncingId.value = null
  }
}

function handleSaved() {
  isDialogOpen.value = false
  selectedContact.value = null
  refresh()
}
</script>

<template>
  <div>
    <WhatsAppPageHeader title="Contatos" description="Gerencie contatos e vincule ao CRM.">
      <template #actions>
        <Button @click="handleNew">
          <span class="i-lucide-plus mr-2 h-4 w-4" />
          Novo contato
        </Button>
      </template>
    </WhatsAppPageHeader>

    <div class="mb-6 grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ pending ? '—' : total }}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Vinculados ao CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ pending ? '—' : linkedCount }}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">
            Bloqueados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ pending ? '—' : blockedCount }}
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div v-if="pending" class="space-y-3">
          <Skeleton v-for="i in 5" :key="i" class="h-12 w-full" />
        </div>
        <DataTable
          v-else
          :data="contacts"
          :columns="columns"
          :meta="{ onEdit: handleEdit, onDelete: handleDelete, onView: handleView }"
        >
          <template #toolbar="{ table }">
            <div class="flex flex-wrap items-center justify-between gap-2 w-full">
              <div class="flex items-center gap-2">
                <Input
                  v-model="search"
                  placeholder="Buscar por nome ou telefone..."
                  class="h-8 w-[200px] lg:w-[280px]"
                />
                <DataTableToolbar
                  :table="table"
                  placeholder="Filtrar na página..."
                  filter-column="name"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                :disabled="!table.getFilteredSelectedRowModel().rows.length || syncingId !== null"
                @click="table.getFilteredSelectedRowModel().rows.forEach(r => handleSync(r.original))"
              >
                Sincronizar selecionados
              </Button>
            </div>
          </template>
          <template #pagination="{ table }">
            <DataTablePagination :table="table" />
          </template>
        </DataTable>
      </CardContent>
    </Card>

    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ selectedContact ? 'Editar contato' : 'Novo contato' }}</DialogTitle>
        </DialogHeader>
        <ContactForm
          :initial-data="selectedContact"
          @success="handleSaved"
          @cancel="isDialogOpen = false"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
