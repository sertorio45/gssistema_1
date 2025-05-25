<script setup lang="ts">
import { LineChart } from '@/components/ui/chart-line'

const data = [
  { month: 'Jan', revenue: 2200, profit: 1400 },
  { month: 'Feb', revenue: 2800, profit: 1600 },
  { month: 'Mar', revenue: 3100, profit: 1900 },
  { month: 'Apr', revenue: 3600, profit: 2100 },
  { month: 'May', revenue: 4200, profit: 2400 },
  { month: 'Jun', revenue: 4800, profit: 2800 },
  { month: 'Jul', revenue: 5100, profit: 3000 },
  { month: 'Aug', revenue: 4900, profit: 2700 },
  { month: 'Sep', revenue: 5400, profit: 3200 },
  { month: 'Oct', revenue: 5800, profit: 3500 },
  { month: 'Nov', revenue: 6100, profit: 3700 },
  { month: 'Dec', revenue: 6500, profit: 4000 },
]
</script>

<template>
  <LineChart :data="data" :categories="['revenue', 'profit']" index="month" />
</template>
