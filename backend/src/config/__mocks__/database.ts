// Minimal Supabase mock for Jest tests
// This allows tests to run without hitting a real Supabase instance

type TableName = 'users' | 'posts' | 'follows' | 'likes' | 'comments';

interface MockDataStore {
  users: any[];
  posts: any[];
  follows: any[];
  likes: any[];
  comments: any[];
}

export const mockDataStore: MockDataStore = {
  users: [],
  posts: [],
  follows: [],
  likes: [],
  comments: [],
};

let idCounter = 0;
const generateId = () => `mock-${++idCounter}`;

class MockQuery {
  private filters: Array<(row: any) => boolean> = [];
  private orderSpec: { column: string; ascending: boolean } | null = null;
  private limitValue?: number;
  private selectQuery?: string;
  private operation: 'select' | 'insert' | 'delete' | 'update' = 'select';
  private insertedRows: any[] = [];
  private updateData?: any;
  private isDeleteOperation = false;
  private isUpdateOperation = false;
  private orFilters: Array<(row: any) => boolean> = [];

  constructor(private tableName: TableName) {}

  select(columns: string | string[] = '*', options?: { count?: 'exact'; head?: boolean }): this {
    this.operation = 'select';
    this.selectQuery = Array.isArray(columns) ? columns.join(',') : columns;
    return this;
  }

  insert(payload: any): this {
    this.operation = 'insert';
    const rows = Array.isArray(payload) ? payload : [payload];
    this.insertedRows = rows.map(row => {
      if (!row.id && this.tableName !== 'follows' && this.tableName !== 'likes') {
        row.id = generateId();
      }
      if (this.tableName === 'users' && !row.created_at) {
        row.created_at = new Date().toISOString();
      }
      if (this.tableName === 'posts' && !row.created_at) {
        row.created_at = new Date().toISOString();
      }
      if (this.tableName === 'comments' && !row.created_at) {
        row.created_at = new Date().toISOString();
      }
      return row;
    });
    const target = mockDataStore[this.tableName] as any[];
    this.insertedRows.forEach(record => target.push(record));
    return this;
  }

  update(payload: any): this {
    this.operation = 'update';
    this.isUpdateOperation = true;
    this.updateData = payload;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    this.isDeleteOperation = true;
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push(row => row[column] === value);
    return this;
  }

  in(column: string, values: any[]): this {
    if (!values || values.length === 0) {
      return this;
    }
    const set = new Set(values);
    this.filters.push(row => set.has(row[column]));
    return this;
  }

  or(conditionString: string): this {
    const conditions = conditionString.split(',');
    const orFilter = (row: any) => {
      return conditions.some(cond => {
        const trimmed = cond.trim();
        const match = trimmed.match(/^([^.]+)\.([^.]+)\.(.+)$/);
        if (!match) return false;
        const [, column, operator, value] = match;
        if (operator === 'eq') {
          return row[column] === value;
        }
        return false;
      });
    };
    this.orFilters.push(orFilter);
    return this;
  }

  ilike(column: string, pattern: string): this {
    const regexPattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    this.filters.push(row => {
      const value = row[column];
      return value && typeof value === 'string' && regex.test(value);
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderSpec = {
      column,
      ascending: options?.ascending ?? true,
    };
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  single(): Promise<{ data: any; error: any }> {
    return this.execute(true).then(result => {
      if ('count' in result) {
        return { data: null, error: null };
      }
      return result as { data: any; error: any };
    });
  }

  then<TResult1 = { data: any[]; error: any } | { count: number; error: any }, TResult2 = never>(
    onFulfilled?: ((value: { data: any[]; error: any } | { count: number; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute(false).then(onFulfilled as any, onRejected as any);
  }

  private async execute(single: boolean): Promise<{ data: any; error: any } | { data: any[]; error: any } | { count: number; error: any }> {
    if (this.isDeleteOperation || this.operation === 'delete') {
      const { deleted } = this.partitionRows();
      return {
        data: single ? deleted[0] ?? null : deleted,
        error: null,
      };
    }

    if (this.isUpdateOperation || this.operation === 'update') {
      const { updated } = this.applyUpdate();
      return {
        data: single ? updated[0] ?? null : updated,
        error: null,
      };
    }

    let rows: any[];

    if (this.operation === 'insert' && this.insertedRows.length > 0) {
      rows = [...this.insertedRows];
    } else {
      rows = (mockDataStore[this.tableName] as any[]).map(row => ({ ...row }));
    }

    rows = this.applyFilters(rows);
    rows = this.applyOrdering(rows);

    if (this.selectQuery?.includes('count')) {
      return { count: rows.length, error: null };
    }

    if (typeof this.limitValue === 'number') {
      rows = rows.slice(0, this.limitValue);
    }

    rows = rows.map(row => this.attachRelations(row));

    return {
      data: single ? rows[0] ?? null : rows,
      error: null,
    };
  }

  private partitionRows() {
    const rows = mockDataStore[this.tableName] as any[];
    const deleted: any[] = [];
    const remaining: any[] = [];

    rows.forEach(row => {
      if (this.filters.every(fn => fn(row))) {
        deleted.push(row);
      } else {
        remaining.push(row);
      }
    });

    rows.length = 0;
    rows.push(...remaining);
    return { deleted };
  }

  private applyUpdate() {
    const rows = mockDataStore[this.tableName] as any[];
    const updated: any[] = [];

    rows.forEach((row, index) => {
      if (this.filters.every(fn => fn(row))) {
        const updatedRow = { ...row, ...this.updateData };
        rows[index] = updatedRow;
        updated.push(updatedRow);
      }
    });

    return { updated };
  }

  private applyFilters(rows: any[]): any[] {
    if (this.filters.length === 0 && this.orFilters.length === 0) {
      return rows;
    }
    return rows.filter(row => {
      const allFiltersPass = this.filters.length === 0 || this.filters.every(fn => fn(row));
      const anyOrFilterPass = this.orFilters.length === 0 || this.orFilters.some(fn => fn(row));
      if (this.filters.length === 0) {
        return anyOrFilterPass;
      }
      if (this.orFilters.length === 0) {
        return allFiltersPass;
      }
      return allFiltersPass && anyOrFilterPass;
    });
  }

  private applyOrdering(rows: any[]): any[] {
    if (!this.orderSpec) {
      return rows;
    }
    const { column, ascending } = this.orderSpec;
    return [...rows].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      if (aVal === bVal) return 0;
      if (aVal === undefined) return ascending ? -1 : 1;
      if (bVal === undefined) return ascending ? 1 : -1;
      if (typeof aVal === 'string' && !Number.isNaN(Date.parse(aVal)) && typeof bVal === 'string' && !Number.isNaN(Date.parse(bVal))) {
        const diff = new Date(aVal).getTime() - new Date(bVal).getTime();
        return ascending ? diff : -diff;
      }
      const comparison = aVal > bVal ? 1 : -1;
      return ascending ? comparison : -comparison;
    });
  }

  private attachRelations(row: any) {
    if (!this.selectQuery) {
      return row;
    }
    const result = { ...row };
    if (this.selectQuery.includes('users:user_id')) {
      result.users = mockDataStore.users.find(user => user.id === row.user_id) || null;
    }
    return result;
  }
}

const createMockClient = () => ({
  from: <T extends TableName>(table: T) => new MockQuery(table),
  storage: {
    from: (bucket: string) => ({
      async upload(path: string, _body?: unknown) {
        return { data: { path: `${bucket}/${path}` }, error: null };
      },
      getPublicUrl(path: string) {
        return {
          data: { publicUrl: `https://mock-storage/${bucket}/${path}` },
          error: null,
        };
      },
      async remove(_paths: string[]) {
        return { data: null, error: null };
      },
    }),
  },
});

export const supabase = createMockClient();
export const supabaseAdmin = createMockClient();

export const resetMockData = () => {
  mockDataStore.users = [];
  mockDataStore.posts = [];
  mockDataStore.follows = [];
  mockDataStore.likes = [];
  mockDataStore.comments = [];
  idCounter = 0;
};
