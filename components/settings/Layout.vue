<script setup lang="ts"></script>

<template>
  <div class="pb-16 space-y-6">
    <div class="space-y-0.5">
      <h2 class="text-2xl font-bold tracking-tight">
        Configurações
      </h2>
      <p class="text-muted-foreground">
        Gerencie as configurações da sua conta e preferências.
      </p>
    </div>
    <Separator class="my-6" />
    <div class="flex flex-col lg:flex-row space-y-6 lg:space-x-12 lg:space-y-0">
      <div class="w-full overflow-x-auto pb-2 lg:w-1/6 lg:pb-0">
        <SettingsSidebarNav />
      </div>
      <div class="flex-1 lg:max-w-2xl">
        <div class="space-y-6">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
