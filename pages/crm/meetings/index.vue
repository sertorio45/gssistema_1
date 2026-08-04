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
import DataTableViewOptions from '~/components/ui/table/DataTableViewOptions.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import { deleteWithConfirm } from '~/composables/useConfirmDelete'
import { useTenantPage } from '~/composables/useTenantPage'

definePageMeta({
  middleware: ['auth'],
  title: 'Reuniões',
  description: 'Gerencie suas reuniões e compromissos',
})

const { tenantId } = useTenantPage()

const meetingsData = ref<Meeting[]>([])
const selectedMeeting = ref<Meeting | null>(null)
const isDialogOpen = ref(false)
const selectedItems = ref<number[]>([])
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

async function handleMultiDelete() {
  if (!tenantId.value || !selectedItems.value.length)
    return

  const toDelete = selectedItems.value
    .map(idx => meetingsData.value[idx])
    .filter(Boolean)
  const count = toDelete.length

  if (!count)
    return

  const deleted = await deleteWithConfirm(
    () => Promise.all(toDelete.map(meeting =>
      $fetch(`/api/crm/meetings/${meeting.id}?tenant_id=${tenantId.value}`, { method: 'DELETE' }),
    )),
    {
      title: 'Excluir várias reuniões?',
      description: `Tem certeza que deseja excluir ${count} reuniões? Esta ação não pode ser desfeita.`,
      successMessage: `${count} reunião(ões) excluída(s) com sucesso.`,
      errorMessage: 'Não foi possível excluir as reuniões.',
    },
  )

  if (deleted) {
    selectedItems.value = []
    await fetchMeetings()
  }
}

function handleEdit(meeting: Meeting) {
  selectedMeeting.value = meeting
  isDialogOpen.value = true
}

async function handleDelete(meeting: Meeting) {
  if (!tenantId.value)
    return

  const deleted = await deleteWithConfirm(
    () => $fetch(`/api/crm/meetings/${meeting.id}?tenant_id=${tenantId.value}`, { method: 'DELETE' }),
    {
      title: 'Excluir reunião?',
      description: `Tem certeza que deseja excluir "${meeting.title}"? Esta ação não pode ser desfeita.`,
      successMessage: 'Reunião excluída com sucesso.',
      errorMessage: 'Não foi possível excluir a reunião.',
    },
  )

  if (deleted)
    await fetchMeetings()
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
        <h1 class="text-2xl font-bold">
          Reuniões
        </h1>
        <p class="text-muted-foreground">
          Gerencie suas reuniões e compromissos
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">
          <Icon name="lucide:calendar" class="mr-2 h-4 w-4" />
          Ver calendário
        </Button>
        <Button @click="handleCreateNew">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Agendar Reunião
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Total de Reuniões
          </CardTitle>
          <Icon name="lucide:calendar" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ meetingsData.length }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Agendadas
          </CardTitle>
          <Icon name="lucide:clock" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ meetingsData.filter(m => m.status === 'scheduled').length }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Esta Semana
          </CardTitle>
          <Icon name="lucide:calendar-days" class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{
              meetingsData.filter(m => {
                const meetingDate = new Date(m.start_time)
                const now = new Date()
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekStart.getDate() + 6)
                return meetingDate >= weekStart && meetingDate <= weekEnd
              }).length
            }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Concluídas
          </CardTitle>
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
        :meta="{ onEdit: handleEdit, onDelete: handleDelete }"
        @delete="handleDelete"
        @selection-change="updateSelectedItems"
      >
        <template #toolbar="{ table }">
          <DataTableToolbar :table="table" placeholder="Buscar reuniões..." filter-column="title">
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
      :on-delete="handleMultiDelete"
    />

    <!-- Dialog de Criação/Edição -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="mx-auto w-full overflow-hidden p-0 lg:max-w-3xl md:max-w-2xl sm:max-w-lg">
        <DialogHeader class="border-b p-4 md:p-6">
          <DialogTitle class="text-xl">
            {{ selectedMeeting ? 'Editar Reunião' : 'Agendar Reunião' }}
          </DialogTitle>
          <DialogDescription class="mt-1 text-sm text-muted-foreground">
            {{ selectedMeeting ? 'Edite os dados da reunião.' : 'Adicione uma nova reunião ao seu calendário.' }}
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-[calc(80vh-10rem)] overflow-y-auto p-4 md:p-6">
          <MeetingForm
            :initial-data="selectedMeeting || undefined"
            @success="
              () => {
                closeDialog()
                fetchMeetings()
              }
            "
            @cancel="closeDialog"
          />
        </div>
        <div class="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" @click="closeDialog">
            Cancelar
          </Button>
          <Button type="submit" form="meeting-form">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
