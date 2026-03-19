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
watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      return
    }
    local.value = val
    const [h, s, l] = hexToHsl(val)
    hue.value = h
    sat.value = s
    light.value = l
  },
)

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
  s /= 100
  l /= 100
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
      class="h-10 w-10 flex items-center justify-center border border-gray-300 rounded transition-all focus:outline-none focus:ring-2 focus:ring-primary"
      :style="{ background: local }"
      :aria-label="`Selected color: ${local}`"
      :disabled="props.disabled"
      type="button"
      @click.prevent="showPopover = !showPopover"
    >
      <span class="sr-only">Open color picker</span>
    </button>
    <div
      v-if="showPopover"
      class="absolute z-50 mt-2 max-w-xs min-w-[260px] flex flex-col gap-3 border border-zinc-800 rounded-lg bg-zinc-900 p-4 shadow-lg"
    >
      <!-- Área de saturação/luminosidade -->
      <div
        class="relative mb-2 h-28 w-full cursor-crosshair border border-zinc-700 rounded"
        :style="{ background: satLightBg }"
        @click="onSatLightClick"
      >
        <div
          class="absolute h-4 w-4 border-2 border-white rounded-full shadow"
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
        v-model="hue"
        type="range"
        min="0"
        max="360"
        step="1"
        class="mb-2 w-full accent-[var(--primary)]"
        :style="{ background: 'linear-gradient(90deg, red, yellow, lime, cyan, blue, magenta, red)' }"
      >
      <!-- Inputs HSL -->
      <div class="mb-2 flex items-center gap-2">
        <span class="rounded bg-zinc-800 px-2 py-1 text-xs">HSL</span>
        <input
          type="number"
          min="0"
          max="360"
          :value="hue"
          class="w-12 border border-zinc-700 rounded bg-zinc-800 px-1 py-1 text-xs text-white"
          @input="onInputH"
        >
        <input
          type="number"
          min="0"
          max="100"
          :value="sat"
          class="w-10 border border-zinc-700 rounded bg-zinc-800 px-1 py-1 text-xs text-white"
          @input="onInputS"
        >
        <input
          type="number"
          min="0"
          max="100"
          :value="light"
          class="w-10 border border-zinc-700 rounded bg-zinc-800 px-1 py-1 text-xs text-white"
          @input="onInputL"
        >
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
