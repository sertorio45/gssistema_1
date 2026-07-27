<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  middleware: ['auth'],
  title: 'Biblioteca de mídia',
})

const social = useMarketingSocial()
const search = ref('')
const purpose = ref<'all' | 'publication' | 'reference'>('all')
const category = ref('all')
const uploadPurpose = ref<'publication' | 'reference'>('publication')
const uploading = ref(false)
const deleting = ref(false)
const deleteDialogOpen = ref(false)
const previewDialogOpen = ref(false)
const activeAsset = ref<any>(null)
const newFolderName = ref('')
const creatingFolder = ref(false)

const { can } = useWorkspace()
const canManageLibrary = computed(() => can('marketing.social.library.manage'))

const { data: assets, pending, refresh } = await useAsyncData(
  () => `marketing-library-${social.tenantId.value}-${category.value}`,
  () => social.listAssets({
    ...(category.value !== 'all' ? { category: category.value } : {}),
  }),
  { watch: [social.tenantId, category], default: () => [] },
)

const { data: folders, refresh: refreshFolders } = await useAsyncData(
  () => `library-folders-${social.tenantId.value}`,
  () => $fetch<{ data: any[] }>('/api/marketing/social/library/meta', {
    query: { tenant_id: social.tenantId.value || undefined, type: 'folders' },
  }),
  { watch: [social.tenantId], default: () => ({ data: [] }) },
)

const categories = [
  { value: 'all', label: 'Todas categorias' },
  { value: 'logo', label: 'Logos' },
  { value: 'brand_manual', label: 'Manual da marca' },
  { value: 'photo', label: 'Fotos' },
  { value: 'video', label: 'Vídeos' },
  { value: 'product', label: 'Produtos' },
  { value: 'document', label: 'Documentos' },
  { value: 'reference', label: 'Referências' },
]

const filteredAssets = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('pt-BR')
  return assets.value.filter((asset: any) => {
    const matchesPurpose = purpose.value === 'all' || asset.purpose === purpose.value
    const matchesSearch = !term || asset.name.toLocaleLowerCase('pt-BR').includes(term)
    const active = asset.lifecycle !== 'discontinued'
    return matchesPurpose && matchesSearch && active
  })
})

async function createFolder() {
  if (!newFolderName.value.trim() || !canManageLibrary.value)
    return
  creatingFolder.value = true
  try {
    await $fetch('/api/marketing/social/library/meta', {
      method: 'POST',
      body: { kind: 'folder', name: newFolderName.value.trim() },
    })
    newFolderName.value = ''
    toast.success('Pasta criada')
    await refreshFolders()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || 'Falha ao criar pasta')
  }
  finally {
    creatingFolder.value = false
  }
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length)
    return
  uploading.value = true
  try {
    for (const file of Array.from(input.files))
      await social.uploadAsset(file, uploadPurpose.value)
    toast.success('Arquivos adicionados à biblioteca')
    await refresh()
    input.value = ''
  }
  catch (error: any) {
    toast.error(error?.message || 'Não foi possível enviar os arquivos')
  }
  finally {
    uploading.value = false
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024)
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function openPreview(asset: any) {
  activeAsset.value = asset
  previewDialogOpen.value = true
}

function openDelete(asset: any) {
  activeAsset.value = asset
  deleteDialogOpen.value = true
}

function deleteFromPreview() {
  previewDialogOpen.value = false
  openDelete(activeAsset.value)
}

async function deleteAsset() {
  if (!activeAsset.value)
    return
  deleting.value = true
  try {
    await social.deleteAsset(activeAsset.value.id)
    toast.success(activeAsset.value.purpose === 'reference' ? 'Referência excluída' : 'Peça excluída')
    deleteDialogOpen.value = false
    activeAsset.value = null
    await refresh()
  }
  catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || 'Não foi possível excluir o arquivo')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Biblioteca
        </h1>
        <p class="mt-1 text-muted-foreground">
          Organize peças finais e referências em um só lugar.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Select v-model="uploadPurpose">
          <SelectTrigger class="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="publication">
              Peça final
            </SelectItem>
            <SelectItem value="reference">
              Referência
            </SelectItem>
          </SelectContent>
        </Select>
        <Button as-child :disabled="uploading">
          <label class="cursor-pointer">
            <Icon name="lucide:upload" class="mr-2 h-4 w-4" />
            {{ uploading ? 'Enviando...' : 'Enviar arquivos' }}
            <input
              type="file"
              multiple
              :accept="uploadPurpose === 'publication' ? 'image/*,video/mp4,video/quicktime' : 'image/*,video/mp4,video/quicktime,application/pdf'"
              class="hidden"
              @change="upload"
            >
          </label>
        </Button>
      </div>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div class="relative max-w-lg flex-1">
        <Icon name="lucide:search" class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input v-model="search" class="pl-9" placeholder="Buscar arquivos" />
      </div>
      <Select v-model="purpose">
        <SelectTrigger class="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            Todos os arquivos
          </SelectItem>
          <SelectItem value="publication">
            Peças finais
          </SelectItem>
          <SelectItem value="reference">
            Referências
          </SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="category">
        <SelectTrigger class="w-full sm:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="item in categories" :key="item.value" :value="item.value">
            {{ item.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <Card v-if="canManageLibrary">
      <CardContent class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Input v-model="newFolderName" placeholder="Nova pasta" class="sm:max-w-xs" />
        <Button variant="outline" :disabled="creatingFolder || !newFolderName.trim()" @click="createFolder">
          Criar pasta
        </Button>
        <p class="text-xs text-muted-foreground">
          {{ (folders?.data || []).length }} pastas · use categorias e pastas para organizar logos, manuais e referências
        </p>
      </CardContent>
    </Card>

    <MarketingPageSkeleton v-if="pending" variant="grid" :cards="10" />

    <div v-else-if="filteredAssets.length" class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      <Card
        v-for="asset in filteredAssets as any[]"
        :key="asset.id"
        class="group relative cursor-pointer overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
        @click="openPreview(asset)"
      >
        <Button
          variant="secondary"
          size="icon"
          class="absolute right-2 top-2 z-10 h-8 w-8 opacity-0 shadow-sm transition-opacity focus:opacity-100 group-hover:opacity-100"
          title="Excluir arquivo"
          @click.stop="openDelete(asset)"
        >
          <Icon name="lucide:trash-2" class="h-4 w-4 text-destructive" />
        </Button>
        <div class="aspect-square overflow-hidden bg-muted">
          <img
            v-if="asset.mime_type?.startsWith('image/')"
            :src="asset.preview_url"
            :alt="asset.name"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          >
          <div v-else class="h-full flex items-center justify-center">
            <Icon
              :name="asset.mime_type?.startsWith('video/') ? 'lucide:file-video' : 'lucide:file-text'"
              class="h-10 w-10 text-muted-foreground"
            />
          </div>
        </div>
        <CardContent class="p-3">
          <p class="truncate text-sm font-medium" :title="asset.name">
            {{ asset.name }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ formatSize(Number(asset.size_bytes || 0)) }}
          </p>
          <Badge class="mt-2" variant="secondary">
            {{ asset.purpose === 'publication' ? 'Peça final' : 'Referência' }}
          </Badge>
        </CardContent>
      </Card>
    </div>

    <Card v-else>
      <CardContent class="flex flex-col items-center py-14 text-center">
        <Icon name="lucide:images" class="mb-4 h-10 w-10 text-muted-foreground" />
        <h2 class="font-semibold">
          Biblioteca vazia
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Envie artes, vídeos ou documentos de referência.
        </p>
      </CardContent>
    </Card>

    <Dialog v-model:open="previewDialogOpen">
      <DialogContent class="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{{ activeAsset?.name }}</DialogTitle>
          <DialogDescription>
            {{ activeAsset?.purpose === 'publication' ? 'Peça final' : 'Referência' }}
            · {{ formatSize(Number(activeAsset?.size_bytes || 0)) }}
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-[70vh] overflow-hidden rounded-xl bg-muted">
          <img
            v-if="activeAsset?.mime_type?.startsWith('image/')"
            :src="activeAsset.preview_url"
            :alt="activeAsset.name"
            class="max-h-[70vh] w-full object-contain"
          >
          <video
            v-else-if="activeAsset?.mime_type?.startsWith('video/')"
            :src="activeAsset.preview_url"
            class="max-h-[70vh] w-full"
            controls
          />
          <div v-else class="h-72 flex flex-col items-center justify-center">
            <Icon name="lucide:file-text" class="mb-3 h-12 w-12 text-muted-foreground" />
            <p class="text-sm text-muted-foreground">
              Visualização indisponível para este formato.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            @click="deleteFromPreview"
          >
            <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
            Excluir arquivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="deleteDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir “{{ activeAsset?.name }}”?</DialogTitle>
          <DialogDescription>
            Esta ação remove definitivamente o arquivo. Se ele estiver vinculado a uma publicação, remova o vínculo antes de tentar novamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">
            Cancelar
          </Button>
          <Button variant="destructive" :disabled="deleting" @click="deleteAsset">
            <Icon v-if="deleting" name="lucide:loader-circle" class="mr-2 h-4 w-4 animate-spin" />
            {{ deleting ? 'Excluindo...' : 'Excluir definitivamente' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
