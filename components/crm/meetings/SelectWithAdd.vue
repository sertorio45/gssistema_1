<script setup lang="ts">
import { Check, ChevronDown, Plus } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

import Button from '@/components/ui/button/Button.vue'
import Command from '@/components/ui/command/Command.vue'
import CommandEmpty from '@/components/ui/command/CommandEmpty.vue'
import CommandGroup from '@/components/ui/command/CommandGroup.vue'
import CommandInput from '@/components/ui/command/CommandInput.vue'
import CommandItem from '@/components/ui/command/CommandItem.vue'
import CommandList from '@/components/ui/command/CommandList.vue'
import CommandSeparator from '@/components/ui/command/CommandSeparator.vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogDescription from '@/components/ui/dialog/DialogDescription.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import Input from '@/components/ui/input/Input.vue'
import Label from '@/components/ui/label/Label.vue'
import Popover from '@/components/ui/popover/Popover.vue'
import PopoverContent from '@/components/ui/popover/PopoverContent.vue'
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue'
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: string
  placeholder?: string
  items: any[]
  itemLabel?: string
  itemValue?: string
  label: string
  apiEndpoint: string
  createFields: { key: string, label: string, placeholder: string, type?: string }[]
  onItemCreated?: (item: any) => void
  defaultValues?: Record<string, any>
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  itemLabel: 'name',
  itemValue: 'id',
  placeholder: 'Select item...',
})

const emit = defineEmits<Emits>()

const open = ref(false)
const search = ref('')
const showAddDialog = ref(false)
const newItemData = ref<Record<string, string>>({})
const isCreating = ref(false)

const filteredItems = computed(() => {
  if (!search.value)
    return props.items

  return props.items.filter(item => item[props.itemLabel].toLowerCase().includes(search.value.toLowerCase()))
})

const selectedItem = computed(() => {
  if (!props.modelValue)
    return null
  return props.items.find(item => item[props.itemValue] === props.modelValue)
})

const displayValue = computed(() => {
  if (selectedItem.value) {
    return selectedItem.value[props.itemLabel]
  }
  return props.placeholder
})

function handleSelect(item: any) {
  emit('update:modelValue', item[props.itemValue])
  open.value = false
  search.value = ''
}

function openAddDialog() {
  showAddDialog.value = true
  open.value = false
  // Initialize form data
  newItemData.value = {}
  props.createFields.forEach((field) => {
    newItemData.value[field.key] = ''
  })
}

async function createItem() {
  isCreating.value = true
  try {
    const payload: any = {
      ...newItemData.value,
      ...props.defaultValues,
    }

    // Get tenant_id from somewhere (you might need to pass this as a prop or use a composable)
    const { tenantId } = useTenant()
    if (tenantId.value) {
      payload.tenant_id = tenantId.value
    }

    const newItem = await $fetch(props.apiEndpoint, {
      method: 'POST',
      body: payload,
    })

    toast.success(`${props.label} created successfully`)
    showAddDialog.value = false

    // Call the callback if provided
    if (props.onItemCreated) {
      props.onItemCreated(newItem)
    }

    // Emit refresh to refetch items
    emit('refresh')

    // Auto-select the new item
    if (newItem && newItem[props.itemValue]) {
      emit('update:modelValue', newItem[props.itemValue])
    }
  }
  catch (error: any) {
    toast.error(error?.data?.message || `Failed to create ${props.label}`)
  }
  finally {
    isCreating.value = false
  }
}

watch(open, (newValue) => {
  if (!newValue) {
    search.value = ''
  }
})
</script>

<template>
  <div class="space-y-2">
    <Label>{{ label }}</Label>
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button variant="outline" role="combobox" :aria-expanded="open" class="w-full justify-between">
          <span :class="cn('truncate', !modelValue && 'text-muted-foreground')">
            {{ displayValue }}
          </span>
          <ChevronDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-full p-0" align="start">
        <Command>
          <CommandInput v-model:model-value="search" :placeholder="`Buscar ${label.toLowerCase()}...`" />
          <CommandList>
            <CommandEmpty>
              <div class="flex flex-col items-center gap-2 py-4">
                <span>Nenhum {{ label.toLowerCase() }} encontrado.</span>
                <Button size="sm" @click="openAddDialog">
                  <Plus class="mr-2 h-4 w-4" />
                  Adicionar {{ label }}
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                v-for="item in filteredItems"
                :key="item[itemValue]"
                :value="item[itemLabel]"
                class="cursor-pointer"
                @select="handleSelect(item)"
              >
                <Check :class="cn('mr-2 h-4 w-4', modelValue === item[itemValue] ? 'opacity-100' : 'opacity-0')" />
                {{ item[itemLabel] }}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem value="add-new" class="cursor-pointer" @select="openAddDialog">
                <Plus class="mr-2 h-4 w-4" />
                Adicionar {{ label }}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

    <!-- Add New Item Dialog -->
    <Dialog v-model:open="showAddDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar {{ label }}</DialogTitle>
          <DialogDescription> Crie um novo {{ label.toLowerCase() }} para adicionar à lista. </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div v-for="field in createFields" :key="field.key" class="space-y-2">
            <Label :for="field.key">{{ field.label }}</Label>
            <Input
              :id="field.key"
              v-model="newItemData[field.key]"
              :type="field.type || 'text'"
              :placeholder="field.placeholder"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showAddDialog = false">
            Cancelar
          </Button>
          <Button :disabled="isCreating" @click="createItem">
            <span v-if="isCreating">Criando...</span>
            <span v-else>Criar {{ label }}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
