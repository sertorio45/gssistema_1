<script setup lang="ts" generic="T extends Record<string, any>">
import { useColorMode } from '#imports'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js'
import { computed, nextTick, ref, watch } from 'vue'

import { Bar } from 'vue-chartjs'

import { cn } from '@/lib/utils'

// Props definition
const props = withDefaults(
  defineProps<{
    /**
     * Data to display
     */
    data: T[]
    /**
     * Key used to identify each data item
     */
    index: keyof T
    /**
     * Keys of properties to display
     */
    categories: (keyof T)[]
    /**
     * Colors to use for each category
     */
    colors?: string[]
    /**
     * Opacity of filtered items
     * @default 0.2
     */
    filterOpacity?: number
    /**
     * Format x axis tick labels
     */
    xFormatter?: (v: number) => string
    /**
     * Format y axis tick labels
     */
    yFormatter?: (v: number) => string
    /**
     * Show x axis
     * @default true
     */
    showXAxis?: boolean
    /**
     * Show y axis
     * @default true
     */
    showYAxis?: boolean
    /**
     * Show tooltip
     * @default true
     */
    showTooltip?: boolean
    /**
     * Show legend
     */
    showLegend?: boolean
    /**
     * Show grid line
     * @default true
     */
    showGridLine?: boolean
    /**
     * Border radius for bar corners
     * @default 0
     */
    roundedCorners?: number
  }>(),
  {
    filterOpacity: 0.2,
    roundedCorners: 0,
    showXAxis: true,
    showYAxis: true,
    showTooltip: true,
    showLegend: true,
    showGridLine: true,
  },
)

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const colorMode = useColorMode()

// Cores adaptadas para temas light e dark
function getLightColors() {
  return [
    'hsl(var(--primary))',
    'hsl(var(--blue-400))',
    'hsl(var(--cyan-400))',
    'hsl(var(--green-500))',
    'hsl(var(--yellow-500))',
    'hsl(var(--red-400))',
  ]
}

function getDarkColors() {
  return [
    'rgba(255, 255, 255, 0.9)',
    'hsl(var(--blue-200))',
    'hsl(var(--cyan-200))',
    'hsl(var(--green-200))',
    'hsl(var(--yellow-200))',
    'hsl(var(--red-200))',
  ]
}

// Seleciona cores com base no tema atual
const themeColors = computed(() => {
  return colorMode.value === 'dark' ? getDarkColors() : getLightColors()
})

const colors = computed(() => (props.colors?.length ? props.colors : themeColors.value))

// Extract labels from data based on index key
const labels = computed(() => props.data.map(item => String(item[props.index])))

// Process data for chart.js format
const chartData = computed(() => ({
  labels: labels.value,
  datasets: props.categories.map((category, i) => ({
    label: String(category),
    data: props.data.map(item => Number(item[category])),
    backgroundColor: colors.value[i % colors.value.length],
    borderRadius: props.roundedCorners,
    borderSkipped: false,
  })),
}))

// Chart options
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      display: props.showXAxis,
      grid: {
        display: false,
      },
      ticks: {
        color: colorMode.value === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
      },
    },
    y: {
      display: props.showYAxis,
      grid: {
        display: props.showGridLine,
        color: colorMode.value === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'hsl(var(--muted) / 0.2)',
      },
      ticks: {
        callback: props.yFormatter,
        color: colorMode.value === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: {
    legend: {
      display: props.showLegend,
      position: 'top' as const,
      labels: {
        boxWidth: 8,
        usePointStyle: true,
        pointStyle: 'circle',
        color: colorMode.value === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
      },
    },
    tooltip: {
      enabled: props.showTooltip,
    },
  },
}))

// Referência ao componente Bar Chart
const chartInstance = ref<any>(null)

// Atualiza o gráfico quando o tema mudar
watch(
  () => colorMode.value,
  () => {
    // Aguardar componente renderizar
    nextTick(() => {
      const chart = chartInstance.value?.chart
      if (chart) {
        // Atualizar cores dos datasets
        chart.data.datasets.forEach((dataset: any, i: number) => {
          dataset.backgroundColor = colors.value[i % colors.value.length]
        })

        // Atualizar configurações de cores
        if (chart.options.scales.x.ticks) {
          chart.options.scales.x.ticks.color
            = colorMode.value === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
        }

        if (chart.options.scales.y.ticks) {
          chart.options.scales.y.ticks.color
            = colorMode.value === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
        }

        if (chart.options.scales.y.grid) {
          chart.options.scales.y.grid.color
            = colorMode.value === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'hsl(var(--muted) / 0.2)'
        }

        if (chart.options.plugins?.legend?.labels) {
          chart.options.plugins.legend.labels.color
            = colorMode.value === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
        }

        // Atualizar gráfico
        chart.update()
      }
    })
  },
  { immediate: true },
)
</script>

<template>
  <div :class="cn('w-full h-[400px]', $attrs.class ?? '')">
    <Bar ref="chartInstance" :data="chartData" :options="chartOptions" />
  </div>
</template>
