/**
 * Minimal in-memory stand-in for the PostgREST client, covering only the query
 * shapes used by the workspace resolver: `select`, `eq`, `in`, `order`,
 * `maybeSingle`, awaiting the builder, and the single embedded relation the
 * resolver reads (`organization_tenants -> organizations!inner`).
 *
 * It deliberately ignores RLS: these tests assert the Nitro-side rules, and the
 * database-side rules are covered by `supabase/tests/workspace_rls.sql`.
 */

export type FakeRow = Record<string, any>
export type FakeDatabase = Record<string, FakeRow[]>

interface Relation {
  table: string
  localKey: string
  foreignKey: string
}

const RELATIONS: Record<string, Record<string, Relation>> = {
  organization_tenants: {
    organizations: { table: 'organizations', localKey: 'organization_id', foreignKey: 'id' },
  },
}

const EMBED_PATTERN = /(\w+)(!inner)?\(([^)]*)\)/g

interface Filter {
  kind: 'eq' | 'in'
  column: string
  value: any
}

interface Embed {
  name: string
  inner: boolean
}

class FakeQuery implements PromiseLike<{ data: any, error: null }> {
  private filters: Filter[] = []
  private embeds: Embed[] = []
  private orderBy: string | null = null

  constructor(private readonly db: FakeDatabase, private readonly table: string) {}

  select(columns = '*') {
    this.embeds = []
    for (const match of String(columns).matchAll(EMBED_PATTERN))
      this.embeds.push({ name: match[1]!, inner: Boolean(match[2]) })
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

  order(column: string) {
    this.orderBy = column
    return this
  }

  private run(): FakeRow[] {
    let rows = (this.db[this.table] ?? []).map(row => ({ ...row }))

    for (const filter of this.filters) {
      rows = filter.kind === 'eq'
        ? rows.filter(row => row[filter.column] === filter.value)
        : rows.filter(row => (filter.value as any[]).includes(row[filter.column]))
    }

    for (const embed of this.embeds) {
      const relation = RELATIONS[this.table]?.[embed.name]
      if (!relation)
        continue

      rows = rows
        .map((row) => {
          const related = (this.db[relation.table] ?? [])
            .find(candidate => candidate[relation.foreignKey] === row[relation.localKey])
          return { ...row, [embed.name]: related ? { ...related } : null }
        })
        .filter(row => !embed.inner || row[embed.name] !== null)
    }

    if (this.orderBy) {
      const column = this.orderBy
      rows.sort((a, b) => String(a[column] ?? '').localeCompare(String(b[column] ?? '')))
    }

    return rows
  }

  async maybeSingle() {
    const rows = this.run()
    return { data: rows[0] ?? null, error: null }
  }

  then<TResult1 = { data: any, error: null }, TResult2 = never>(
    onFulfilled?: ((value: { data: any, error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.run(), error: null }).then(onFulfilled, onRejected)
  }
}

export function createFakeSupabaseClient(db: FakeDatabase) {
  return {
    from(table: string) {
      return new FakeQuery(db, table)
    },
  }
}
