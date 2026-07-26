import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * The workspace resolver is plain Nitro code, so it runs under Node without a
 * Nuxt instance. Only the Supabase server helpers need to be aliased, and the
 * tests drive them through an in-memory database fixture.
 */
export default defineConfig({
  resolve: {
    alias: {
      '#supabase/server': fileURLToPath(new URL('./tests/mocks/supabase-server.ts', import.meta.url)),
      '~': root,
      '@': root,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
