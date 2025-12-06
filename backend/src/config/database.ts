import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

dotenv.config();

// Initialize AWS Secrets Manager client (optional - only used if DB_SECRET_ARN is set)
let secretsManagerClient: SecretsManagerClient | null = null;
if (process.env.AWS_REGION) {
  secretsManagerClient = new SecretsManagerClient({
    region: process.env.AWS_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined, // Will use IAM role if running on EC2/Lambda
  });
}

// Function to retrieve database credentials from AWS Secrets Manager
async function getCredentialsFromSecretsManager(): Promise<{
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}> {
  if (!process.env.DB_SECRET_ARN) {
    throw new Error('DB_SECRET_ARN environment variable is required when using Secrets Manager');
  }

  if (!secretsManagerClient) {
    throw new Error('Secrets Manager client not initialized. Set AWS_REGION in environment variables.');
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: process.env.DB_SECRET_ARN,
    });

    const response = await secretsManagerClient.send(command);
    
    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    const secret = JSON.parse(response.SecretString);
    
    // RDS secrets typically contain: username, password, engine, host, port, dbname
    // But sometimes host/endpoint is not in the secret, so we use DB_HOST from env
    const host = secret.host || secret.endpoint || process.env.DB_HOST;
    if (!host) {
      throw new Error('Database host not found in secret and DB_HOST environment variable is not set');
    }
    
    // RDS secrets sometimes have the instance name as dbname, but we want the actual database name
    // Default to 'postgres' which is the standard PostgreSQL default database
    // Priority: DB_NAME env var > 'postgres' (default) > secret value (which might be instance name)
    const dbName = process.env.DB_NAME || 'postgres';
    
    return {
      host: host,
      port: parseInt(secret.port || process.env.DB_PORT || '5432'),
      database: dbName,
      user: secret.username || secret.user || process.env.DB_USER || 'postgres',
      password: secret.password || '',
    };
  } catch (error: any) {
    console.error('Error retrieving secret from AWS Secrets Manager:', error);
    throw new Error(`Failed to retrieve database credentials: ${error.message}`);
  }
}

// Function to get database configuration
async function getDbConfig() {
  // If DB_SECRET_ARN is set, use AWS Secrets Manager
  if (process.env.DB_SECRET_ARN) {
    console.log('Using AWS Secrets Manager for database credentials');
    return await getCredentialsFromSecretsManager();
  }

  // Otherwise, use environment variables directly
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error('Missing database credentials. Set either DB_SECRET_ARN or DB_HOST, DB_USER, DB_PASSWORD');
  }

  return {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
}

// Initialize database pool (will be created after credentials are retrieved)
let pool: Pool | null = null;

// Async function to initialize the database connection
async function initializePool() {
  if (pool) {
    return pool;
  }

  const config = await getDbConfig();
  
  console.log('Attempting to connect to database:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    ssl: process.env.DB_SSL === 'true',
  });
  
  pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased to 10 seconds
  });

  // Test connection on startup
  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  return pool;
}

// Initialize pool immediately (for synchronous access)
// Note: This will use environment variables if DB_SECRET_ARN is not set
let poolPromise: Promise<Pool> | null = null;

function getPool(): Pool {
  if (pool) {
    return pool;
  }
  
  if (!poolPromise) {
    poolPromise = initializePool();
  }
  
  // For synchronous access, we'll create a temporary pool with env vars
  // The async initialization will happen on first query
  if (!pool) {
    const config = {
      host: process.env.DB_HOST || '',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };

    pool = new Pool({
      ...config,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  
  return pool;
}

// Database query helper class that mimics Supabase's query builder API
// Implements thenable interface so it can be awaited directly
class DatabaseQuery implements PromiseLike<{ data: any; error: any; count?: number }> {
  private table: string;
  private selectFields: string[] = ['*'];
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private orderByField?: string;
  private orderByAscending: boolean = true;
  private limitCount?: number;
  private joinClauses: Array<{ type: string; table: string; on: string }> = [];
  private insertData?: any;
  private updateData?: any;
  private deleteMode: boolean = false;
  private countMode: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  // Make this class thenable so it can be awaited directly (like Supabase)
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
      // Handle Supabase-style nested selects like "users:user_id (id, username, avatar_url)"
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
    this.whereConditions.push({ field, operator: 'IN', value: values });
    return this;
  }

  or(condition: string): this {
    // Parse Supabase-style OR conditions like "email.eq.test@example.com,username.eq.test"
    // Store as a special OR condition group
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
    this.limitCount = 1;
    return this;
  }

  async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      // Ensure pool is initialized (will use Secrets Manager if DB_SECRET_ARN is set)
      const dbPool = await initializePool();
      
      let query = '';
      let params: any[] = [];
      let paramIndex = 1;

      if (this.insertData) {
        // INSERT query
        const keys = Object.keys(this.insertData);
        const values = keys.map(() => `$${paramIndex++}`);
        const placeholders = values.join(', ');
        params = keys.map(key => this.insertData[key]);
        
        query = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      } else if (this.updateData) {
        // UPDATE query
        const setClauses = Object.keys(this.updateData).map(key => {
          const placeholder = `$${paramIndex++}`;
          params.push(this.updateData[key]);
          return `${key} = ${placeholder}`;
        });
        
        query = `UPDATE ${this.table} SET ${setClauses.join(', ')}`;
        
        // Add WHERE conditions
        if (this.whereConditions.length > 0) {
          const whereClauses: string[] = [];
          this.whereConditions.forEach(cond => {
            if (cond.field === '__OR__' && cond.operator === 'OR') {
              // Handle OR conditions
              const orClauses = (cond.value as Array<{ field: string; operator: string; value: any }>).map(orCond => {
                if (orCond.operator === 'IN') {
                  const placeholders = orCond.value.map(() => `$${paramIndex++}`).join(', ');
                  params.push(...orCond.value);
                  return `${orCond.field} IN (${placeholders})`;
                } else {
                  const placeholder = `$${paramIndex++}`;
                  params.push(orCond.value);
                  return `${orCond.field} ${orCond.operator} ${placeholder}`;
                }
              });
              whereClauses.push(`(${orClauses.join(' OR ')})`);
            } else if (cond.operator === 'IN') {
              const placeholders = cond.value.map(() => `$${paramIndex++}`).join(', ');
              params.push(...cond.value);
              whereClauses.push(`${cond.field} IN (${placeholders})`);
            } else {
              const placeholder = `$${paramIndex++}`;
              params.push(cond.value);
              whereClauses.push(`${cond.field} ${cond.operator} ${placeholder}`);
            }
          });
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        
        query += ' RETURNING *';
      } else if (this.deleteMode) {
        // DELETE query
        query = `DELETE FROM ${this.table}`;
        
        if (this.whereConditions.length > 0) {
          const whereClauses: string[] = [];
          this.whereConditions.forEach(cond => {
            if (cond.field === '__OR__' && cond.operator === 'OR') {
              // Handle OR conditions
              const orClauses = (cond.value as Array<{ field: string; operator: string; value: any }>).map(orCond => {
                if (orCond.operator === 'IN') {
                  const placeholders = orCond.value.map(() => `$${paramIndex++}`).join(', ');
                  params.push(...orCond.value);
                  return `${orCond.field} IN (${placeholders})`;
                } else {
                  const placeholder = `$${paramIndex++}`;
                  params.push(orCond.value);
                  return `${orCond.field} ${orCond.operator} ${placeholder}`;
                }
              });
              whereClauses.push(`(${orClauses.join(' OR ')})`);
            } else if (cond.operator === 'IN') {
              const placeholders = cond.value.map(() => `$${paramIndex++}`).join(', ');
              params.push(...cond.value);
              whereClauses.push(`${cond.field} IN (${placeholders})`);
            } else {
              const placeholder = `$${paramIndex++}`;
              params.push(cond.value);
              whereClauses.push(`${cond.field} ${cond.operator} ${placeholder}`);
            }
          });
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        
        query += ' RETURNING *';
      } else if (this.countMode) {
        // COUNT query
        query = `SELECT COUNT(*) as count FROM ${this.table}`;
        
        // Add WHERE conditions
        if (this.whereConditions.length > 0) {
          const whereClauses = this.whereConditions.map(cond => {
            if (cond.operator === 'IN') {
              const placeholders = cond.value.map(() => `$${paramIndex++}`).join(', ');
              params.push(...cond.value);
              return `${cond.field} IN (${placeholders})`;
            } else if (cond.operator === 'ILIKE') {
              const placeholder = `$${paramIndex++}`;
              params.push(cond.value);
              return `${cond.field} ILIKE ${placeholder}`;
            } else {
              const placeholder = `$${paramIndex++}`;
              params.push(cond.value);
              return `${cond.field} ${cond.operator} ${placeholder}`;
            }
          });
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
      } else {
        // SELECT query
        let selectClause = '';
        
        // Handle nested selects (Supabase-style joins)
        if (this.selectFields.length === 1 && this.selectFields[0].includes('(') && this.selectFields[0].includes(':')) {
          // Parse: "users:user_id (id, username, avatar_url)"
          const match = this.selectFields[0].match(/(\w+):(\w+)\s*\(([^)]+)\)/);
          if (match) {
            const [, joinTable, foreignKey, fields] = match;
            const fieldList = fields.split(',').map(f => f.trim());
            const aliasedFields = fieldList.map(f => `${joinTable}.${f} as ${joinTable}_${f}`).join(', ');
            selectClause = `${this.table}.*, ${aliasedFields}`;
            this.joinClauses.push({
              type: 'LEFT',
              table: joinTable,
              on: `${this.table}.${foreignKey} = ${joinTable}.id`
            });
          } else {
            selectClause = this.selectFields.join(', ');
          }
        } else {
          selectClause = this.selectFields.join(', ');
        }
        
        query = `SELECT ${selectClause} FROM ${this.table}`;
        
        // Add JOINs
        this.joinClauses.forEach(join => {
          query += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
        });
        
        // Add WHERE conditions
        if (this.whereConditions.length > 0) {
          const whereClauses = this.whereConditions.map(cond => {
            if (cond.operator === 'IN') {
              const placeholders = cond.value.map(() => `$${paramIndex++}`).join(', ');
              params.push(...cond.value);
              return `${cond.field} IN (${placeholders})`;
            } else if (cond.operator === 'ILIKE') {
              const placeholder = `$${paramIndex++}`;
              params.push(cond.value);
              return `${cond.field} ILIKE ${placeholder}`;
            } else {
              const placeholder = `$${paramIndex++}`;
              params.push(cond.value);
              return `${cond.field} ${cond.operator} ${placeholder}`;
            }
          });
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        
        // Add ORDER BY
        if (this.orderByField) {
          query += ` ORDER BY ${this.orderByField} ${this.orderByAscending ? 'ASC' : 'DESC'}`;
        }
        
        // Add LIMIT
        if (this.limitCount) {
          query += ` LIMIT $${paramIndex++}`;
          params.push(this.limitCount);
        }
      }

      const result: QueryResult = await dbPool.query(query, params);
      
      // Handle count queries
      if (this.countMode) {
        const count = parseInt(result.rows[0]?.count || '0');
        return { data: null, error: null, count };
      }
      
      // Transform result to match Supabase format
      let data = result.rows;
      
      // Handle nested select results (transform joined data)
      if (this.selectFields.length === 1 && this.selectFields[0].includes('(') && this.selectFields[0].includes(':')) {
        const match = this.selectFields[0].match(/(\w+):(\w+)\s*\(([^)]+)\)/);
        if (match) {
          const [, joinTable, , fields] = match;
          const fieldList = fields.split(',').map(f => f.trim());
          data = data.map(row => {
            const joinedData: any = {};
            fieldList.forEach(field => {
              const key = `${joinTable}_${field}`;
              if (row[key] !== undefined) {
                joinedData[field] = row[key];
              }
            });
            // Remove the aliased fields from the main row
            fieldList.forEach(field => {
              delete row[`${joinTable}_${field}`];
            });
            return {
              ...row,
              [joinTable]: Object.keys(joinedData).length > 0 ? joinedData : null
            };
          });
        }
      }
      
      // Handle single() - return first row or null
      if (this.limitCount === 1 && !this.insertData && !this.updateData && !this.deleteMode && !this.countMode) {
        return { data: data[0] || null, error: null };
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Database query error:', error);
      return { data: null, error };
    }
  }
}

// Create a database client that mimics Supabase's API
class DatabaseClient {
  from(table: string): DatabaseQuery {
    return new DatabaseQuery(table);
  }
}

// Export database clients (mimicking supabase and supabaseAdmin)
export const supabase = new DatabaseClient();
export const supabaseAdmin = new DatabaseClient(); // Same client for RDS (no RLS)

// Export pool for direct queries if needed
export const db = getPool();

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    const dbPool = await initializePool();
    const result = await dbPool.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export default supabase;
