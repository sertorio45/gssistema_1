<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string[]
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue'])

const tags = ref(props.modelValue || [])
const inputValue = ref('')

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    tags.value = newValue
  }
})

watch(tags, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })

function addTag(event: KeyboardEvent) {
  if (event.key === 'Enter' && inputValue.value.trim()) {
    event.preventDefault()
    
    const newTag = inputValue.value.trim()
    if (!tags.value.includes(newTag)) {
      tags.value.push(newTag)
    }
    
    inputValue.value = ''
  }
}

function removeTag(index: number) {
  tags.value.splice(index, 1)
}
</script>

<template>
  <div>
    <div class="flex items-center flex-wrap gap-2 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
      <div 
        v-for="(tag, index) in tags" 
        :key="index" 
        class="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium"
      >
        {{ tag }}
        <button 
          type="button"
          class="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
          @click="removeTag(index)"
        >
          <Icon name="lucide:x" class="h-2.5 w-2.5" />
          <span class="sr-only">Remover</span>
        </button>
      </div>
      <input
        v-model="inputValue"
        class="flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
        :placeholder="placeholder || 'Adicionar tag...'"
        @keydown="addTag"
      />
    </div>
  </div>
</template> 