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

// Mock DatabaseQuery class that matches the actual DatabaseQuery API
class DatabaseQuery implements PromiseLike<{ data: any; error: any; count?: number }> {
  private table: string;
  private selectFields: string[] = ['*'];
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private orderByField?: string;
  private orderByAscending: boolean = true;
  private limitCount?: number;
  private insertData?: any;
  private updateData?: any;
  private deleteMode: boolean = false;
  private countMode: boolean = false;
  private singleMode: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  // Make this class thenable so it can be awaited directly
  then<TResult1 = { data: any; error: any; count?: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  select(fields: string | string[] = '*', options?: { count?: 'exact' | 'estimated' | 'planned'; head?: boolean }): this {
    // Handle count queries
    if (options?.count) {
      this.countMode = true;
      return this;
    }
    
    if (typeof fields === 'string') {
      // Handle nested selects with joins like "users:user_id (id, username, avatar_url)"
      if (fields.includes('(') && fields.includes(':')) {
        // Parse nested select - for now, we'll handle this in the query execution
        this.selectFields = [fields];
      } else {
        this.selectFields = fields === '*' ? ['*'] : fields.split(',').map(f => f.trim());
      }
    } else {
      this.selectFields = fields;
    }
    return this;
  }

  eq(field: string, value: any): this {
    this.whereConditions.push({ field, operator: '=', value });
    return this;
  }

  neq(field: string, value: any): this {
    this.whereConditions.push({ field, operator: '!=', value });
    return this;
  }

  in(field: string, values: any[]): this {
    if (!values || values.length === 0) {
      // Return empty result for empty IN clause
      this.whereConditions.push({ field, operator: 'IN_EMPTY', value: [] });
      return this;
    }
    this.whereConditions.push({ field, operator: 'IN', value: values });
    return this;
  }

  or(condition: string): this {
    // Parse OR conditions like "email.eq.test@example.com,username.eq.test"
    const parts = condition.split(',');
    const orConditions: Array<{ field: string; operator: string; value: any }> = [];
    parts.forEach(part => {
      const match = part.match(/(\w+)\.(eq|neq|in)\.(.+)/);
      if (match) {
        const [, field, op, value] = match;
        const operator = op === 'eq' ? '=' : op === 'neq' ? '!=' : 'IN';
        orConditions.push({ field, operator, value });
      }
    });
    // Store OR conditions as a special marker
    if (orConditions.length > 0) {
      this.whereConditions.push({ field: '__OR__', operator: 'OR', value: orConditions });
    }
    return this;
  }

  ilike(field: string, pattern: string): this {
    this.whereConditions.push({ field, operator: 'ILIKE', value: pattern });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }): this {
    this.orderByField = field;
    this.orderByAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  insert(data: any): this {
    this.insertData = data;
    return this;
  }

  update(data: any): this {
    this.updateData = data;
    return this;
  }

  delete(): this {
    this.deleteMode = true;
    return this;
  }

  single(): this {
    this.singleMode = true;
    this.limitCount = 1;
    return this;
  }

  async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      const tableData = mockDataStore[this.table as TableName] as any[];

      // Handle count queries
      if (this.countMode) {
        let rows = [...tableData];
        rows = this.applyFilters(rows);
        const count = rows.length;
        return { data: null, error: null, count };
      }

      // Handle DELETE
      if (this.deleteMode) {
        const { deleted } = this.partitionRows(tableData);
        return {
          data: this.singleMode ? (deleted[0] ?? null) : deleted,
          error: null,
        };
      }

      // Handle UPDATE
      if (this.updateData) {
        const { updated } = this.applyUpdate(tableData);
        return {
          data: this.singleMode ? (updated[0] ?? null) : updated,
          error: null,
        };
      }

      // Handle INSERT
      if (this.insertData) {
        const newRow = this.prepareRow({ ...this.insertData });
        tableData.push(newRow);
        const insertedRow = { ...newRow };
        
        // Apply any filters/selects to the inserted row
        let result = [insertedRow];
        result = this.applySelect(result);
        result = this.applyFilters(result);
        
        return {
          data: this.singleMode ? (result[0] ?? null) : result,
          error: null,
        };
      }

      // Handle SELECT
      let rows = [...tableData];
      rows = this.applySelect(rows);
      rows = this.applyFilters(rows);
      rows = this.applyOrdering(rows);

      if (typeof this.limitCount === 'number') {
        rows = rows.slice(0, this.limitCount);
      }

      return {
        data: this.singleMode ? (rows[0] ?? null) : rows,
        error: null,
      };
    } catch (error: any) {
      console.error('Database query error:', error);
      return { data: null, error };
    }
  }

  private applySelect(rows: any[]): any[] {
    // Handle nested selects with joins like "users:user_id (id, username, avatar_url)"
    if (this.selectFields.length === 1 && this.selectFields[0].includes('(') && this.selectFields[0].includes(':')) {
      const match = this.selectFields[0].match(/(\w+):(\w+)\s*\(([^)]+)\)/);
      if (match) {
        const [, joinTable, foreignKey, fields] = match;
        const fieldList = fields.split(',').map(f => f.trim());
        
        return rows.map(row => {
          const joinedData: any = {};
          const relatedRow = (mockDataStore[joinTable as TableName] as any[]).find(
            (r: any) => r.id === row[foreignKey]
          );
          
          if (relatedRow) {
            fieldList.forEach(field => {
              joinedData[field] = relatedRow[field];
            });
          }
          
          return {
            ...row,
            [joinTable]: Object.keys(joinedData).length > 0 ? joinedData : null
          };
        });
      }
    }
    
    // For simple selects, return rows as-is (we'll filter fields if needed)
    return rows;
  }

  private applyFilters(rows: any[]): any[] {
    if (this.whereConditions.length === 0) {
      return rows;
    }

    return rows.filter(row => {
      // Check for empty IN clause
      const hasEmptyIn = this.whereConditions.some(
        cond => cond.operator === 'IN_EMPTY'
      );
      if (hasEmptyIn) {
        return false;
      }

      // Regular filters (AND logic)
      const regularFilters = this.whereConditions.filter(
        cond => cond.field !== '__OR__'
      );
      
      // OR filters
      const orFilter = this.whereConditions.find(
        cond => cond.field === '__OR__' && cond.operator === 'OR'
      );

      // All regular filters must pass
      const allRegularPass = regularFilters.length === 0 || regularFilters.every(cond => {
        if (cond.operator === 'IN') {
          return cond.value.includes(row[cond.field]);
        } else if (cond.operator === 'ILIKE') {
          const regexPattern = cond.value
            .replace(/%/g, '.*')
            .replace(/_/g, '.');
          const regex = new RegExp(`^${regexPattern}$`, 'i');
          return row[cond.field] && typeof row[cond.field] === 'string' && regex.test(row[cond.field]);
        } else {
          return row[cond.field] === cond.value;
        }
      });

      // At least one OR condition must pass (if any exist)
      let anyOrPass = true;
      if (orFilter) {
        const orConditions = orFilter.value as Array<{ field: string; operator: string; value: any }>;
        anyOrPass = orConditions.some(orCond => {
          if (orCond.operator === 'IN') {
            return Array.isArray(orCond.value) && orCond.value.includes(row[orCond.field]);
          } else {
            return row[orCond.field] === orCond.value;
          }
        });
      }

      return allRegularPass && anyOrPass;
    });
  }

  private applyOrdering(rows: any[]): any[] {
    if (!this.orderByField) {
      return rows;
    }

    const { orderByField, orderByAscending } = this;
    return [...rows].sort((a, b) => {
      const aVal = a[orderByField];
      const bVal = b[orderByField];

      if (aVal === bVal) {
        return 0;
      }

      if (aVal === undefined || aVal === null) {
        return orderByAscending ? -1 : 1;
      }
      if (bVal === undefined || bVal === null) {
        return orderByAscending ? 1 : -1;
      }

      if (this.isDateLike(aVal) && this.isDateLike(bVal)) {
        const diff = new Date(aVal).getTime() - new Date(bVal).getTime();
        return orderByAscending ? diff : -diff;
      }

      const comparison = aVal > bVal ? 1 : -1;
      return orderByAscending ? comparison : -comparison;
    });
  }

  private isDateLike(value: any): boolean {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
  }

  private partitionRows(tableData: any[]) {
    const deleted: any[] = [];
    const remaining: any[] = [];

    tableData.forEach(row => {
      if (this.matchesFilters(row)) {
        deleted.push(row);
      } else {
        remaining.push(row);
      }
    });

    // Update the store
    tableData.length = 0;
    tableData.push(...remaining);

    return { deleted };
  }

  private applyUpdate(tableData: any[]) {
    const updated: any[] = [];

    tableData.forEach((row, index) => {
      if (this.matchesFilters(row)) {
        const updatedRow = { ...row, ...this.updateData };
        tableData[index] = updatedRow;
        updated.push(updatedRow);
      }
    });

    return { updated };
  }

  private matchesFilters(row: any): boolean {
    if (this.whereConditions.length === 0) {
      return true;
    }

    const regularFilters = this.whereConditions.filter(
      cond => cond.field !== '__OR__'
    );
    
    const orFilter = this.whereConditions.find(
      cond => cond.field === '__OR__' && cond.operator === 'OR'
    );

    const allRegularPass = regularFilters.length === 0 || regularFilters.every(cond => {
      if (cond.operator === 'IN') {
        return cond.value.includes(row[cond.field]);
      } else if (cond.operator === 'ILIKE') {
        const regexPattern = cond.value
          .replace(/%/g, '.*')
          .replace(/_/g, '.');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return row[cond.field] && typeof row[cond.field] === 'string' && regex.test(row[cond.field]);
      } else {
        return row[cond.field] === cond.value;
      }
    });

    let anyOrPass = true;
    if (orFilter) {
      const orConditions = orFilter.value as Array<{ field: string; operator: string; value: any }>;
      anyOrPass = orConditions.some(orCond => {
        if (orCond.operator === 'IN') {
          return Array.isArray(orCond.value) && orCond.value.includes(row[orCond.field]);
        } else {
          return row[orCond.field] === orCond.value;
        }
      });
    }

    return allRegularPass && anyOrPass;
  }

  private prepareRow(row: any) {
    if (this.table === 'comments') {
      if (!row.id) {
        row.id = generateId('comment');
      }
      if (!row.created_at) {
        row.created_at = new Date().toISOString();
      }
    }

    if (this.table === 'posts') {
      if (!row.id) {
        row.id = generateId('post');
      }
      if (!row.created_at) {
        row.created_at = new Date().toISOString();
      }
    }

    if (this.table === 'users' && !row.id) {
      row.id = generateId('user');
    }

    return row;
  }
}

// DatabaseClient class that matches the actual API
class DatabaseClient {
  from(table: string): DatabaseQuery {
    return new DatabaseQuery(table);
  }
}

// Export database clients matching the actual API
export const db = new DatabaseClient();
export const dbAdmin = new DatabaseClient(); // Same as db for RDS

// Export pool mock (not used in tests, but needed for compatibility)
export const dbPool = {
  query: async () => ({ rows: [] }),
} as any;

// Test connection function
export async function testConnection(): Promise<boolean> {
  return true;
}

export default db;

// Reset function for tests
export const resetMockData = () => {
  mockDataStore.users = [];
  mockDataStore.posts = [];
  mockDataStore.follows = [];
  mockDataStore.likes = [];
  mockDataStore.comments = [];
  idCounter = 0;
};
