import { describe, expect, it, vi } from 'vitest'

import {
  SOCIAL_AUTOMATION_CATALOG,
  SOCIAL_AUTOMATION_TRIGGERS,
  triggerForCompletedTask,
} from '~/server/utils/social-automations'

describe('social automations catalog', () => {
  it('covers all planned etapa 5 triggers', () => {
    expect(SOCIAL_AUTOMATION_TRIGGERS).toContain('briefing.submitted')
    expect(SOCIAL_AUTOMATION_TRIGGERS).toContain('task.copy.completed')
    expect(SOCIAL_AUTOMATION_TRIGGERS).toContain('task.design.completed')
    expect(SOCIAL_AUTOMATION_TRIGGERS).toContain('task.review.completed')
    expect(SOCIAL_AUTOMATION_TRIGGERS).toContain('approval.overdue')
    expect(SOCIAL_AUTOMATION_TRIGGERS).toContain('approval.changes_requested')
    expect(SOCIAL_AUTOMATION_TRIGGERS).toContain('editorial.approved')
    expect(SOCIAL_AUTOMATION_TRIGGERS).toContain('publication.failed')
    expect(SOCIAL_AUTOMATION_TRIGGERS).toContain('content.stalled')
    expect(SOCIAL_AUTOMATION_CATALOG).toHaveLength(SOCIAL_AUTOMATION_TRIGGERS.length)
  })

  it('maps completed tasks to triggers', () => {
    expect(triggerForCompletedTask('write_copy')).toBe('task.copy.completed')
    expect(triggerForCompletedTask('create_design')).toBe('task.design.completed')
    expect(triggerForCompletedTask('review')).toBe('task.review.completed')
    expect(triggerForCompletedTask('fix')).toBeNull()
  })
})

describe('emitSocialAutomation opt-out', () => {
  it('skips when rule is disabled', async () => {
    const inserts: any[] = []
    const client = {
      from(table: string) {
        if (table === 'social_automation_rules') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { enabled: false } }),
                }),
              }),
            }),
          }
        }
        if (table === 'social_automation_runs') {
          return {
            insert: async (row: any) => {
              inserts.push(row)
              return { error: null }
            },
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
    }

    const { emitSocialAutomation } = await import('~/server/utils/social-automations')
    const result = await emitSocialAutomation(client, {
      tenantId: 't1',
      trigger: 'publication.failed',
      postId: 'p1',
    })

    expect(result.status).toBe('skipped')
    expect(inserts[0]?.status).toBe('skipped')
  })

  it('never throws when handler fails', async () => {
    const client = {
      from(table: string) {
        if (table === 'social_automation_rules') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'social_posts') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => {
                    throw new Error('boom')
                  },
                }),
              }),
            }),
          }
        }
        if (table === 'social_automation_runs') {
          return {
            insert: async () => ({ error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
        }
      },
    }

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { emitSocialAutomation } = await import('~/server/utils/social-automations')
    const result = await emitSocialAutomation(client, {
      tenantId: 't1',
      trigger: 'publication.failed',
      postId: 'p1',
    })
    expect(result.status).toBe('failed')
    spy.mockRestore()
  })
})
