<script setup lang="ts">
import type { PropType } from 'vue'
import { Icon } from '#components'
import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Button from '@/components/ui/button/Button.vue'
import Progress from '@/components/ui/progress/Progress.vue'

// Tipos locais para Stage e Lead
interface Stage {
  id: string | number
  name: string
  color?: string
}

interface Lead {
  id: string | number
  name: string
  company?: string
  priority: 'high' | 'medium' | 'low'
  value: number
  createdAt: string | Date
  assignedTo?: string
  source?: string
  tags: string[]
  sales_stage_id?: string | number
}

defineProps({
  stages: { type: Array as PropType<Stage[]>, required: true },
  leads: { type: Array as PropType<Lead[]>, required: true },
  leadsByStage: { type: Object as PropType<Record<string, Lead[]>>, required: true },
  stageStats: { type: Object as PropType<Record<string, { count: number; value: number }>>, required: true },
  stageProgress: { type: Object as PropType<Record<string, number>>, required: true },
  handleDragOver: { type: Function as PropType<(event: DragEvent) => void>, required: true },
  handleDrop: { type: Function as PropType<(event: DragEvent, stageId: string) => void>, required: true },
  handleDragStart: { type: Function as PropType<(event: DragEvent, leadId: string | number, stageId: string | number) => void>, required: true },
  getPriorityColor: { type: Function as PropType<(priority: string) => string>, required: true },
  formatCurrency: { type: Function as PropType<(value: number) => string>, required: true },
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-2 mb-2">
      <slot name="kanban-header" />
    </div>
    <div class="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 dark:hover:scrollbar-thumb-gray-400">
      <Card
        v-for="stage in stages"
        :key="stage.id"
        class="flex-shrink-0 w-64"
        @dragover="handleDragOver"
        @drop="(event) => handleDrop(event, String(stage.id))"
      >
        <!-- Stage Header -->
        <CardHeader class="pb-1 px-2">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1">
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: stage.color }"
              ></div>
              <CardTitle class="text-sm">{{ stage.name }}</CardTitle>
            </div>
            <div class="flex items-center gap-1">
              <Badge variant="secondary" class="text-xs">
                {{ stageStats[String(stage.id)]?.count || 0 }}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                class="h-5 w-5 p-0"
                @click="$emit('addLead', stage)"
              >
                <Icon name="lucide:plus" class="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <p class="text-xs text-muted-foreground">
              {{ formatCurrency(stageStats[String(stage.id)]?.value || 0) }}
            </p>
            <Progress
              class="h-1"
              :model-value="stageProgress[String(stage.id)] || 0"
            />
          </div>
        </CardHeader>
        <!-- Stage Content -->
        <CardContent class="p-2 min-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 dark:hover:scrollbar-thumb-gray-400">
          <div class="space-y-2">
            <div
              v-for="lead in leadsByStage[String(stage.id)]"
              :key="lead.id"
              class="bg-background border rounded-lg p-3 cursor-grab hover:shadow-md transition-shadow border-l-4"
              :class="getPriorityColor(lead.priority)"
              @click="$emit('leadClick', lead)"
              draggable="true"
              @dragstart="(event) => handleDragStart(event, lead.id, lead.sales_stage_id || '')"
            >
              <!-- Lead Card Content -->
              <div class="space-y-1">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="font-medium text-xs">{{ lead.name }}</h4>
                    <p class="text-xs text-muted-foreground">{{ lead.company || 'No company' }}</p>
                  </div>
                  <Badge
                    variant="outline"
                    class="text-xs py-0 h-4"
                    :class="{
                      'bg-red-50 text-red-700 border-red-200': lead.priority === 'high',
                      'bg-yellow-50 text-yellow-700 border-yellow-200': lead.priority === 'medium',
                      'bg-gray-50 text-gray-700 border-gray-200': lead.priority === 'low',
                    }"
                  >
                    {{ lead.priority }}
                  </Badge>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium">{{ formatCurrency(lead.value) }}</span>
                  <div class="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon name="lucide:calendar" class="h-3 w-3" />
                    {{ new Date(lead.createdAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }) }}
                  </div>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1 text-muted-foreground">
                    <Icon name="lucide:user" class="h-3 w-3" />
                    {{ lead.assignedTo || 'Unassigned' }}
                  </div>
                  <div class="flex items-center gap-1 text-muted-foreground">
                    <Icon name="lucide:tag" class="h-3 w-3" />
                    {{ lead.source }}
                  </div>
                </div>
                <div v-if="lead.tags.length" class="flex flex-wrap gap-1">
                  <Badge
                    v-for="tag in lead.tags.slice(0, 2)"
                    :key="tag"
                    variant="outline"
                    class="text-[10px] px-1 py-0 h-4"
                  >
                    {{ tag }}
                  </Badge>
                  <span v-if="lead.tags.length > 2" class="text-[10px] text-muted-foreground">
                    +{{ lead.tags.length - 2 }}
                  </span>
                </div>
              </div>
            </div>
            <!-- Empty State -->
            <div
              v-if="!leadsByStage[String(stage.id)]?.length"
              class="flex items-center justify-center h-24 border border-dashed border-muted-foreground/25 rounded-lg"
            >
              <Button
                variant="ghost"
                class="flex flex-col items-center gap-1 h-auto p-2"
                @click="$emit('addLead', stage)"
              >
                <Icon name="lucide:plus" class="h-4 w-4 text-muted-foreground" />
                <p class="text-xs text-muted-foreground">Adicionar lead</p>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template> 