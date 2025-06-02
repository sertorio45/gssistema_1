<script setup lang="ts">
import type { Contact } from '~/types/crm'
import { useSupabaseClient } from '#imports'
import { useTenant } from '~/composables/useTenant'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableRowActions from '~/components/ui/table/DataTableRowActions.vue'
import { columns } from '~/components/crm/contacts/columns'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'

definePageMeta({
  title: 'Contacts',
  description: 'Manage your business contacts',
})

const supabase = useSupabaseClient()
const { tenantId } = useTenant()

const contactsData = ref<Contact[]>([])
const selectedContact = ref<Contact | null>(null)
const isDialogOpen = ref(false)
const selectedItems = ref<number[]>([])
const showMultiDeleteDialog = ref(false)

async function fetchContacts() {
  if (!tenantId.value) return
  const { data, error } = await supabase
    .from('crm_contact')
    .select('*')
    .eq('tenant_id', tenantId.value)
    .order('created_at', { ascending: false })
  if (!error && data) contactsData.value = data
}

watch(tenantId, fetchContacts, { immediate: true })

function updateSelectedItems(items: number[]) {
  selectedItems.value = items
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  const toDelete = selectedItems.value.map(idx => contactsData.value[idx]?.id)
  contactsData.value = contactsData.value.filter(c => !toDelete.includes(c.id))
  selectedItems.value = []
}

function handleView(contact: Contact) {
  selectedContact.value = contact
  isDialogOpen.value = true
}

function handleEdit(contact: Contact) {
  selectedContact.value = contact
  isDialogOpen.value = true
}

function handleDelete(contact: Contact) {
  const index = contactsData.value.findIndex(c => c.id === contact.id)
  if (index > -1) {
    contactsData.value.splice(index, 1)
  }
}

function closeDialog() {
  isDialogOpen.value = false
  selectedContact.value = null
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Contacts</h1>
        <p class="text-muted-foreground">Manage your business contacts</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button>
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          New Contact
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Contacts</CardTitle>
          <Icon name="lucide:users" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ contactsData.length }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Companies</CardTitle>
          <Icon name="lucide:building" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ new Set(contactsData.map(c => c.company_id).filter(Boolean)).size }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Recent Contacts</CardTitle>
          <Icon name="lucide:clock" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ contactsData.filter(c => c.lastContact && 
              new Date(c.lastContact) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Tagged Contacts</CardTitle>
          <Icon name="lucide:tag" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ contactsData.filter(c => c.tags && c.tags.length > 0).length }}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- DataTable -->
    <DataTable
      :data="contactsData"
      :columns="columns"
      @delete="handleDelete"
      @selection-change="updateSelectedItems"
    >
      <template #toolbar="{ table }">
        <DataTableToolbar :table="table" placeholder="Search contacts..." column-key="name" />
      </template>
      <template #pagination="{ table }">
        <DataTablePagination :table="table" />
      </template>
      <template #actions="{ row }">
        <DataTableRowActions :row="row" :onEdit="handleEdit" :onDelete="handleDelete" />
      </template>
    </DataTable>

    <MultiActionBar
      v-if="selectedItems.length > 0"
      :count="selectedItems.length"
      :on-delete="showMultiDeleteConfirmation"
    />

    <!-- Multi Delete Dialog -->
    <div v-if="showMultiDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="max-w-md w-full rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h2 class="mb-2 text-lg font-bold">
          Delete Multiple Contacts
        </h2>
        <p class="mb-4">
          Are you sure you want to delete {{ selectedItems.length }} contacts? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showMultiDeleteDialog = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="handleMultiDeleteConfirm">
            Delete All
          </Button>
        </div>
      </div>
    </div>

    <!-- Contact Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
          <DialogDescription>
            View contact information and history
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedContact" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-sm font-medium">Name</Label>
              <p class="text-sm text-muted-foreground">{{ selectedContact.name }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Email</Label>
              <p class="text-sm text-muted-foreground">{{ selectedContact.email }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Phone</Label>
              <p class="text-sm text-muted-foreground">{{ selectedContact.phone }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Position</Label>
              <p class="text-sm text-muted-foreground">{{ selectedContact.position || '-' }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Company</Label>
              <p class="text-sm text-muted-foreground">{{ selectedContact.company_name || '-' }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Last Contact</Label>
              <p class="text-sm text-muted-foreground">
                {{ selectedContact.lastContact ? new Date(selectedContact.lastContact).toLocaleDateString('pt-BR') : '-' }}
              </p>
            </div>
          </div>

          <div v-if="selectedContact.notes">
            <Label class="text-sm font-medium">Notes</Label>
            <p class="text-sm text-muted-foreground mt-1">{{ selectedContact.notes }}</p>
          </div>

          <div v-if="selectedContact.tags && selectedContact.tags.length">
            <Label class="text-sm font-medium">Tags</Label>
            <div class="flex flex-wrap gap-1 mt-1">
              <Badge v-for="tag in selectedContact.tags" :key="tag" variant="outline" class="text-xs">
                {{ tag }}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeDialog">Close</Button>
          <Button>Edit Contact</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template> 