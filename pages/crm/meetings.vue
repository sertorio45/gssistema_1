<script setup lang="ts">
import type { Meeting } from '~/types/crm'
import { useSupabaseClient } from '#imports'
import { useTenant } from '~/composables/useTenant'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableRowActions from '~/components/ui/table/DataTableRowActions.vue'
import { columns } from '~/components/crm/meetings/columns'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'

definePageMeta({
  title: 'Meetings',
  description: 'Manage your meetings and appointments',
})

const supabase = useSupabaseClient()
const { tenantId } = useTenant()

const meetingsData = ref<Meeting[]>([])
const selectedMeeting = ref<Meeting | null>(null)
const isDialogOpen = ref(false)
const selectedItems = ref<number[]>([])
const showMultiDeleteDialog = ref(false)

async function fetchMeetings() {
  if (!tenantId.value) return
  const { data, error } = await supabase
    .from('crm_meeting')
    .select('*')
    .eq('tenant_id', tenantId.value)
    .order('start_time', { ascending: false })
  if (!error && data) meetingsData.value = data
}

watch(tenantId, fetchMeetings, { immediate: true })

function updateSelectedItems(items: number[]) {
  selectedItems.value = items
}

function showMultiDeleteConfirmation() {
  showMultiDeleteDialog.value = true
}

function handleMultiDeleteConfirm() {
  showMultiDeleteDialog.value = false
  const toDelete = selectedItems.value.map(idx => meetingsData.value[idx]?.id)
  meetingsData.value = meetingsData.value.filter(m => !toDelete.includes(m.id))
  selectedItems.value = []
}

function handleView(meeting: Meeting) {
  selectedMeeting.value = meeting
  isDialogOpen.value = true
}

function handleEdit(meeting: Meeting) {
  selectedMeeting.value = meeting
  isDialogOpen.value = true
}

function handleDelete(meeting: Meeting) {
  const index = meetingsData.value.findIndex(m => m.id === meeting.id)
  if (index > -1) {
    meetingsData.value.splice(index, 1)
  }
}

function closeDialog() {
  isDialogOpen.value = false
  selectedMeeting.value = null
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Meetings</h1>
        <p class="text-muted-foreground">Manage your meetings and appointments</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:calendar" class="mr-2 h-4 w-4" />
          Calendar View
        </Button>
        <Button>
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Meetings</CardTitle>
          <Icon name="lucide:calendar" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ meetingsData.length }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Scheduled</CardTitle>
          <Icon name="lucide:clock" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ meetingsData.filter(m => m.status === 'scheduled').length }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">This Week</CardTitle>
          <Icon name="lucide:calendar-days" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ meetingsData.filter(m => {
              const meetingDate = new Date(m.startTime)
              const now = new Date()
              const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
              const weekEnd = new Date(weekStart)
              weekEnd.setDate(weekStart.getDate() + 6)
              return meetingDate >= weekStart && meetingDate <= weekEnd
            }).length }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Completed</CardTitle>
          <Icon name="lucide:check-circle" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ meetingsData.filter(m => m.status === 'completed').length }}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- DataTable -->
    <DataTable
      :data="meetingsData"
      :columns="columns"
      @delete="handleDelete"
      @selection-change="updateSelectedItems"
    >
      <template #toolbar="{ table }">
        <DataTableToolbar :table="table" placeholder="Search meetings..." column-key="title" />
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
          Delete Multiple Meetings
        </h2>
        <p class="mb-4">
          Are you sure you want to delete {{ selectedItems.length }} meetings? This action cannot be undone.
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

    <!-- Meeting Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Meeting Details</DialogTitle>
          <DialogDescription>
            View meeting information and details
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedMeeting" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <Label class="text-sm font-medium">Title</Label>
              <p class="text-sm text-muted-foreground">{{ selectedMeeting.title }}</p>
            </div>
            <div class="col-span-2" v-if="selectedMeeting.description">
              <Label class="text-sm font-medium">Description</Label>
              <p class="text-sm text-muted-foreground">{{ selectedMeeting.description }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Start Time</Label>
              <p class="text-sm text-muted-foreground">{{ formatDateTime(selectedMeeting.startTime) }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">End Time</Label>
              <p class="text-sm text-muted-foreground">{{ formatDateTime(selectedMeeting.endTime) }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Type</Label>
              <Badge class="mt-1" variant="secondary">{{ selectedMeeting.type }}</Badge>
            </div>
            <div>
              <Label class="text-sm font-medium">Status</Label>
              <Badge class="mt-1" variant="outline">{{ selectedMeeting.status }}</Badge>
            </div>
            <div v-if="selectedMeeting.location">
              <Label class="text-sm font-medium">Location</Label>
              <p class="text-sm text-muted-foreground">{{ selectedMeeting.location }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Created By</Label>
              <p class="text-sm text-muted-foreground">{{ selectedMeeting.createdBy }}</p>
            </div>
          </div>

          <div v-if="selectedMeeting.attendees.length">
            <Label class="text-sm font-medium">Attendees</Label>
            <div class="mt-1">
              <p class="text-sm text-muted-foreground">{{ selectedMeeting.attendees.join(', ') }}</p>
            </div>
          </div>

          <div v-if="selectedMeeting.notes">
            <Label class="text-sm font-medium">Notes</Label>
            <p class="text-sm text-muted-foreground mt-1">{{ selectedMeeting.notes }}</p>
          </div>

          <div v-if="selectedMeeting.outcome">
            <Label class="text-sm font-medium">Outcome</Label>
            <p class="text-sm text-muted-foreground mt-1">{{ selectedMeeting.outcome }}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeDialog">Close</Button>
          <Button>Edit Meeting</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template> 