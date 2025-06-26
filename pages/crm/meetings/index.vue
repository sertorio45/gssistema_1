<script setup lang="ts">
import type { Meeting } from '~/types/crm'
import { columns } from '~/components/crm/meetings/columns'
import MeetingForm from '~/components/crm/meetings/MeetingForm.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableRowActions from '~/components/ui/table/DataTableRowActions.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { useTenant } from '~/composables/useTenant'

definePageMeta({
  title: 'Meetings',
  description: 'Manage your meetings and appointments',
})

const { tenantId } = useTenant()

const meetingsData = ref<Meeting[]>([])
const selectedMeeting = ref<Meeting | null>(null)
const isDialogOpen = ref(false)
const selectedItems = ref<number[]>([])
const showMultiDeleteDialog = ref(false)
const isLoading = ref(false)

async function fetchMeetings() {
  if (!tenantId.value) {
    return
  }

  isLoading.value = true
  try {
    const { data } = await $fetch('/api/crm/meetings', {
      params: { tenant_id: tenantId.value },
    })
    meetingsData.value = data || []
  }
  catch {
    meetingsData.value = []
  }
  finally {
    isLoading.value = false
  }
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

function handleCreateNew() {
  selectedMeeting.value = null
  isDialogOpen.value = true
}

function closeDialog() {
  isDialogOpen.value = false
  selectedMeeting.value = null
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
        <Button @click="handleCreateNew">
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
              const meetingDate = new Date(m.start_time)
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

    <!-- DataTable with Skeleton -->
    <div v-if="isLoading" class="space-y-4">
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
      :data="meetingsData"
      :columns="columns"
      @delete="handleDelete"
      @selection-change="updateSelectedItems"
      :meta="{ onEdit: handleEdit, onDelete: handleDelete }"
    >
      <template #toolbar="{ table }">
          <DataTableToolbar :table="table" placeholder="Search meetings..." filter-column="title" />
      </template>
      <template #pagination="{ table }">
        <DataTablePagination :table="table" />
      </template>
      <template #actions="{ row }">
        <DataTableRowActions :row="row" :onEdit="handleEdit" :onDelete="handleDelete" />
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

    <!-- Dialog de Criação/Edição -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto p-0 overflow-hidden">
        <DialogHeader class="border-b p-4 md:p-6">
          <DialogTitle class="text-xl">{{ selectedMeeting ? 'Edit Meeting' : 'Schedule Meeting' }}</DialogTitle>
          <DialogDescription class="text-sm text-muted-foreground mt-1">
            {{ selectedMeeting ? 'Edit the meeting details.' : 'Add a new meeting to your calendar.' }}
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-[calc(80vh-10rem)] overflow-y-auto p-4 md:p-6">
          <MeetingForm :initial-data="selectedMeeting || undefined" @success="() => { closeDialog(); fetchMeetings(); }" @cancel="closeDialog" />
        </div>
        <div class="border-t p-4 flex justify-end gap-2">
          <Button variant="outline" @click="closeDialog">Cancel</Button>
          <Button type="submit" form="meeting-form">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template> 