<script setup lang="ts">
import { LineChart } from '@/components/ui/chart-line'

const data = [
  { month: 'Jan', receita: 2200, lucro: 1400 },
  { month: 'Fev', receita: 2800, lucro: 1600 },
  { month: 'Mar', receita: 3100, lucro: 1900 },
  { month: 'Abr', receita: 3600, lucro: 2100 },
  { month: 'Mai', receita: 4200, lucro: 2400 },
  { month: 'Jun', receita: 4800, lucro: 2800 },
  { month: 'Jul', receita: 5100, lucro: 3000 },
  { month: 'Ago', receita: 4900, lucro: 2700 },
  { month: 'Set', receita: 5400, lucro: 3200 },
  { month: 'Out', receita: 5800, lucro: 3500 },
  { month: 'Nov', receita: 6100, lucro: 3700 },
  { month: 'Dez', receita: 6500, lucro: 4000 },
]
</script>

<template>
  <LineChart :data="data" :categories="['receita', 'lucro']" index="month" />
</template>
