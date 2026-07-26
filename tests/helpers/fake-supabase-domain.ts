/**
 * Richer in-memory PostgREST/Supabase stand-in for the marketing social
 * approval domain tests. Unlike the read-only `fake-supabase` helper used by the
 * workspace resolver, this one supports insert/update/delete/upsert, a handful of
 * embedded relations, unique-constraint violations (approval decisions +
 * notification idempotency) and the `lock_approval_request` RPC.
 *
 * It deliberately ignores RLS: these tests assert the Nitro-side domain rules.
 */

import { randomUUID } from 'node:crypto'

export type FakeRow = Record<string, any>
export type FakeDatabase = Record<string, FakeRow[]>

interface EmbedRelation {
  table: string
  localKey: string
  foreignKey: string
}

// Embedded relations the domain actually reads (parent table -> embed name).
const EMBEDS: Record<string, Record<string, EmbedRelation>> = {
  social_post_assets: {
    media_assets: { table: 'media_assets', localKey: 'asset_id', foreignKey: 'id' },
  },
}

const EMBED_PATTERN = /(\w+)!\w+\(([^()]*)\)/g

interface Filter {
  kind: 'eq' | 'in' | 'notNull' | 'isNull'
  column: string
  value?: any
}

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

function matches(row: FakeRow, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const cell = row[filter.column]
    switch (filter.kind) {
      case 'eq':
        return cell === filter.value
      case 'in':
        return (filter.value as any[]).includes(cell)
      case 'notNull':
        return cell !== null && cell !== undefined
      case 'isNull':
        return cell === null || cell === undefined
    }
  })
}

function uniqueViolation() {
  return { code: '23505', message: 'duplicate key value violates unique constraint' }
}

function checkInsertConstraints(db: FakeDatabase, table: string, row: FakeRow): { code: string, message: string } | null {
  const existing = db[table] || []
  if (table === 'approval_decisions') {
    if (existing.some(candidate =>
      candidate.request_id === row.request_id && candidate.approver_id === row.approver_id)) {
      return uniqueViolation()
    }
  }
  if (table === 'notifications' && row.idempotency_key) {
    if (existing.some(candidate =>
      candidate.tenant_id === row.tenant_id && candidate.idempotency_key === row.idempotency_key)) {
      return uniqueViolation()
    }
  }
  return null
}

class FakeBuilder implements PromiseLike<{ data: any, error: any }> {
  private filters: Filter[] = []
  private embeds: Array<{ name: string }> = []
  private orderColumn: string | null = null
  private orderAscending = true
  private limitCount: number | null = null
  private payload: any = null
  private wantSelect = false

  constructor(
    private readonly db: FakeDatabase,
    private readonly table: string,
    private readonly op: Op,
    payload?: any,
  ) {
    if (payload !== undefined)
      this.payload = payload
  }

  select(columns = '*') {
    this.wantSelect = true
    this.embeds = []
    for (const match of String(columns).matchAll(EMBED_PATTERN))
      this.embeds.push({ name: match[1]! })
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ kind: 'eq', column, value })
    return this
  }

  in(column: string, value: any[]) {
    this.filters.push({ kind: 'in', column, value })
    return this
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && value === null)
      this.filters.push({ kind: 'notNull', column })
    return this
  }

  is(column: string, value: any) {
    if (value === null)
      this.filters.push({ kind: 'isNull', column })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column
    this.orderAscending = options?.ascending !== false
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  private ensureTable(): FakeRow[] {
    if (!this.db[this.table])
      this.db[this.table] = []
    return this.db[this.table]!
  }

  private applyEmbeds(rows: FakeRow[]): FakeRow[] {
    if (!this.embeds.length)
      return rows
    return rows.map((row) => {
      const enriched = { ...row }
      for (const embed of this.embeds) {
        const relation = EMBEDS[this.table]?.[embed.name]
        if (!relation)
          continue
        const related = (this.db[relation.table] || [])
          .find(candidate => candidate[relation.foreignKey] === row[relation.localKey])
        enriched[embed.name] = related ? { ...related } : null
      }
      return enriched
    })
  }

  private runSelect(): FakeRow[] {
    let rows = this.ensureTable().filter(row => matches(row, this.filters)).map(row => ({ ...row }))
    if (this.orderColumn) {
      const column = this.orderColumn
      rows.sort((a, b) => {
        const av = a[column]
        const bv = b[column]
        if (av === bv)
          return 0
        const result = av > bv ? 1 : -1
        return this.orderAscending ? result : -result
      })
    }
    if (this.limitCount !== null)
      rows = rows.slice(0, this.limitCount)
    return this.applyEmbeds(rows)
  }

  private runInsert(): { data: any, error: any } {
    const table = this.ensureTable()
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload]
    const inserted: FakeRow[] = []
    for (const raw of rows) {
      const row = { id: raw.id ?? randomUUID(), created_at: new Date().toISOString(), ...raw }
      const violation = checkInsertConstraints(this.db, this.table, row)
      if (violation)
        return { data: null, error: violation }
      table.push(row)
      inserted.push({ ...row })
    }
    return { data: inserted, error: null }
  }

  private runUpsert(): { data: any, error: any } {
    const table = this.ensureTable()
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload]
    const result: FakeRow[] = []
    for (const raw of rows) {
      const existingIndex = raw.idempotency_key
        ? table.findIndex(candidate => candidate.idempotency_key === raw.idempotency_key)
        : -1
      if (existingIndex >= 0) {
        table[existingIndex] = { ...table[existingIndex], ...raw }
        result.push({ ...table[existingIndex] })
      }
      else {
        const row = { id: raw.id ?? randomUUID(), created_at: new Date().toISOString(), ...raw }
        table.push(row)
        result.push({ ...row })
      }
    }
    return { data: result, error: null }
  }

  private runUpdate(): { data: any, error: any } {
    const table = this.ensureTable()
    const updated: FakeRow[] = []
    for (const row of table) {
      if (matches(row, this.filters)) {
        Object.assign(row, this.payload)
        updated.push({ ...row })
      }
    }
    return { data: updated, error: null }
  }

  private runDelete(): { data: any, error: any } {
    const table = this.ensureTable()
    const remaining: FakeRow[] = []
    const removed: FakeRow[] = []
    for (const row of table) {
      if (matches(row, this.filters))
        removed.push(row)
      else
        remaining.push(row)
    }
    this.db[this.table] = remaining
    return { data: removed, error: null }
  }

  private resolve(): { data: any, error: any } {
    switch (this.op) {
      case 'select':
        return { data: this.runSelect(), error: null }
      case 'insert':
        return this.runInsert()
      case 'upsert':
        return this.runUpsert()
      case 'update':
        return this.runUpdate()
      case 'delete':
        return this.runDelete()
    }
  }

  async maybeSingle() {
    const { data, error } = this.resolve()
    if (error)
      return { data: null, error }
    const rows = Array.isArray(data) ? data : [data]
    return { data: rows[0] ?? null, error: null }
  }

  async single() {
    const result = await this.maybeSingle()
    if (!result.error && result.data === null)
      return { data: null, error: { code: 'PGRST116', message: 'no rows' } }
    return result
  }

  then<TResult1 = { data: any, error: any }, TResult2 = never>(
    onFulfilled?: ((value: { data: any, error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolve()).then(onFulfilled, onRejected)
  }
}

class FakeTable {
  constructor(private readonly db: FakeDatabase, private readonly table: string) {}

  select(columns = '*') {
    return new FakeBuilder(this.db, this.table, 'select').select(columns)
  }

  insert(payload: any) {
    return new FakeBuilder(this.db, this.table, 'insert', payload)
  }

  upsert(payload: any, _options?: { onConflict?: string }) {
    return new FakeBuilder(this.db, this.table, 'upsert', payload)
  }

  update(payload: any) {
    return new FakeBuilder(this.db, this.table, 'update', payload)
  }

  delete() {
    return new FakeBuilder(this.db, this.table, 'delete')
  }
}

export function createFakeDomainClient(db: FakeDatabase) {
  return {
    from(table: string) {
      return new FakeTable(db, table)
    },
    async rpc(name: string, args: Record<string, any>) {
      if (name === 'lock_approval_request') {
        const rows = db.approval_requests || []
        const row = rows.find(candidate => candidate.id === args.p_request_id)
        if (!row)
          return { data: null, error: { message: 'approval_request_not_found' } }
        if (row.run_status !== 'pending' || row.status !== 'pending')
          return { data: null, error: { message: 'approval_request_not_pending' } }
        row.locked_at = new Date().toISOString()
        row.locked_by = args.p_actor_id
        return { data: { ...row }, error: null }
      }
      return { data: null, error: { message: `unknown_rpc:${name}` } }
    },
  }
}
