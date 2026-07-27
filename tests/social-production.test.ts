import { describe, expect, it } from 'vitest'

import {
  assertProductionMove,
  defaultTasksForStatus,
  isProductionOverdue,
} from '~/server/utils/social-production'

describe('social production domain', () => {
  it('requires blocked reason', () => {
    expect(() => assertProductionMove({
      fromStatus: 'backlog',
      toStatus: 'blocked',
      blockedReason: 'ab',
    })).toThrow()

    expect(() => assertProductionMove({
      fromStatus: 'backlog',
      toStatus: 'blocked',
      blockedReason: 'Aguardando material',
    })).not.toThrow()
  })

  it('detects overdue excluding terminal-ish columns', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(isProductionOverdue(past, 'copy_in_progress')).toBe(true)
    expect(isProductionOverdue(past, 'published')).toBe(false)
    expect(isProductionOverdue(null, 'backlog')).toBe(false)
  })

  it('suggests role tasks for operational columns', () => {
    expect(defaultTasksForStatus('design_in_progress')[0]?.roleScope).toBe('designer')
    expect(defaultTasksForStatus('copy_in_progress')[0]?.taskType).toBe('write_copy')
    expect(defaultTasksForStatus('backlog')).toEqual([])
  })
})
