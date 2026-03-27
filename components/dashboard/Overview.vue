<script setup lang="ts">
import { BarChart } from '@/components/ui/chart-bar'

const data = [
  { name: 'Jan', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Fev', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Mar', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Abr', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Mai', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Jun', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Jul', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Ago', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Set', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Out', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Nov', valor: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Dez', valor: Math.floor(Math.random() * 5000) + 1000 },
]
</script>

<template>
  <BarChart :data="data" :categories="['valor']" index="name" :rounded-corners="4" />
</template>
