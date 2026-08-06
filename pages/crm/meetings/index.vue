<script setup lang="ts">
import type { Meeting } from '~/types/crm'

import {
  endOfWeek,
  startOfWeek,
} from 'date-fns'
import { columns } from '~/components/crm/meetings/columns'
import MeetingForm from '~/components/crm/meetings/MeetingForm.vue'
import MeetingsCalendar from '~/components/crm/meetings/MeetingsCalendar.vue'
import MultiActionBar from '~/components/shared/MultiActionBar.vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import Sheet from '~/components/ui/sheet/Sheet.vue'
import SheetContent from '~/components/ui/sheet/SheetContent.vue'
import SheetDescription from '~/components/ui/sheet/SheetDescription.vue'
import SheetFooter from '~/components/ui/sheet/SheetFooter.vue'
import SheetHeader from '~/components/ui/sheet/SheetHeader.vue'
import SheetTitle from '~/components/ui/sheet/SheetTitle.vue'
import Skeleton from '~/components/ui/skeleton/Skeleton.vue'
import DataTable from '~/components/ui/table/DataTable.vue'
import DataTablePagination from '~/components/ui/table/DataTablePagination.vue'
import DataTableToolbar from '~/components/ui/table/DataTableToolbar.vue'
import DataTableViewOptions from '~/components/ui/table/DataTableViewOptions.vue'
import { deleteWithConfirm } from '~/composables/useConfirmDelete'
import { useTenantPage } from '~/composables/useTenantPage'

definePageMeta({
  middleware: ['auth'],
  title: 'Reuniões',
  description: 'Gerencie suas reuniões e compromissos',
})

type PageMode = 'calendar' | 'table'

const { tenantId } = useTenantPage()

const meetingsData = ref<Meeting[]>([])
const selectedMeeting = ref<Partial<Meeting> | null>(null)
const isSheetOpen = ref(false)
const isSavingMeeting = ref(false)
const selectedItems = ref<number[]>([])
const isLoading = ref(false)
const pageMode = ref<PageMode>('calendar')

const isEditingMeeting = computed(() => Boolean(selectedMeeting.value?.id))

async function fetchMeetings() {
  if (!tenantId.value)
    return

  isLoading.value = true
  try {
    const { data } = await $fetch<{ data: Meeting[] }>('/api/crm/meetings', {
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

const scheduledCount = computed(() =>
  meetingsData.value.filter(meeting => meeting.status === 'scheduled').length,
)

const completedCount = computed(() =>
  meetingsData.value.filter(meeting => meeting.status === 'completed').length,
)

const thisWeekCount = computed(() => {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 })
  return meetingsData.value.filter((meeting) => {
    const at = new Date(meeting.start_time)
    return at >= weekStart && at <= weekEnd
  }).length
})

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
  isSheetOpen.value = true
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

function handleCreateNew(slot?: { start: string, end: string }) {
  selectedMeeting.value = slot
    ? { start_time: slot.start, end_time: slot.end, type: 'call', status: 'scheduled' }
    : null
  isSheetOpen.value = true
}

function closeSheet() {
  isSheetOpen.value = false
  selectedMeeting.value = null
  isSavingMeeting.value = false
}

async function onFormSuccess() {
  closeSheet()
  await fetchMeetings()
}
</script>

<template>
  <div class="w-full flex flex-col items-stretch gap-4">
    <div class="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Reuniões
        </h1>
        <p class="text-sm text-muted-foreground">
          Agenda da equipe — calendário ou tabela, com ligação a leads, contatos e empresas.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Tabs v-model="pageMode" class="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="calendar">
              Calendário
            </TabsTrigger>
            <TabsTrigger value="table">
              Tabela
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button @click="handleCreateNew()">
          <Icon name="lucide:plus" class="mr-2 size-4" />
          Agendar reunião
        </Button>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Total
          </CardTitle>
          <Icon name="lucide:calendar" class="size-4 text-muted-foreground" />
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
          <Icon name="lucide:clock" class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ scheduledCount }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Esta semana
          </CardTitle>
          <Icon name="lucide:calendar-days" class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ thisWeekCount }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle class="text-sm font-medium">
            Concluídas
          </CardTitle>
          <Icon name="lucide:check-circle" class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ completedCount }}
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-if="isLoading" class="space-y-4">
      <Card class="border shadow-sm">
        <CardContent class="p-4 space-y-2">
          <Skeleton class="h-8 w-[250px]" />
          <Skeleton class="h-48 w-full" />
        </CardContent>
      </Card>
    </div>

    <template v-else>
      <MeetingsCalendar
        v-if="pageMode === 'calendar'"
        :meetings="meetingsData"
        @select="handleEdit"
        @create="handleCreateNew"
      />

      <DataTable
        v-else
        :data="meetingsData"
        :columns="columns"
        :meta="{ onEdit: handleEdit, onDelete: handleDelete }"
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
      v-if="selectedItems.length > 0 && pageMode === 'table'"
      :count="selectedItems.length"
      :on-delete="handleMultiDelete"
    />

    <Sheet v-model:open="isSheetOpen">
      <SheetContent class="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader class="shrink-0 space-y-1 border-b px-6 py-5 text-left">
          <div class="flex items-center gap-3 pr-8">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon
                :name="isEditingMeeting ? 'lucide:pencil' : 'lucide:calendar-plus'"
                class="size-4"
              />
            </div>
            <div class="min-w-0">
              <SheetTitle class="text-lg">
                {{ isEditingMeeting ? 'Editar reunião' : 'Agendar reunião' }}
              </SheetTitle>
              <SheetDescription class="text-sm">
                {{ isEditingMeeting
                  ? 'Atualize horário, vínculos e o registro desta reunião.'
                  : 'Defina horário, tipo e vincule a um lead, contato ou empresa.' }}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div class="flex-1 overflow-y-auto px-6 py-5">
          <MeetingForm
            :initial-data="selectedMeeting || undefined"
            @success="onFormSuccess"
            @cancel="closeSheet"
            @submitting="isSavingMeeting = $event"
          />
        </div>

        <SheetFooter class="shrink-0 gap-2 border-t bg-muted/30 px-6 py-4 sm:space-x-0">
          <Button variant="outline" :disabled="isSavingMeeting" @click="closeSheet">
            Cancelar
          </Button>
          <Button type="submit" form="meeting-form" :disabled="isSavingMeeting">
            <Icon
              v-if="isSavingMeeting"
              name="lucide:loader-2"
              class="mr-2 size-4 animate-spin"
            />
            {{ isEditingMeeting ? 'Salvar alterações' : 'Agendar reunião' }}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>
</template>
