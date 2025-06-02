// Desativado temporariamente para evitar erros de importação
// Este componente requer a biblioteca @unovis que está causando problemas de compatibilidade

import type { BulletLegendItemInterface } from '@unovis/ts'

export * from './interface'

export { default as ChartTooltip } from './ChartTooltip.vue'
export { default as ChartSingleTooltip } from './ChartSingleTooltip.vue'
export { default as ChartLegend } from './ChartLegend.vue'
export { default as ChartCrosshair } from './ChartCrosshair.vue'

export function defaultColors(length: number): string[] {
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--blue-400))',
    'hsl(var(--cyan-400))',
    'hsl(var(--green-500))',
    'hsl(var(--yellow-500))',
    'hsl(var(--red-400))',
  ]

  return new Array(length).fill(0).map((_, i) => colors[i % colors.length])
}
