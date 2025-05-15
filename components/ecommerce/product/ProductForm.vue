<template>
  <div class="flex flex-col gap-6">
    <!-- Cabeçalho -->
    <div class="flex flex-col md:flex-row justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ isEdit ? $t('Edit Product') : $t('Create Product') }}</h1>
        <p class="text-muted-foreground">
          {{ isEdit ? $t('Update product details') : $t('Create a new product') }}
        </p>
      </div>

      <div class="flex gap-2">
        <Button variant="outline" @click="router.back()">
          {{ $t('Cancel') }}
        </Button>
        <Button 
          v-if="currentStep === steps.length - 1" 
          :loading="loading" 
          @click="saveProduct"
        >
          {{ isEdit ? $t('Update Product') : $t('Create Product') }}
        </Button>
      </div>
    </div>

    <!-- Steps -->
    <div class="w-full">
      <div class="flex space-x-2 mb-4">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="flex flex-col md:flex-row items-center gap-1 md:gap-2"
          :class="{ 'flex-1': true }"
        >
          <div 
            class="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium"
            :class="{
              'bg-primary text-primary-foreground border-primary': currentStep >= index,
              'border-muted text-muted-foreground': currentStep < index
            }"
          >
            {{ index + 1 }}
          </div>
          <span 
            class="text-sm font-medium hidden md:inline"
            :class="{
              'text-foreground': currentStep >= index,
              'text-muted-foreground': currentStep < index
            }"
          >
            {{ step.title }}
          </span>
          <div 
            v-if="index < steps.length - 1" 
            class="h-px w-8 md:w-full bg-muted-foreground/30"
          ></div>
        </div>
      </div>

      <!-- Step Contents -->
      <Card class="mt-4">
        <CardHeader>
          <CardTitle>{{ steps[currentStep].title }}</CardTitle>
          <CardDescription>{{ steps[currentStep].description }}</CardDescription>
        </CardHeader>

        <CardContent>
          <!-- Etapa 1: Dados gerais -->
          <form 
            v-if="currentStep === 0" 
            @submit.prevent="nextStep" 
            id="general-form"
            class="space-y-4"
          >
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="title">{{ $t('Title') }} *</Label>
                <Input 
                  id="title" 
                  v-model="productData.title" 
                  :placeholder="$t('Product title')"
                  required
                />
                <p v-if="errors.title" class="text-destructive text-sm">
                  {{ errors.title }}
                </p>
              </div>

              <div class="grid gap-2">
                <Label for="sku">{{ $t('SKU') }}</Label>
                <Input 
                  id="sku" 
                  v-model="productData.sku" 
                  :placeholder="$t('Product code')"
                />
              </div>
            </div>

            <div class="grid gap-2">
              <Label for="description">{{ $t('Description') }}</Label>
              <Textarea 
                id="description" 
                v-model="productData.description" 
                :placeholder="$t('Product description')" 
                rows="4"
              />
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <div class="grid gap-2">
                <Label for="price">{{ $t('Price') }} *</Label>
                <Input 
                  id="price" 
                  v-model="productData.price" 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  required
                />
                <p v-if="errors.price" class="text-destructive text-sm">
                  {{ errors.price }}
                </p>
              </div>

              <div class="grid gap-2">
                <Label for="compare_at_price">{{ $t('Compare at Price') }}</Label>
                <Input 
                  id="compare_at_price" 
                  v-model="productData.compare_at_price" 
                  type="number" 
                  min="0" 
                  step="0.01"
                />
              </div>

              <div class="grid gap-2">
                <Label for="inventory">{{ $t('Inventory') }}</Label>
                <Input 
                  id="inventory" 
                  v-model="productData.inventory" 
                  type="number" 
                  min="0" 
                  step="1"
                />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="status">{{ $t('Status') }}</Label>
                <Select id="status" v-model="productData.status">
                  <option value="draft">{{ $t('Draft') }}</option>
                  <option value="published">{{ $t('Published') }}</option>
                  <option value="archived">{{ $t('Archived') }}</option>
                </Select>
              </div>

              <div class="grid gap-2">
                <Label for="category">{{ $t('Category') }}</Label>
                <Select id="category" v-model="productData.category_id">
                  <option value="">{{ $t('Select a category') }}</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </Select>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="meta_title">{{ $t('Meta Title') }}</Label>
                <Input 
                  id="meta_title" 
                  v-model="productData.meta_title" 
                  :placeholder="$t('SEO title')"
                />
              </div>

              <div class="grid gap-2">
                <Label for="meta_description">{{ $t('Meta Description') }}</Label>
                <Textarea 
                  id="meta_description" 
                  v-model="productData.meta_description" 
                  :placeholder="$t('SEO description')"
                  rows="2"
                />
              </div>
            </div>
          </form>

          <!-- Etapa 2: Imagem Principal -->
          <div v-if="currentStep === 1" class="space-y-4">
            <div class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center">
              <div v-if="thumbPreview || product?.thumb" class="mb-4">
                <img 
                  :src="thumbPreview || product?.thumb?.url" 
                  alt="Thumbnail Preview" 
                  class="mx-auto max-h-64 object-contain"
                />
              </div>
              
              <div v-if="!thumbPreview && !product?.thumb" class="mb-4">
                <ImageIcon class="mx-auto h-16 w-16 text-muted-foreground" />
                <p class="mt-2 text-sm text-muted-foreground">
                  {{ $t('Upload a main product image') }}
                </p>
                <p class="text-xs text-muted-foreground/75">
                  {{ $t('PNG, JPG or WebP up to 10MB') }}
                </p>
              </div>
              
              <div class="flex justify-center mt-4">
                <Button type="button" variant="outline" @click="$refs.thumbInput.click()">
                  {{ thumbPreview || product?.thumb ? $t('Change Image') : $t('Upload Image') }}
                </Button>
                <Button 
                  v-if="thumbPreview || product?.thumb" 
                  type="button" 
                  variant="destructive" 
                  class="ml-2"
                  @click="removeThumb"
                >
                  {{ $t('Remove') }}
                </Button>
              </div>
              
              <input 
                ref="thumbInput"
                type="file" 
                accept="image/*" 
                class="hidden"
                @change="onThumbChange"
              />
            </div>
            
            <div class="grid gap-2">
              <Label for="alt">{{ $t('Alt Text') }}</Label>
              <Input 
                id="alt" 
                v-model="thumbAlt" 
                :placeholder="$t('Image description for accessibility')"
              />
              <p class="text-xs text-muted-foreground">
                {{ $t('Provide a description for screen readers and SEO') }}
              </p>
            </div>
          </div>

          <!-- Etapa 3: Galeria -->
          <div v-if="currentStep === 2" class="space-y-4">
            <div class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <div v-if="galleryPreviews.length || (product?.gallery && product.gallery.length)" class="mb-4">
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  <div
                    v-for="(preview, index) in [...galleryPreviews, ...(product?.gallery || [])]"
                    :key="index"
                    class="relative border rounded-md overflow-hidden aspect-square"
                  >
                    <img 
                      :src="preview.url || preview" 
                      alt="Gallery Preview" 
                      class="w-full h-full object-cover"
                    />
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon"
                      class="absolute top-1 right-1 h-6 w-6"
                      @click="removeGalleryImage(index)"
                    >
                      <XIcon class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div v-if="!galleryPreviews.length && (!product?.gallery || !product.gallery.length)" class="mb-4">
                <ImageIcon class="mx-auto h-12 w-12 text-muted-foreground" />
                <p class="mt-2 text-sm text-muted-foreground">
                  {{ $t('Upload product gallery images') }}
                </p>
                <p class="text-xs text-muted-foreground/75">
                  {{ $t('PNG, JPG or WebP up to 10MB') }}
                </p>
              </div>
              
              <div class="flex justify-center mt-4">
                <Button type="button" variant="outline" @click="$refs.galleryInput.click()">
                  {{ $t('Add Images') }}
                </Button>
              </div>
              
              <input 
                ref="galleryInput"
                type="file" 
                accept="image/*" 
                multiple
                class="hidden"
                @change="onGalleryChange"
              />
            </div>
          </div>

          <!-- Etapa 4: Variantes -->
          <div v-if="currentStep === 3" class="space-y-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium">{{ $t('Product Variants') }}</h3>
              <Button type="button" variant="outline" size="sm" @click="addVariant">
                <PlusIcon class="h-4 w-4 mr-2" />
                {{ $t('Add Variant') }}
              </Button>
            </div>

            <div v-if="!variants.length" class="text-center py-8 border rounded-md">
              <PackageIcon class="mx-auto h-12 w-12 text-muted-foreground" />
              <p class="mt-2 text-sm text-muted-foreground">
                {{ $t('No variants added yet') }}
              </p>
              <p class="text-xs text-muted-foreground/75">
                {{ $t('Add variants like size, color, material, etc.') }}
              </p>
            </div>

            <div v-for="(variant, index) in variants" :key="index" class="border rounded-md p-4 space-y-4">
              <div class="flex justify-between items-center">
                <h4 class="font-medium">{{ $t('Variant') }} #{{ index + 1 }}</h4>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  @click="removeVariant(index)"
                >
                  <TrashIcon class="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <div class="grid gap-2">
                  <Label :for="`variant-title-${index}`">{{ $t('Title') }} *</Label>
                  <Input 
                    :id="`variant-title-${index}`" 
                    v-model="variants[index].title" 
                    :placeholder="$t('e.g. Small, Red, etc.')"
                    required
                  />
                </div>

                <div class="grid gap-2">
                  <Label :for="`variant-price-${index}`">{{ $t('Price') }} *</Label>
                  <Input 
                    :id="`variant-price-${index}`" 
                    v-model="variants[index].price" 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    required
                  />
                </div>

                <div class="grid gap-2">
                  <Label :for="`variant-inventory-${index}`">{{ $t('Inventory') }}</Label>
                  <Input 
                    :id="`variant-inventory-${index}`" 
                    v-model="variants[index].inventory" 
                    type="number" 
                    min="0" 
                    step="1"
                  />
                </div>
              </div>

              <div class="grid gap-2">
                <Label :for="`variant-sku-${index}`">{{ $t('SKU') }}</Label>
                <Input 
                  :id="`variant-sku-${index}`" 
                  v-model="variants[index].sku" 
                  :placeholder="$t('Variant code')"
                />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <div class="flex justify-between w-full">
            <Button 
              v-if="currentStep > 0" 
              type="button" 
              variant="outline" 
              @click="currentStep--"
            >
              {{ $t('Previous') }}
            </Button>
            <div></div>
            <Button 
              v-if="currentStep < steps.length - 1" 
              type="button" 
              @click="nextStep"
            >
              {{ $t('Next') }}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { PlusIcon, XIcon, ImageIcon, PackageIcon, TrashIcon } from 'lucide-vue-next'
import type { ProductFormData, VariantFormData, Product, Variant } from '~/types/ecommerce'
import { useProducts } from '~/composables/ecommerce/useProducts'
import { useCategories } from '~/composables/ecommerce/useCategories'
import { useToast } from '~/components/ui/toast/use-toast'

const props = defineProps<{
  id?: string
}>()

const router = useRouter()
const route = useRoute()
const toast = useToast()

// Get product ID from props or route
const productId = computed(() => props.id || route.params.id as string)
const isEdit = computed(() => !!productId.value)

const { 
  loading, 
  error, 
  getProductById, 
  createProduct, 
  updateProduct,
  uploadProductImage,
  deleteProductImage
} = useProducts()

const { categories, fetchCategories } = useCategories()

// Define the steps
const steps = [
  { 
    title: 'General Information', 
    description: 'Basic product details' 
  },
  { 
    title: 'Main Image', 
    description: 'Upload a thumbnail image' 
  },
  { 
    title: 'Gallery', 
    description: 'Add additional product images' 
  },
  { 
    title: 'Variants', 
    description: 'Create product variants' 
  }
]

const currentStep = ref(0)
const product = ref<Product | null>(null)
const errors = reactive({
  title: '',
  price: ''
})

// Product form data
const productData = reactive<ProductFormData>({
  title: '',
  slug: '',
  sku: '',
  description: '',
  price: 0,
  compare_at_price: undefined,
  status: 'draft',
  inventory: 0,
  meta_title: '',
  meta_description: '',
  category_id: ''
})

// Variant data
const variants = ref<VariantFormData[]>([])
const existingVariants = ref<Variant[]>([])

// Thumb image
const thumbFile = ref<File | null>(null)
const thumbPreview = ref<string | null>(null)
const thumbAlt = ref('')
const thumbToRemove = ref<string | null>(null)

// Gallery images
const galleryFiles = ref<File[]>([])
const galleryPreviews = ref<string[]>([])
const galleryToRemove = ref<string[]>([])

// References for file inputs
const thumbInput = ref<HTMLInputElement | null>(null)
const galleryInput = ref<HTMLInputElement | null>(null)

// Load data on mount if editing
onMounted(async () => {
  await fetchCategories()
  
  if (isEdit.value) {
    await loadProduct()
  }
})

// Load existing product data
const loadProduct = async () => {
  if (!productId.value) return
  
  try {
    const productData = await getProductById(productId.value)
    if (productData) {
      product.value = productData
      
      // Populate form data
      Object.keys(productData).forEach((key) => {
        if (key in productData) {
          // @ts-ignore
          productData[key] = productData[key]
        }
      })
      
      // Set variants
      if (productData.variants?.length) {
        existingVariants.value = productData.variants
        variants.value = productData.variants.map(v => ({
          title: v.title,
          sku: v.sku || '',
          price: v.price,
          inventory: v.inventory
        }))
      }
    }
  } catch (e) {
    console.error('Error loading product:', e)
    toast({
      title: 'Error',
      description: 'Failed to load product data',
      variant: 'destructive'
    })
  }
}

// Methods
const validateStep = () => {
  let valid = true
  
  // Validar etapa atual
  if (currentStep.value === 0) {
    // Validar dados gerais
    errors.title = ''
    errors.price = ''
    
    if (!productData.title.trim()) {
      errors.title = 'Title is required'
      valid = false
    }
    
    if (!productData.price || productData.price <= 0) {
      errors.price = 'Price must be greater than 0'
      valid = false
    }
  }
  
  return valid
}

const nextStep = () => {
  if (!validateStep()) return
  
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const saveProduct = async () => {
  if (!validateStep()) return
  
  try {
    let productResponse
    
    // 1. Create or update product
    if (isEdit.value && productId.value) {
      productResponse = await updateProduct(productId.value, productData)
    } else {
      productResponse = await createProduct(productData)
    }
    
    if (!productResponse) throw new Error('Failed to save product')
    
    const id = productResponse.id
    
    // 2. Upload thumb image if changed
    if (thumbFile.value) {
      await uploadProductImage(
        id, 
        thumbFile.value, 
        'thumb', 
        thumbAlt.value,
        0
      )
    }
    
    // Remove thumb if marked for removal
    if (thumbToRemove.value) {
      await deleteProductImage(thumbToRemove.value)
    }
    
    // 3. Upload gallery images
    if (galleryFiles.value.length) {
      for (let i = 0; i < galleryFiles.value.length; i++) {
        await uploadProductImage(
          id,
          galleryFiles.value[i],
          'gallery',
          '',
          i
        )
      }
    }
    
    // Remove gallery images if marked for removal
    if (galleryToRemove.value.length) {
      for (const imageId of galleryToRemove.value) {
        await deleteProductImage(imageId)
      }
    }
    
    // 4. Handle variants (future implementation)
    // ...
    
    // Show success message
    toast({
      title: 'Success',
      description: isEdit.value ? 'Product updated successfully' : 'Product created successfully',
    })
    
    // Redirect to product list
    router.push('/ecommerce/products')
  } catch (e) {
    console.error('Error saving product:', e)
    toast({
      title: 'Error',
      description: 'Failed to save product',
      variant: 'destructive'
    })
  }
}

// Image handling
const onThumbChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return

  const file = target.files[0]
  thumbFile.value = file
  
  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    thumbPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const removeThumb = () => {
  thumbFile.value = null
  thumbPreview.value = null
  
  // If editing and there's an existing thumb, mark for removal
  if (product.value?.thumb) {
    thumbToRemove.value = product.value.thumb.id
  }
  
  // Clear file input
  if (thumbInput.value) {
    thumbInput.value.value = ''
  }
}

const onGalleryChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return

  const newFiles = Array.from(target.files)
  
  // Add to existing files
  galleryFiles.value = [...galleryFiles.value, ...newFiles]
  
  // Create previews for new files
  newFiles.forEach(file => {
    const reader = new FileReader()
    reader.onload = (e) => {
      galleryPreviews.value.push(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  })
}

const removeGalleryImage = (index: number) => {
  // Check if it's a new uploaded image or existing one
  if (index < galleryPreviews.value.length) {
    // Remove from previews and files
    galleryPreviews.value.splice(index, 1)
    galleryFiles.value.splice(index, 1)
  } else {
    // It's an existing image, mark for removal
    const adjustedIndex = index - galleryPreviews.value.length
    if (product.value?.gallery?.[adjustedIndex]) {
      galleryToRemove.value.push(product.value.gallery[adjustedIndex].id)
    }
  }
  
  // Clear file input
  if (galleryInput.value) {
    galleryInput.value.value = ''
  }
}

// Variant methods
const addVariant = () => {
  variants.value.push({
    title: '',
    sku: '',
    price: productData.price,
    inventory: 0
  })
}

const removeVariant = (index: number) => {
  variants.value.splice(index, 1)
}
</script> 