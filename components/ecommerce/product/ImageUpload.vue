<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
import type { ProductImage } from '~/types/ecommerce/product-image'
import { useToast } from '@/components/ui/toast/use-toast'
import { useSupabaseClient } from '#imports'
import { ref, watch } from 'vue'

const props = defineProps<{
  productId: string
  images?: ProductImage[]
}>()

const emit = defineEmits<{
  (e: 'update:images', images: ProductImage[]): void
}>()

const supabase = useSupabaseClient()
const { toast } = useToast()

const images = ref<ProductImage[]>(props.images || [])
const uploading = ref(false)
const dragActive = ref(false)
const bucketName = 'products'
const error = ref<string | null>(null)

watch(() => props.images, (newImages) => {
  if (newImages) {
    images.value = newImages
  }
})

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = false
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = false

  if (!e.dataTransfer?.files) {
    return
  }

  await uploadFiles(Array.from(e.dataTransfer.files))
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) {
    return
  }

  await uploadFiles(Array.from(input.files))
  input.value = '' // Reset input
}

async function uploadFiles(files: File[]) {
  if (!files.length) {
    return
  }

  uploading.value = true
  error.value = null

  try {
    // Verificar se o bucket existe
    const { data: buckets, error: bucketsError } = await supabase.storage
      .listBuckets()

    if (bucketsError) {
      throw bucketsError
    }

    const bucketExists = buckets.some(bucket => bucket.name === bucketName)
    if (!bucketExists) {
      // Tentar criar o bucket automaticamente
      try {
        const { error: createBucketError } = await supabase.storage
          .createBucket(bucketName, { public: true })
        
        if (createBucketError) {
          throw new Error(`Não foi possível criar o bucket '${bucketName}': ${createBucketError.message}`)
        }
        
        toast({
          title: 'Sucesso',
          description: `Bucket '${bucketName}' criado automaticamente`,
        })
      } catch (bucketCreateErr) {
        throw new Error(`Bucket '${bucketName}' não encontrado e não foi possível criá-lo. Erro: ${(bucketCreateErr as Error).message}`)
      }
    }

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Erro',
          description: `${file.name} não é uma imagem válida`,
          variant: 'destructive',
        })
        continue
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${props.productId}/${fileName}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      // Determine if this is the thumbnail (first image if none exists)
      const hasThumbnail = images.value.some(img => img.is_thumbnail)
      const isThumbnail = !hasThumbnail && images.value.length === 0

      // Save to database
      const { error: dbError, data: image } = await supabase
        .from('ecommerce_images')
        .insert({
          product_id: props.productId,
          url: publicUrl,
          filename: fileName,
          alt_text: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          is_thumbnail: isThumbnail,
          position: images.value.length,
          width: 0, // Will be updated later if needed
          height: 0, // Will be updated later if needed
        })
        .select()
        .single()

      if (dbError) {
        throw dbError
      }

      images.value.push(image)
      emit('update:images', images.value)
    }

    toast({
      title: 'Sucesso',
      description: 'Imagens enviadas com sucesso',
    })
  }
  catch (err) {
    error.value = (err as Error).message
    toast({
      title: 'Erro',
      description: (err as Error).message,
      variant: 'destructive',
    })
  }
  finally {
    uploading.value = false
  }
}

async function deleteImage(image: ProductImage) {
  try {
    // Delete from storage
    if (image.filename) {
      await supabase.storage
        .from(bucketName)
        .remove([`${props.productId}/${image.filename}`])
    } else {
      // Fallback for older images
      const filename = image.url.split('/').pop()
      if (filename) {
        await supabase.storage
          .from(bucketName)
          .remove([`${props.productId}/${filename}`])
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('ecommerce_images')
      .delete()
      .eq('id', image.id)

    if (error) {
      throw error
    }

    // Update local state
    images.value = images.value.filter(img => img.id !== image.id)
    
    // If we deleted a thumbnail, set a new one if there are remaining images
    if (image.is_thumbnail && images.value.length > 0) {
      await setAsThumbnail(images.value[0])
    } else {
      emit('update:images', images.value)
    }

    toast({
      title: 'Sucesso',
      description: 'Imagem excluída com sucesso',
    })
  }
  catch (err) {
    toast({
      title: 'Erro',
      description: (err as Error).message,
      variant: 'destructive',
    })
  }
}

async function setAsThumbnail(image: ProductImage) {
  try {
    // Update all images to not be thumbnail
    await supabase
      .from('ecommerce_images')
      .update({ is_thumbnail: false })
      .eq('product_id', props.productId)

    // Set selected image as thumbnail
    const { error } = await supabase
      .from('ecommerce_images')
      .update({ is_thumbnail: true })
      .eq('id', image.id)

    if (error) {
      throw error
    }

    // Update local state
    images.value = images.value.map(img => ({
      ...img,
      is_thumbnail: img.id === image.id,
    }))
    emit('update:images', images.value)

    toast({
      title: 'Sucesso',
      description: 'Thumbnail atualizada com sucesso',
    })
  }
  catch (err) {
    toast({
      title: 'Erro',
      description: (err as Error).message,
      variant: 'destructive',
    })
  }
}

// Reorganizar imagens com arrastar e soltar
function reorderImages(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) {
    return
  }
  
  const movedImage = images.value.splice(fromIndex, 1)[0]
  images.value.splice(toIndex, 0, movedImage)
  
  // Atualizar posição das imagens
  images.value = images.value.map((img, index) => ({
    ...img,
    position: index,
  }))
  
  // Emit updated images
  emit('update:images', images.value)
  
  // Salvar no banco de dados
  updateImagePositions()
}

async function updateImagePositions() {
  try {
    // Atualizar cada imagem com nova posição
    for (const image of images.value) {
      await supabase
        .from('ecommerce_images')
        .update({ position: image.position })
        .eq('id', image.id)
    }
  }
  catch (err) {
    toast({
      title: 'Erro',
      description: 'Erro ao atualizar posição das imagens',
      variant: 'destructive',
    })
  }
}

// Adicionar função para lidar com drag e drop de reordenação
function handleImageDragStart(e: DragEvent, index: number) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', index.toString())
  }
}

function handleImageDrop(e: DragEvent, toIndex: number) {
  e.preventDefault()
  if (e.dataTransfer) {
    const fromIndex = Number(e.dataTransfer.getData('text/plain'))
    reorderImages(fromIndex, toIndex)
  }
}
</script>

<template>
  <div>
    <div
      class="border-2 border-dashed rounded-lg p-6 text-center"
      :class="{
        'border-muted-foreground': !dragActive,
        'border-primary': dragActive,
      }"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @dragover.prevent
      @drop="handleDrop"
    >
      <div class="flex flex-col items-center gap-2">
        <Icon
          :name="uploading ? 'lucide:loader-2' : 'lucide:upload-cloud'"
          class="w-8 h-8 text-muted-foreground"
          :class="{ 'animate-spin': uploading }"
        />
        <p class="text-sm text-muted-foreground">
          Arraste e solte imagens aqui ou
          <label class="text-primary cursor-pointer hover:underline">
            escolha arquivos
            <input
              type="file"
              multiple
              accept="image/*"
              class="hidden"
              @change="handleFileSelect"
            >
          </label>
        </p>
      </div>
    </div>
    
    <!-- Error message -->
    <div v-if="error" class="mt-2 text-destructive text-sm">
      {{ error }}
    </div>

    <!-- Preview -->
    <div v-if="images.length" class="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div
        v-for="(image, index) in images"
        :key="image.id"
        class="relative group aspect-square rounded-lg overflow-hidden bg-muted"
        draggable="true"
        @dragstart="(e) => handleImageDragStart(e, index)"
        @dragover.prevent
        @drop="(e) => handleImageDrop(e, index)"
      >
        <img
          :src="image.url"
          :alt="image.alt_text || ''"
          class="w-full h-full object-cover"
        >
        
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            v-if="!image.is_thumbnail"
            variant="secondary"
            size="icon"
            @click="setAsThumbnail(image)"
          >
            <Icon name="lucide:star" class="w-4 h-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            @click="deleteImage(image)"
          >
            <Icon name="lucide:trash" class="w-4 h-4" />
          </Button>
        </div>

        <!-- Thumbnail badge -->
        <Badge
          v-if="image.is_thumbnail"
          variant="secondary"
          class="absolute top-2 right-2"
        >
          Thumb
        </Badge>
        
        <!-- Position indicator -->
        <div class="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-1.5 py-0.5 rounded">
          {{ index + 1 }}
        </div>
      </div>
    </div>
    
    <!-- Instruções de uso -->
    <div v-if="images.length > 1" class="mt-4 text-xs text-muted-foreground">
      <p>
        <Icon name="lucide:info" class="inline-block w-3 h-3 mr-1" />
        Arraste as imagens para reordenar. Clique na estrela para definir uma imagem como thumbnail.
      </p>
    </div>
  </div>
</template> 