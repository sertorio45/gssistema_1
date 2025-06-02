<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()
const emit = defineEmits(['update:modelValue'])

// Estado local
const local = ref(props.modelValue || '#cccccc')
const showPopover = ref(false)
const hue = ref(266) // valor inicial para roxo
const sat = ref(42)
const light = ref(50)

// Atualiza HSL ao receber nova cor
watch(() => props.modelValue, (val) => {
  if (!val) {
    return
  }
  local.value = val
  const [h, s, l] = hexToHsl(val)
  hue.value = h
  sat.value = s
  light.value = l
})

// Atualiza cor ao mexer nos sliders/inputs
watch([hue, sat, light], ([h, s, l]) => {
  const hex = hslToHex(h, s, l)
  local.value = hex
  emit('update:modelValue', hex)
})

function onInputH(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  hue.value = Math.max(0, Math.min(360, v))
}
function onInputS(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  sat.value = Math.max(0, Math.min(100, v))
}
function onInputL(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  light.value = Math.max(0, Math.min(100, v))
}

// Conversão HEX <-> HSL
function hexToHsl(hex: string): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  hex = hex.replace('#', '')
  if (hex.length === 3) {
    r = Number.parseInt(hex[0] + hex[0], 16)
    g = Number.parseInt(hex[1] + hex[1], 16)
    b = Number.parseInt(hex[2] + hex[2], 16)
  }
  else if (hex.length === 6) {
    r = Number.parseInt(hex.substring(0, 2), 16)
    g = Number.parseInt(hex.substring(2, 4), 16)
    b = Number.parseInt(hex.substring(4, 6), 16)
  }
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}
function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const color = l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1)
    return Math.round(255 * color)
  }
  return `#${[f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

// Gradiente para área de saturação/luminosidade
const satLightBg = computed(() => {
  return `linear-gradient(to right, #fff, hsl(${hue.value},100%,50%)), linear-gradient(to top, #000, transparent)`
})

function onSatLightClick(e: MouseEvent) {
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const s = Math.round((x / rect.width) * 100)
  const l = Math.round(100 - (y / rect.height) * 100)
  sat.value = s
  light.value = l
}

</script>

<template>
  <div class="relative inline-block">
    <button
      class="w-10 h-10 rounded border border-gray-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary transition-all"
      :style="{ background: local }"
      :aria-label="`Selected color: ${local}`"
      :disabled="props.disabled"
      @click.prevent="showPopover = !showPopover"
      type="button"
    >
      <span class="sr-only">Open color picker</span>
    </button>
    <div v-if="showPopover" class="absolute z-50 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg p-4 min-w-[260px] max-w-xs flex flex-col gap-3">
      <!-- Área de saturação/luminosidade -->
      <div
        class="w-full h-28 rounded border border-zinc-700 cursor-crosshair relative mb-2"
        :style="{ background: satLightBg }"
        @click="onSatLightClick"
      >
        <div
          class="absolute w-4 h-4 rounded-full border-2 border-white shadow"
          :style="{
            left: `calc(${sat}% - 8px)`,
            top: `calc(${100 - light}% - 8px)`,
            background: `hsl(${hue},${sat}%,${light}%)`,
            pointerEvents: 'none',
          }"
        />
      </div>
      <!-- Slider de hue -->
      <input
        type="range"
        min="0"
        max="360"
        step="1"
        v-model="hue"
        class="w-full accent-[var(--primary)] mb-2"
        :style="{ background: 'linear-gradient(90deg, red, yellow, lime, cyan, blue, magenta, red)' }"
      />
      <!-- Inputs HSL -->
      <div class="flex gap-2 items-center mb-2">
        <span class="bg-zinc-800 text-xs px-2 py-1 rounded">HSL</span>
        <input type="number" min="0" max="360" :value="hue" @input="onInputH" class="w-12 px-1 py-1 rounded text-xs bg-zinc-800 border border-zinc-700 text-white" />
        <input type="number" min="0" max="100" :value="sat" @input="onInputS" class="w-10 px-1 py-1 rounded text-xs bg-zinc-800 border border-zinc-700 text-white" />
        <input type="number" min="0" max="100" :value="light" @input="onInputL" class="w-10 px-1 py-1 rounded text-xs bg-zinc-800 border border-zinc-700 text-white" />
      </div>
    </div>
  </div>
</template>

<style scoped>
button[disabled] {
  opacity: 0.5;
  pointer-events: none;
}
.absolute {
  position: absolute;
}
</style> 