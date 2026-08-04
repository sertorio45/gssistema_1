<script setup lang="ts">
const color = useColorMode()

const isDark = computed(() => color.value === 'dark')
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-9 shrink-0"
        title="Alternar tema"
        aria-label="Alternar tema claro ou escuro"
      >
        <Icon
          :name="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
          class="size-5"
          mode="svg"
        />
        <span class="sr-only">Alternar tema</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuGroup>
        <DropdownMenuItem
          class="gap-2"
          :class="{ 'bg-accent text-accent-foreground': color.preference === 'light' }"
          @click="color.preference = 'light'"
        >
          <Icon name="i-lucide-sun" class="size-4" mode="svg" />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          class="gap-2"
          :class="{ 'bg-accent text-accent-foreground': color.preference === 'dark' }"
          @click="color.preference = 'dark'"
        >
          <Icon name="i-lucide-moon" class="size-4" mode="svg" />
          <span>Escuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          class="gap-2"
          :class="{ 'bg-accent text-accent-foreground': color.preference === 'system' }"
          @click="color.preference = 'system'"
        >
          <Icon name="i-lucide-monitor" class="size-4" mode="svg" />
          <span>Sistema</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
