type TableName = 'users' | 'posts' | 'follows' | 'likes' | 'comments';

export interface UserRecord {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string | null;
  created_at?: string;
  password_hash?: string;
}

export interface PostRecord {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  created_at?: string;
  updated_at?: string | null;
  image_url?: string | null;
  video_url?: string | null;
}

export interface FollowRecord {
  follower_id: string;
  following_id: string;
}

export interface LikeRecord {
  user_id: string;
  post_id: string;
}

export interface CommentRecord {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at?: string;
}

export interface MockDataStore {
  users: UserRecord[];
  posts: PostRecord[];
  follows: FollowRecord[];
  likes: LikeRecord[];
  comments: CommentRecord[];
}

export const mockDataStore: MockDataStore = {
  users: [],
  posts: [],
  follows: [],
  likes: [],
  comments: [],
};

let idCounter = 0;

const generateId = (prefix: string) => `${prefix}-${++idCounter}`;

type FilterFn = (row: any) => boolean;

class MockQuery<T extends TableName> {
  private filters: FilterFn[] = [];
  private orderSpec: { column: string; ascending: boolean } | null = null;
  private limitValue?: number;
  private selectQuery?: string;
  private selectOptions?: { count?: 'exact'; head?: boolean };
  private operation: 'select' | 'insert' | 'delete' | 'update' = 'select';
  private isDeleteOperation = false; // Track if delete() was called (even if select() is called after)
  private isUpdateOperation = false; // Track if update() was called (even if select() is called after)
  private insertedRows: any[] = [];
  private updateData?: any;
  private forceEmpty = false;
  private orFilters: FilterFn[] = []; // Filters that use OR logic

  constructor(private readonly tableName: T) {}

  select(columns: string | string[] = '*', options?: { count?: 'exact'; head?: boolean }): this {
    this.operation = 'select';
    this.selectQuery = Array.isArray(columns) ? columns.join(',') : columns;
    this.selectOptions = options;
    return this;
  }

  insert(payload: any): this {
    this.operation = 'insert';
    const rows = Array.isArray(payload) ? payload : [payload];
    this.insertedRows = rows.map(row => this.prepareRow({ ...row }));
    const target = mockDataStore[this.tableName] as any[];
    this.insertedRows.forEach(record => target.push(record));
    return this;
  }

  update(payload: any): this {
    this.operation = 'update';
    this.isUpdateOperation = true; // Mark that update was called
    this.updateData = payload;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    this.isDeleteOperation = true; // Mark that delete was called
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push(row => row[column] === value);
    return this;
  }

  in(column: string, values: any[]): this {
    if (!values || values.length === 0) {
      this.forceEmpty = true;
      return this;
    }
    const set = new Set(values);
    this.filters.push(row => set.has(row[column]));
    return this;
  }

  or(conditionString: string): this {
    // Parse format like "email.eq.value,username.eq.value"
    // Value may contain dots (e.g., email addresses)
    const conditions = conditionString.split(',');
    const orFilter: FilterFn = (row) => {
      return conditions.some(cond => {
        const trimmed = cond.trim();
        // Match pattern: column.operator.value
        // Use regex to capture: (column).(operator).(value)
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
    // Case-insensitive LIKE matching with % wildcards
    const regexPattern = pattern
      .replace(/%/g, '.*')
      .replace(/_/g, '.');
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

    if (this.forceEmpty) {
      const countResult = this.selectOptions?.count === 'exact' && this.selectOptions?.head;
      if (countResult) {
        return { count: 0, error: null };
      }
      return { data: single ? null : [], error: null };
    }

    let rows: any[];

    if (this.operation === 'insert' && this.insertedRows.length > 0) {
      rows = [...this.insertedRows];
    } else {
      rows = (mockDataStore[this.tableName] as any[]).map(row => ({ ...row }));
    }

    rows = this.applyFilters(rows);
    rows = this.applyOrdering(rows);

    // Handle count select (only used without single())
    if (this.selectOptions?.count === 'exact' && this.selectOptions?.head) {
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
        // Merge update data into the row
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
      // All regular filters must pass (AND logic)
      const allFiltersPass = this.filters.length === 0 || this.filters.every(fn => fn(row));
      // At least one OR filter must pass (if any exist)
      const anyOrFilterPass = this.orFilters.length === 0 || this.orFilters.some(fn => fn(row));
      
      // If no regular filters, just check OR filters
      // If no OR filters, just check regular filters
      // If both exist, both conditions must be met
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

      if (aVal === bVal) {
        return 0;
      }

      if (aVal === undefined) {
        return ascending ? -1 : 1;
      }
      if (bVal === undefined) {
        return ascending ? 1 : -1;
      }

      if (this.isDateLike(aVal) && this.isDateLike(bVal)) {
        const diff = new Date(aVal).getTime() - new Date(bVal).getTime();
        return ascending ? diff : -diff;
      }

      const comparison = aVal > bVal ? 1 : -1;
      return ascending ? comparison : -comparison;
    });
  }

  private isDateLike(value: any): value is string {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
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

  private prepareRow(row: any) {
    if (this.tableName === 'comments') {
      if (!row.id) {
        row.id = generateId('comment');
      }
      if (!row.created_at) {
        row.created_at = new Date().toISOString();
      }
    }

    if (this.tableName === 'posts') {
      if (!row.id) {
        row.id = generateId('post');
      }
      if (!row.created_at) {
        row.created_at = new Date().toISOString();
      }
    }

    if (this.tableName === 'users' && !row.id) {
      row.id = generateId('user');
    }

    return row;
  }
}

const createMockClient = () => ({
  from<T extends TableName>(table: T) {
    return new MockQuery(table);
  },
  storage: {
    from(bucket: string) {
      return {
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
      };
    },
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

