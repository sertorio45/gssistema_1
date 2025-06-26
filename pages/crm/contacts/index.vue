<script setup lang="ts">
import type { Contact } from '~/types/crm'
import { useSupabaseClient } from '#imports'
import { Loader2 } from 'lucide-vue-next'
import { columns } from '~/components/crm/contacts/columns'
import ContactForm from '~/components/crm/contacts/ContactForm.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableRowActions from '~/components/ui/table/DataTableRowActions.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { useTenant } from '~/composables/useTenant'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'

definePageMeta({
  title: 'Contacts',
  description: 'Manage your business contacts',
})

const supabase = useSupabaseClient()
const { tenantId } = useTenant()

const selectedContact = ref<Contact | null>(null)
const isDialogOpen = ref(false)
const selectedItems = ref<number[]>([])
const showMultiDeleteDialog = ref(false)

// Use useLazyAsyncData for proper SSR handling
const { data: contactsData, pending, refresh } = await useLazyAsyncData(
  'contacts',
  async () => {
    if (!tenantId.value) return []
    
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

// Computed values to prevent hydration mismatches
const totalContacts = computed(() => contactsData.value?.length || 0)
const totalCompanies = computed(() => 
  new Set(contactsData.value?.map(c => c.company_id).filter(Boolean) || []).size
)
const recentContacts = computed(() => 
  contactsData.value?.filter(c => c.last_contact 
    && new Date(c.last_contact) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length || 0
)
const taggedContacts = computed(() => 
  contactsData.value?.filter(c => c.tags && c.tags.length > 0).length || 0
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
        <h1 class="text-2xl font-bold">Contacts</h1>
        <p class="text-muted-foreground">Manage your business contacts</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:download" class="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button @click="handleNewContact">
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
          <div class="text-2xl font-bold">
            <span v-if="pending">-</span>
            <span v-else>{{ totalContacts }}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Companies</CardTitle>
          <Icon name="lucide:building" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            <span v-if="pending">-</span>
            <span v-else>{{ totalCompanies }}</span>
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
            <span v-if="pending">-</span>
            <span v-else>{{ recentContacts }}</span>
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
            <span v-if="pending">-</span>
            <span v-else>{{ taggedContacts }}</span>
          </div>
        </CardContent>
      </Card>
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
        <DataTableToolbar :table="table" placeholder="Search contacts..." column-key="name" />
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
      <DialogContent class="w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto p-0 overflow-hidden">
        <DialogHeader class="border-b p-4 md:p-6">
          <DialogTitle class="text-xl">{{ selectedContact ? 'Edit Contact' : 'Create Contact' }}</DialogTitle>
          <DialogDescription class="text-sm text-muted-foreground mt-1">
            {{ selectedContact ? 'Edit the contact details.' : 'Add a new contact to your database.' }}
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-[calc(80vh-10rem)] overflow-y-auto p-4 md:p-6">
          <ContactForm :initial-data="selectedContact || undefined" @success="handleContactSaved" @cancel="closeDialog" />
        </div>
        <div class="border-t p-4 flex justify-end gap-2">
          <Button variant="outline" @click="closeDialog">Cancel</Button>
          <Button type="submit" form="contact-form">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template> 