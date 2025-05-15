<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
import type { Product, InventoryPolicy } from '~/types/ecommerce/product'
import type { ProductImage } from '~/types/ecommerce/product-image'
import { ref } from 'vue'
import ImageUpload from './ImageUpload.vue'
import TagsInputField from './TagsInputField.vue'

const props = defineProps<{
  product?: Product
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', product: Product): void
}>()

const currentStep = ref(0)
const steps = [
  {
    title: 'Informações Básicas',
    description: 'Título, descrição e SKU do produto',
    icon: 'lucide:info',
  },
  {
    title: 'Preços e Estoque',
    description: 'Configurações de preço e estoque',
    icon: 'lucide:dollar-sign',
  },
  {
    title: 'Imagens',
    description: 'Upload de thumbnail e galeria',
    icon: 'lucide:image',
  },
  {
    title: 'SEO e Extras',
    description: 'Otimização para busca e informações adicionais',
    icon: 'lucide:search',
  },
]

const form = ref({
  // Step 1: Basic Info
  title: props.product?.title || '',
  description: props.product?.description || '',
  short_description: props.product?.short_description || '',
  sku: props.product?.sku || '',
  
  // Step 2: Pricing & Stock
  price: props.product?.price || 0,
  compare_at_price: props.product?.compare_at_price || 0,
  cost_price: props.product?.cost_price || 0,
  inventory_quantity: props.product?.inventory_quantity || 0,
  inventory_policy: props.product?.inventory_policy || 'deny',
  
  // Step 3: Images
  images: props.product?.images || [],
  
  // Step 4: SEO & Extras
  meta_title: props.product?.meta_title || '',
  meta_description: props.product?.meta_description || '',
  tags: [] as string[],
  status: props.product?.status || 'draft',
})

const formErrors = ref({
  title: '',
  sku: '',
  price: '',
})

function validateStep(step: number): boolean {
  formErrors.value = {
    title: '',
    sku: '',
    price: '',
  }
  
  switch (step) {
    case 0: // Basic Info
      if (!form.value.title) {
        formErrors.value.title = 'Título é obrigatório'
        return false
      }
      if (!form.value.sku) {
        formErrors.value.sku = 'SKU é obrigatório'
        return false
      }
      break
      
    case 1: // Pricing & Stock
      if (form.value.price <= 0) {
        formErrors.value.price = 'Preço deve ser maior que zero'
        return false
      }
      break
  }
  
  return true
}

function goToStep(step: number) {
  // Se estiver indo para uma etapa posterior, valide as etapas anteriores
  if (step > currentStep.value) {
    for (let i = currentStep.value; i < step; i++) {
      if (!validateStep(i)) {
        return
      }
    }
  }
  
  currentStep.value = step
}

function nextStep() {
  if (validateStep(currentStep.value)) {
    if (currentStep.value < steps.length - 1) {
      currentStep.value++
    }
  }
}

function previousStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function handleSubmit() {
  if (validateStep(currentStep.value)) {
    // Gerar um slug para novos produtos (será substituído pelo backend)
    const slug = form.value.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036F]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      
    emit('submit', {
      ...form.value,
      id: props.product?.id,
      slug,
    } as unknown as Product)
  }
}

function updateImages(images: ProductImage[]) {
  form.value.images = images
}
</script>

<template>
  <div class="space-y-8">
    <!-- Stepper Header -->
    <nav aria-label="Progress">
      <ol role="list" class="space-y-4 md:flex md:space-y-0 md:space-x-8">
        <li 
          v-for="(step, index) in steps" 
          :key="index" 
          class="md:flex-1 cursor-pointer"
          @click="goToStep(index)"
        >
          <div
            class="group flex flex-col border-l-4 border-l-primary py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4"
            :class="{
              'border-l-primary md:border-t-primary': index <= currentStep,
              'border-l-muted-foreground md:border-t-muted-foreground': index > currentStep,
            }"
          >
            <span class="text-sm font-medium">
              <Icon :name="step.icon" class="mr-2 inline-block h-5 w-5" />
              {{ step.title }}
            </span>
            <span class="text-sm text-muted-foreground">{{ step.description }}</span>
          </div>
        </li>
      </ol>
    </nav>

    <!-- Form Steps -->
    <div class="space-y-6">
      <!-- Step 1: Basic Info -->
      <div v-if="currentStep === 0">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="title">Título</Label>
            <Input
              id="title"
              v-model="form.title"
              :error="formErrors.title"
              placeholder="Nome do produto"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="sku">SKU</Label>
            <Input
              id="sku"
              v-model="form.sku"
              :error="formErrors.sku"
              placeholder="Código do produto"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="description">Descrição</Label>
            <Textarea
              id="description"
              v-model="form.description"
              placeholder="Descrição detalhada do produto"
              rows="4"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="short_description">Descrição Curta</Label>
            <Textarea
              id="short_description"
              v-model="form.short_description"
              placeholder="Breve descrição do produto"
              rows="2"
            />
          </div>
        </div>
      </div>

      <!-- Step 2: Pricing & Stock -->
      <div v-if="currentStep === 1">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="price">Preço</Label>
            <Input
              id="price"
              v-model.number="form.price"
              type="number"
              :error="formErrors.price"
              min="0"
              step="0.01"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="compare_at_price">Preço Comparativo</Label>
            <Input
              id="compare_at_price"
              v-model.number="form.compare_at_price"
              type="number"
              min="0"
              step="0.01"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="cost_price">Preço de Custo</Label>
            <Input
              id="cost_price"
              v-model.number="form.cost_price"
              type="number"
              min="0"
              step="0.01"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="inventory_quantity">Estoque</Label>
            <Input
              id="inventory_quantity"
              v-model.number="form.inventory_quantity"
              type="number"
              min="0"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="inventory_policy">Política de Estoque</Label>
            <Select v-model="form.inventory_policy">
              <option value="deny">Negar vendas sem estoque</option>
              <option value="continue">Permitir vendas sem estoque</option>
            </Select>
          </div>
        </div>
      </div>

      <!-- Step 3: Images -->
      <div v-if="currentStep === 2">
        <div class="space-y-4">
          <ImageUpload
            :product-id="props.product?.id || ''"
            :images="form.images"
            @update:images="updateImages"
          />
          <p class="text-sm text-muted-foreground">
            Você pode adicionar imagens após criar o produto, caso necessário.
          </p>
        </div>
      </div>

      <!-- Step 4: SEO & Extras -->
      <div v-if="currentStep === 3">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="meta_title">Meta Título</Label>
            <Input
              id="meta_title"
              v-model="form.meta_title"
              placeholder="Título para SEO"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="meta_description">Meta Descrição</Label>
            <Textarea
              id="meta_description"
              v-model="form.meta_description"
              placeholder="Descrição para SEO"
              rows="3"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="tags">Tags</Label>
            <TagsInputField
              v-model="form.tags"
              placeholder="Adicionar tag"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="status">Status</Label>
            <Select v-model="form.status">
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="archived">Arquivado</option>
            </Select>
          </div>
        </div>
      </div>
    </div>

    <!-- Step Indicator -->
    <div class="flex justify-center gap-2">
      <button
        v-for="(_, index) in steps"
        :key="index"
        type="button"
        class="w-3 h-3 rounded-full"
        :class="index === currentStep ? 'bg-primary' : 'bg-muted'"
        @click="goToStep(index)"
      />
    </div>

    <!-- Navigation Buttons -->
    <div class="flex justify-between">
      <Button
        variant="outline"
        :disabled="currentStep === 0"
        @click="previousStep"
      >
        <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
        Anterior
      </Button>

      <div class="flex space-x-2">
        <Button
          v-if="currentStep < steps.length - 1"
          variant="default"
          :disabled="props.loading"
          @click="nextStep"
        >
          <span v-if="props.loading" class="mr-2">
            <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
          </span>
          Próximo
          <Icon name="lucide:arrow-right" class="ml-2 h-4 w-4" />
        </Button>

        <Button
          v-else
          variant="default"
          :disabled="props.loading"
          @click="handleSubmit"
        >
          <span v-if="props.loading" class="mr-2">
            <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
          </span>
          Salvar Produto
          <Icon name="lucide:check" class="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template> 