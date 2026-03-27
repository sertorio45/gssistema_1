<script setup lang="ts">
import { Area, CurveType } from '@unovis/ts'
import { VisArea, VisLine, VisXYContainer } from '@unovis/vue'

const props = withDefaults(
  defineProps<{
    values: number[]
    /** Linha principal usa a cor primary do tema; muted usa o foreground com menos ênfase */
    tone?: 'primary' | 'muted'
  }>(),
  { tone: 'primary' },
)

const uid = useId().replace(/:/g, '')

const color = computed(() =>
  props.tone === 'muted'
    ? 'hsl(var(--muted-foreground) / 0.9)'
    : 'hsl(var(--primary))',
)

const chartData = computed(() => {
  const raw = props.values.length ? [...props.values] : [0]
  const v = raw.length === 1 ? [raw[0], raw[0], raw[0]] : raw
  return v.map((val, i) => ({ i, val }))
})
</script>

<template>
  <div class="h-12 w-full min-w-[72px]">
    <VisXYContainer
      :data="chartData"
      :margin="{ top: 2, bottom: 0, left: 0, right: 0 }"
      :style="{ height: '48px' }"
      class="w-full"
    >
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <linearGradient :id="`spark-fill-${uid}`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" :stop-color="color" stop-opacity="0.22" />
            <stop offset="95%" :stop-color="color" stop-opacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <VisArea
        :x="(d: { i: number }) => d.i"
        :y="(d: { val: number }) => d.val"
        color="auto"
        :curve-type="CurveType.MonotoneX"
        :attributes="{
          [Area.selectors.area]: {
            fill: `url(#spark-fill-${uid})`,
          },
        }"
      />
      <VisLine
        :x="(d: { i: number }) => d.i"
        :y="(d: { val: number }) => d.val"
        :color="color"
        :curve-type="CurveType.MonotoneX"
      />
    </VisXYContainer>
  </div>
</template>
