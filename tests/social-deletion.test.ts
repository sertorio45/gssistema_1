import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  assertDeletionCapabilities,
  executeSocialPostDeletion,
} from '~/server/utils/social-deletion-domain'
import {
  classifyMetaDeleteError,
  resolveDeletableObjectId,
  resolveMetaObjectType,
} from '~/server/utils/social-publishers/meta-delete'

const deleteMetaRemoteObject = vi.fn()

vi.mock('~/server/utils/social-publishers/meta-delete', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/social-publishers/meta-delete')>()
  return {
    ...actual,
    deleteMetaRemoteObject: (...args: any[]) => deleteMetaRemoteObject(...args),
  }
})

function createClient(seed: {
  post: any
  variants?: any[]
  jobs?: any[]
  deletionJobs?: any[]
  processingJobs?: number
}) {
  const state = {
    post: { ...seed.post },
    variants: [...(seed.variants || [])],
    publicationJobs: [...(seed.jobs || [])],
    deletionJobs: [...(seed.deletionJobs || [])],
    processingJobs: seed.processingJobs || 0,
    audits: [] as any[],
  }

  const client = {
    _state: state,
    from(table: string) {
      const ctx: any = {
        _filters: [] as Array<{ col: string, val: any, op: string }>,
        _in: null as null | { col: string, vals: any[] },
        select(_cols?: string, opts?: any) {
          ctx._count = opts?.count
          ctx._head = opts?.head
          return ctx
        },
        eq(col: string, val: any) {
          ctx._filters.push({ col, val, op: 'eq' })
          return ctx
        },
        in(col: string, vals: any[]) {
          ctx._in = { col, vals }
          return ctx
        },
        not() {
          return ctx
        },
        update(payload: any) {
          ctx._update = payload
          return ctx
        },
        insert(payload: any) {
          ctx._insert = payload
          return ctx
        },
        async maybeSingle() {
          if (table === 'social_posts') {
            const tenantFilter = ctx._filters.find((f: any) => f.col === 'tenant_id')
            if (tenantFilter && state.post.tenant_id !== tenantFilter.val)
              return { data: null, error: null }
            return { data: state.post, error: null }
          }
          if (table === 'deletion_jobs') {
            if (ctx._insert) {
              const row = {
                id: `job-${state.deletionJobs.length + 1}`,
                attempts: 0,
                status: 'pending',
                ...ctx._insert,
              }
              state.deletionJobs.push(row)
              ctx._insert = null
              return { data: row, error: null }
            }
            const key = ctx._filters.find((f: any) => f.col === 'idempotency_key')?.val
            const id = ctx._filters.find((f: any) => f.col === 'id')?.val
            const found = state.deletionJobs.find(j =>
              (key && j.idempotency_key === key) || (id && j.id === id),
            ) || null
            if (ctx._update && found) {
              Object.assign(found, ctx._update)
              return { data: found, error: null }
            }
            return { data: found, error: null }
          }
          return { data: null, error: null }
        },
        async then(resolve: any) {
          if (table === 'social_post_variants') {
            return resolve({ data: state.variants, error: null })
          }
          if (table === 'publication_jobs') {
            if (ctx._count === 'exact' && ctx._head) {
              return resolve({ count: state.processingJobs, error: null })
            }
            if (ctx._update) {
              for (const job of state.publicationJobs) {
                if (!ctx._in || ctx._in.vals.includes(job.status))
                  Object.assign(job, ctx._update)
              }
            }
            return resolve({ data: state.publicationJobs, error: null })
          }
          if (table === 'deletion_jobs') {
            if (ctx._insert) {
              const row = { id: `job-${state.deletionJobs.length + 1}`, attempts: 0, ...ctx._insert }
              state.deletionJobs.push(row)
              return resolve({ data: row, error: null })
            }
            if (ctx._update) {
              const id = ctx._filters.find((f: any) => f.col === 'id')?.val
              const found = state.deletionJobs.find(j => j.id === id)
              if (found)
                Object.assign(found, ctx._update)
              return resolve({ data: found, error: null })
            }
            return resolve({ data: state.deletionJobs, error: null })
          }
          if (table === 'social_posts' && ctx._update) {
            Object.assign(state.post, ctx._update)
            return resolve({ data: state.post, error: null })
          }
          return resolve({ data: null, error: null })
        },
      }
      // Make thenable for await client.from().update().eq().in()
      ctx.then = ctx.then.bind(ctx)
      return ctx
    },
    async rpc(name: string, args: any) {
      if (name === 'lock_social_post_for_deletion') {
        if (state.post.tenant_id !== args.p_tenant_id)
          return { data: null, error: { message: 'social_post_not_found' } }
        if (state.post.deleted_at && state.post.deletion_status === 'completed')
          return { data: null, error: { message: 'social_post_already_deleted' } }
        if (state.post.deletion_locked_by && state.post.deletion_locked_by !== args.p_locked_by)
          return { data: null, error: { message: 'social_post_deletion_locked' } }
        if (state.post.publication_status === 'publishing')
          return { data: null, error: { message: 'social_post_publishing_in_progress' } }
        state.post.deletion_locked_at = new Date().toISOString()
        state.post.deletion_locked_by = args.p_locked_by
        if (['published', 'partially_published', 'failed', 'scheduled'].includes(state.post.publication_status))
          state.post.publication_status = 'deletion_pending'
        state.post.deletion_status = 'requested'
        return { data: state.post, error: null }
      }
      if (name === 'marketing_delete_social_post') {
        state.post.deleted_at = new Date().toISOString()
        state.post.deleted_by = args.p_deleted_by
        state.post.deletion_mode = args.p_mode
        state.post.deletion_status = 'completed'
        state.post.deletion_reason = args.p_reason
        state.post.remote_deletion_status = args.p_remote_status
        state.post.publication_status = 'deleted'
        state.post.status = 'archived'
        return { data: true, error: null }
      }
      return { data: null, error: { message: `unknown rpc ${name}` } }
    },
  }

  return client
}

describe('meta-delete helpers', () => {
  it('never uses container-only IDs when published id exists', () => {
    expect(resolveDeletableObjectId({
      externalPostId: 'pub-1',
      externalContainerId: 'container-1',
      externalMediaId: 'media-1',
    })).toBe('media-1')
  })

  it('refuses container-only legacy rows', () => {
    expect(resolveDeletableObjectId({
      externalContainerId: 'container-1',
      externalPostId: null,
    })).toBeNull()
  })

  it('resolves object types by platform/format', () => {
    expect(resolveMetaObjectType({ platform: 'instagram', format: 'story' })).toBe('instagram_story')
    expect(resolveMetaObjectType({ platform: 'instagram', format: 'video' })).toBe('instagram_reel')
    expect(resolveMetaObjectType({ platform: 'facebook', format: 'static' })).toBe('facebook_feed_post')
  })

  it('classifies Meta absence by code, not generic regex alone', () => {
    expect(classifyMetaDeleteError({ data: { error: { code: 803, message: 'whatever' } } }).status)
      .toBe('already_absent')
    expect(classifyMetaDeleteError({ data: { error: { code: 100, error_subcode: 33, message: 'Object does not exist' } } }).status)
      .toBe('already_absent')
    expect(classifyMetaDeleteError({ data: { error: { code: 190, message: 'token expired' } } }).status)
      .toBe('failed')
    expect(classifyMetaDeleteError({ data: { error: { code: 190, message: 'token expired' } } }).manualActionRequired)
      .toBe(true)
    expect(classifyMetaDeleteError({ data: { error: { code: 4, message: 'rate' } } }).retryable)
      .toBe(true)
  })
})

describe('assertDeletionCapabilities', () => {
  it('blocks remote without delete.remote', () => {
    expect(() => assertDeletionCapabilities({
      tenantId: 't',
      postId: 'p',
      userId: 'u',
      mode: 'system_and_remote',
      capabilities: ['marketing.social.delete.local'],
    })).toThrow()
  })

  it('blocks force without delete.force', () => {
    expect(() => assertDeletionCapabilities({
      tenantId: 't',
      postId: 'p',
      userId: 'u',
      mode: 'system_and_remote',
      forceCompleteLocal: true,
      capabilities: ['marketing.social.delete.local', 'marketing.social.delete.remote'],
    })).toThrow()
  })

  it('allows retry with delete.retry + remote', () => {
    expect(() => assertDeletionCapabilities({
      tenantId: 't',
      postId: 'p',
      userId: 'u',
      mode: 'retry_remote',
      capabilities: ['marketing.social.delete.retry', 'marketing.social.delete.remote'],
    })).not.toThrow()
  })
})

describe('executeSocialPostDeletion', () => {
  beforeEach(() => {
    deleteMetaRemoteObject.mockReset()
  })

  it('cancels draft without calling Meta', async () => {
    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        title: 'Draft',
        status: 'draft',
        publication_status: 'not_scheduled',
        deletion_status: 'none',
      },
      variants: [{ id: 'v1', platform: 'instagram', format: 'static', account_id: 'a1' }],
    })

    const result = await executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'cancel_draft',
      capabilities: ['marketing.social.delete.local'],
    })

    expect(result.localDeleted).toBe(true)
    expect(result.remoteDeletionStatus).toBe('not_applicable')
    expect(deleteMetaRemoteObject).not.toHaveBeenCalled()
    expect(client._state.post.deleted_at).toBeTruthy()
  })

  it('cancels scheduled draft jobs and soft-deletes', async () => {
    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        status: 'scheduled',
        publication_status: 'scheduled',
        deletion_status: 'none',
      },
      jobs: [{ id: 'j1', status: 'pending' }],
      variants: [],
    })

    await executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'cancel_draft',
      capabilities: ['marketing.social.delete.local'],
    })

    expect(client._state.publicationJobs[0].status).toBe('failed')
    expect(client._state.post.publication_status).toBe('deleted')
  })

  it('deletes Facebook successfully then tombstones', async () => {
    deleteMetaRemoteObject.mockResolvedValue({
      platform: 'facebook',
      format: 'static',
      externalObjectId: 'fb-1',
      objectType: 'facebook_feed_post',
      status: 'deleted',
      deleted: true,
      retryable: false,
      manualActionRequired: false,
      providerCode: null,
      message: null,
    })

    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        status: 'published',
        publication_status: 'published',
        deletion_status: 'none',
      },
      variants: [{
        id: 'v1',
        platform: 'facebook',
        format: 'static',
        account_id: 'a1',
        external_post_id: 'fb-1',
        social_accounts: { id: 'a1', platform: 'facebook', provider: 'meta' },
      }],
    })

    const result = await executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'system_and_remote',
      confirmRemoteDeletion: true,
      capabilities: ['marketing.social.delete.local', 'marketing.social.delete.remote'],
    })

    expect(result.localDeleted).toBe(true)
    expect(result.deleted).toHaveLength(1)
    expect(client._state.post.deleted_at).toBeTruthy()
  })

  it('marks Instagram story as manual action required', async () => {
    deleteMetaRemoteObject.mockResolvedValue({
      platform: 'instagram',
      format: 'story',
      externalObjectId: 'ig-story',
      objectType: 'instagram_story',
      status: 'manual_action_required',
      deleted: false,
      retryable: false,
      manualActionRequired: true,
      providerCode: 'unsupported_story_delete',
      message: 'manual',
    })

    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        status: 'published',
        publication_status: 'published',
        deletion_status: 'none',
      },
      variants: [{
        id: 'v1',
        platform: 'instagram',
        format: 'story',
        account_id: 'a1',
        external_post_id: 'ig-story',
        social_accounts: { id: 'a1', platform: 'instagram', provider: 'meta' },
      }],
    })

    const result = await executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'system_and_remote',
      confirmRemoteDeletion: true,
      capabilities: ['marketing.social.delete.local', 'marketing.social.delete.remote'],
    })

    expect(result.localDeleted).toBe(false)
    expect(result.manualActions).toHaveLength(1)
    expect(result.canForceLocal).toBe(true)
  })

  it('treats already_absent as success for remote', async () => {
    deleteMetaRemoteObject.mockResolvedValue({
      platform: 'facebook',
      format: 'static',
      externalObjectId: 'fb-1',
      objectType: 'facebook_feed_post',
      status: 'already_absent',
      deleted: true,
      retryable: false,
      manualActionRequired: false,
      providerCode: '803',
      message: 'gone',
    })

    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        status: 'published',
        publication_status: 'published',
        deletion_status: 'none',
      },
      variants: [{
        id: 'v1',
        platform: 'facebook',
        format: 'static',
        account_id: 'a1',
        external_post_id: 'fb-1',
        social_accounts: { id: 'a1', platform: 'facebook', provider: 'meta' },
      }],
    })

    const result = await executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'system_and_remote',
      confirmRemoteDeletion: true,
      capabilities: ['marketing.social.delete.local', 'marketing.social.delete.remote'],
    })

    expect(result.localDeleted).toBe(true)
    expect(result.alreadyAbsent).toHaveLength(1)
  })

  it('keeps successful variants and retries only failures', async () => {
    deleteMetaRemoteObject.mockResolvedValue({
      platform: 'instagram',
      format: 'static',
      externalObjectId: 'ig-2',
      objectType: 'instagram_media',
      status: 'deleted',
      deleted: true,
      retryable: false,
      manualActionRequired: false,
      providerCode: null,
      message: null,
    })

    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        status: 'published',
        publication_status: 'deletion_pending',
        deletion_status: 'remote_partial',
      },
      variants: [
        {
          id: 'v1',
          platform: 'facebook',
          format: 'static',
          account_id: 'a1',
          external_post_id: 'fb-1',
          social_accounts: { id: 'a1', platform: 'facebook', provider: 'meta' },
        },
        {
          id: 'v2',
          platform: 'instagram',
          format: 'static',
          account_id: 'a2',
          external_post_id: 'ig-2',
          social_accounts: { id: 'a2', platform: 'instagram', provider: 'meta' },
        },
      ],
      deletionJobs: [{
        id: 'dj1',
        variant_id: 'v1',
        idempotency_key: 'delete:p1:v1:fb-1',
        status: 'deleted',
        platform: 'facebook',
        external_object_id: 'fb-1',
      }],
    })

    const result = await executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'retry_remote',
      capabilities: [
        'marketing.social.delete.local',
        'marketing.social.delete.remote',
        'marketing.social.delete.retry',
      ],
    })

    expect(deleteMetaRemoteObject).toHaveBeenCalledTimes(1)
    expect(result.deleted.length + result.alreadyAbsent.length).toBeGreaterThanOrEqual(1)
  })

  it('system_only requires reason and confirmation and skips Meta', async () => {
    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        status: 'published',
        publication_status: 'published',
        deletion_status: 'none',
      },
      variants: [{
        id: 'v1',
        platform: 'facebook',
        external_post_id: 'fb-1',
        social_accounts: { provider: 'meta', platform: 'facebook' },
      }],
    })

    await expect(executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'system_only',
      confirmLocalOnly: true,
      capabilities: ['marketing.social.delete.local'],
    })).rejects.toMatchObject({ statusMessage: expect.stringContaining('motivo') })

    const result = await executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'system_only',
      confirmLocalOnly: true,
      reason: 'Cliente pediu manter no feed',
      capabilities: ['marketing.social.delete.local'],
    })

    expect(result.remoteDeletionStatus).toBe('skipped')
    expect(deleteMetaRemoteObject).not.toHaveBeenCalled()
  })

  it('rejects cross-tenant posts', async () => {
    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 'other',
        status: 'draft',
        publication_status: 'not_scheduled',
        deletion_status: 'none',
      },
    })

    await expect(executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'cancel_draft',
      capabilities: ['marketing.social.delete.local'],
    })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects concurrent deletion lock', async () => {
    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        status: 'published',
        publication_status: 'published',
        deletion_status: 'requested',
        deletion_locked_by: 'other-user',
        deletion_locked_at: new Date().toISOString(),
      },
      variants: [],
    })

    await expect(executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'system_only',
      confirmLocalOnly: true,
      reason: 'x',
      capabilities: ['marketing.social.delete.local'],
      lockOwner: 'user:u1',
    })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects while publication job is processing', async () => {
    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        status: 'publishing',
        publication_status: 'publishing',
        deletion_status: 'none',
      },
    })

    await expect(executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'system_and_remote',
      confirmRemoteDeletion: true,
      capabilities: ['marketing.social.delete.local', 'marketing.social.delete.remote'],
    })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('forces local completion with delete.force after remote failure', async () => {
    deleteMetaRemoteObject.mockResolvedValue({
      platform: 'facebook',
      format: 'static',
      externalObjectId: 'fb-1',
      objectType: 'facebook_feed_post',
      status: 'failed',
      deleted: false,
      retryable: true,
      manualActionRequired: false,
      providerCode: '4',
      message: 'rate limit',
    })

    const client = createClient({
      post: {
        id: 'p1',
        tenant_id: 't1',
        status: 'published',
        publication_status: 'published',
        deletion_status: 'none',
      },
      variants: [{
        id: 'v1',
        platform: 'facebook',
        format: 'static',
        account_id: 'a1',
        external_post_id: 'fb-1',
        social_accounts: { id: 'a1', platform: 'facebook', provider: 'meta' },
      }],
    })

    const result = await executeSocialPostDeletion(client, {
      tenantId: 't1',
      postId: 'p1',
      userId: 'u1',
      mode: 'system_and_remote',
      confirmRemoteDeletion: true,
      forceCompleteLocal: true,
      capabilities: [
        'marketing.social.delete.local',
        'marketing.social.delete.remote',
        'marketing.social.delete.force',
      ],
    })

    expect(result.localDeleted).toBe(true)
    expect(result.failed).toHaveLength(1)
    expect(client._state.post.remote_deletion_status).toBe('failed')
  })
})
