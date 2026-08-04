<script setup lang="ts">
import { themes } from '@/lib/registry/themes'
import { toast } from '~/components/ui/toast'

type Color =
  | 'zinc'
  | 'slate'
  | 'stone'
  | 'gray'
  | 'neutral'
  | 'red'
  | 'rose'
  | 'orange'
  | 'green'
  | 'blue'
  | 'yellow'
  | 'violet'

const allColors: Color[] = [
  'zinc',
  'rose',
  'blue',
  'green',
  'orange',
  'red',
  'slate',
  'stone',
  'gray',
  'neutral',
  'yellow',
  'violet',
]

const colorLabels: Record<Color, string> = {
  zinc: 'Zinco',
  rose: 'Rosa',
  blue: 'Azul',
  green: 'Verde',
  orange: 'Laranja',
  red: 'Vermelho',
  slate: 'Ardósia',
  stone: 'Pedra',
  gray: 'Cinza',
  neutral: 'Neutro',
  yellow: 'Amarelo',
  violet: 'Violeta',
}

const RADII = [0, 0.25, 0.5, 0.75, 1]

const colorMode = useColorMode()
const { theme, radius, setTheme, setRadius } = useCustomize()

function backgroundColor(color: Color) {
  const bg = themes.find(item => item.name === color)
  return `hsl(${bg?.activeColor.light})`
}

function selectMode(mode: 'light' | 'dark') {
  colorMode.preference = mode
  toast({
    title: 'Tema atualizado',
    description: mode === 'dark' ? 'Tema escuro ativado.' : 'Tema claro ativado.',
  })
}

function selectColor(color: Color) {
  setTheme(color)
  toast({
    title: 'Cor atualizada',
    description: `Paleta ${colorLabels[color]} aplicada.`,
  })
}

function selectRadius(value: number) {
  setRadius(value)
}
</script>

<template>
  <div>
    <h3 class="text-lg font-medium">
      Aparência
    </h3>
    <p class="text-sm text-muted-foreground">
      Personalize cores, cantos e o tema claro ou escuro do sistema.
    </p>
  </div>
  <Separator />

  <div class="space-y-8">
    <!-- Color palette (same as ThemeCustomize) -->
    <div class="space-y-3">
      <div>
        <Label class="text-base">
          Cor
        </Label>
        <p class="text-sm text-muted-foreground">
          Escolha a cor principal da interface.
        </p>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button
          v-for="color in allColors"
          :key="color"
          type="button"
          class="justify-start gap-2"
          variant="outline"
          :class="{ 'border-primary border-2': theme === color }"
          @click="selectColor(color)"
        >
          <span
            class="h-5 w-5 flex items-center justify-center rounded-full"
            :style="{ backgroundColor: backgroundColor(color) }"
          >
            <Icon
              v-if="theme === color"
              name="i-radix-icons-check"
              size="16"
              class="text-white"
            />
          </span>
          <span class="text-xs">
            {{ colorLabels[color] }}
          </span>
        </Button>
      </div>
    </div>

    <!-- Radius -->
    <div class="space-y-3">
      <div>
        <Label class="text-base">
          Arredondamento
        </Label>
        <p class="text-sm text-muted-foreground">
          Ajuste o raio dos cantos dos componentes.
        </p>
      </div>
      <div class="grid grid-cols-5 gap-2">
        <Button
          v-for="r in RADII"
          :key="r"
          type="button"
          class="justify-center gap-2"
          variant="outline"
          :class="{ 'border-primary border-2': radius === r }"
          @click="selectRadius(r)"
        >
          <span class="text-xs">
            {{ r }}
          </span>
        </Button>
      </div>
    </div>

    <!-- Light / Dark preview cards -->
    <div class="space-y-3">
      <div>
        <Label class="text-base">
          Tema
        </Label>
        <p class="text-sm text-muted-foreground">
          Selecione o tema do painel. Você também pode alterar pelo ícone no topo da página.
        </p>
      </div>

      <div class="grid max-w-md grid-cols-2 gap-8 pt-2">
        <button
          type="button"
          class="space-y-2 text-left outline-none"
          @click="selectMode('light')"
        >
          <div
            class="items-center rounded-md border-2 p-1 hover:border-accent"
            :class="colorMode.value === 'light' ? 'border-primary' : 'border-muted'"
          >
            <div class="rounded-sm bg-[#ecedef] p-2 space-y-2">
              <div class="rounded-md bg-white p-2 shadow-sm space-y-2">
                <div class="h-2 w-20 rounded-lg bg-[#ecedef]" />
                <div class="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
              </div>
              <div class="flex items-center rounded-md bg-white p-2 shadow-sm space-x-2">
                <div class="h-4 w-4 rounded-full bg-[#ecedef]" />
                <div class="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
              </div>
              <div class="flex items-center rounded-md bg-white p-2 shadow-sm space-x-2">
                <div class="h-4 w-4 rounded-full bg-[#ecedef]" />
                <div class="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
              </div>
            </div>
          </div>
          <span class="block w-full p-2 text-center text-sm font-normal">
            Claro
          </span>
        </button>

        <button
          type="button"
          class="space-y-2 text-left outline-none"
          @click="selectMode('dark')"
        >
          <div
            class="items-center rounded-md border-2 bg-popover p-1 hover:border-accent"
            :class="colorMode.value === 'dark' ? 'border-primary' : 'border-muted'"
          >
            <div class="rounded-sm bg-slate-950 p-2 space-y-2">
              <div class="rounded-md bg-slate-800 p-2 shadow-sm space-y-2">
                <div class="h-2 w-20 rounded-lg bg-slate-400" />
                <div class="h-2 w-[100px] rounded-lg bg-slate-400" />
              </div>
              <div class="flex items-center rounded-md bg-slate-800 p-2 shadow-sm space-x-2">
                <div class="h-4 w-4 rounded-full bg-slate-400" />
                <div class="h-2 w-[100px] rounded-lg bg-slate-400" />
              </div>
              <div class="flex items-center rounded-md bg-slate-800 p-2 shadow-sm space-x-2">
                <div class="h-4 w-4 rounded-full bg-slate-400" />
                <div class="h-2 w-[100px] rounded-lg bg-slate-400" />
              </div>
            </div>
          </div>
          <span class="block w-full p-2 text-center text-sm font-normal">
            Escuro
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
