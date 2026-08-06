<script setup lang="ts">
import type { SocialProductionPriority } from '~/types/marketing-social'
import {
  SOCIAL_PRODUCTION_PRIORITIES,
  SOCIAL_PRODUCTION_PRIORITY_LABELS,
} from '~/types/marketing-social'
import SocialDateTimePicker from '~/components/marketing/social/SocialDateTimePicker.vue'

type MemberOption = {
  userId: string
  name: string
}

const props = defineProps<{
  copyOwnerId: string
  designOwnerId: string
  publishOwnerId: string
  productionPriority: SocialProductionPriority
  productionDueAt: string
  members: MemberOption[]
}>()

const emit = defineEmits<{
  'update:copyOwnerId': [value: string]
  'update:designOwnerId': [value: string]
  'update:publishOwnerId': [value: string]
  'update:productionPriority': [value: SocialProductionPriority]
  'update:productionDueAt': [value: string]
}>()
</script>

<template>
  <div class="space-y-4 rounded-xl border p-4">
    <div>
      <p class="text-sm font-medium">
        Produção da equipe
      </p>
      <p class="text-xs text-muted-foreground">
        Responsáveis de copy, design e publicação, com prioridade e prazo.
      </p>
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      <div class="space-y-1.5">
        <Label>Copy</Label>
        <Select
          :model-value="copyOwnerId"
          @update:model-value="emit('update:copyOwnerId', String($event))"
        >
          <SelectTrigger>
            <SelectValue placeholder="Responsável copy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              Sem responsável
            </SelectItem>
            <SelectItem
              v-for="member in members"
              :key="`copy-${member.userId}`"
              :value="member.userId"
            >
              {{ member.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-1.5">
        <Label>Design</Label>
        <Select
          :model-value="designOwnerId"
          @update:model-value="emit('update:designOwnerId', String($event))"
        >
          <SelectTrigger>
            <SelectValue placeholder="Responsável design" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              Sem responsável
            </SelectItem>
            <SelectItem
              v-for="member in members"
              :key="`design-${member.userId}`"
              :value="member.userId"
            >
              {{ member.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-1.5">
        <Label>Publicação</Label>
        <Select
          :model-value="publishOwnerId"
          @update:model-value="emit('update:publishOwnerId', String($event))"
        >
          <SelectTrigger>
            <SelectValue placeholder="Responsável publicação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              Sem responsável
            </SelectItem>
            <SelectItem
              v-for="member in members"
              :key="`publish-${member.userId}`"
              :value="member.userId"
            >
              {{ member.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="space-y-1.5">
        <Label>Prioridade</Label>
        <Select
          :model-value="productionPriority"
          @update:model-value="emit('update:productionPriority', $event as SocialProductionPriority)"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="priority in SOCIAL_PRODUCTION_PRIORITIES"
              :key="priority"
              :value="priority"
            >
              {{ SOCIAL_PRODUCTION_PRIORITY_LABELS[priority] }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <SocialDateTimePicker
        :model-value="productionDueAt"
        label="Prazo de produção"
        description="Data limite da equipe (independente da publicação)."
        placeholder="Sem prazo"
        @update:model-value="emit('update:productionDueAt', $event)"
      />
    </div>
  </div>
</template>
