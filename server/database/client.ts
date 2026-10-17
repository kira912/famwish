import pg from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const { Pool } = pg

export type DrizzleDatabase = NodePgDatabase<typeof schema>

let activePool: pg.Pool | null = null
let activeDb: DrizzleDatabase | null = null
let activeConnectionString: string | null = null
let schemaInitPromise: Promise<boolean> | null = null

const MANAGED_SSL_HOSTS = ['vercel-storage.com', 'neon.tech', 'supabase.co', 'railway.app', 'render.com']

/**
 * Resolves the active PostgreSQL connection string from standard environment variables.
 */
export function resolvePostgresConnectionString(): string | null {
  const raw =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING

  const trimmed = raw?.trim()
  return trimmed ? trimmed : null
}

function shouldUseSsl(connectionString: string): boolean {
  if (process.env.NODE_ENV === 'production') return true
  if (connectionString.includes('sslmode=require')) return true
  return MANAGED_SSL_HOSTS.some(host => connectionString.includes(host))
}

/**
 * Returns a singleton pg.Pool if PostgreSQL is configured, or null when running in fallback mode.
 */
export function getPgPool(): pg.Pool | null {
  const connectionString = resolvePostgresConnectionString()

  if (!connectionString) {
    return null
  }

  if (!activePool || activeConnectionString !== connectionString) {
    if (activePool) {
      activePool.end().catch(() => {})
    }

    activeConnectionString = connectionString
    schemaInitPromise = null

    activePool = new Pool({
      connectionString,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })

    // Prevent unhandled pool error events from crashing the Node process
    activePool.on('error', (err) => {
      console.error('[Database] Unexpected error on idle PostgreSQL client:', err)
    })

    activeDb = drizzle(activePool, { schema })
  }

  return activePool
}

/**
 * Returns the typed Drizzle ORM instance when PostgreSQL is configured, or null otherwise.
 */
export function getDrizzleDb(): DrizzleDatabase | null {
  const pool = getPgPool()
  if (!pool) return null
  if (!activeDb) {
    activeDb = drizzle(pool, { schema })
  }
  return activeDb
}

const SCHEMA_BOOTSTRAP_SQL = `
  CREATE TABLE IF NOT EXISTS wishlists (
    id VARCHAR(255) PRIMARY KEY,
    owner_id VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_avatar TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'christmas',
    event_date VARCHAR(50),
    cover_emoji VARCHAR(50),
    cover_gradient VARCHAR(255),
    invite_code VARCHAR(100) UNIQUE,
    members JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS wishlist_items (
    id VARCHAR(255) PRIMARY KEY,
    list_id VARCHAR(255) NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_id VARCHAR(255),
    recipient_avatar TEXT,
    description TEXT,
    url TEXT,
    image_url TEXT,
    price NUMERIC(10, 2),
    currency VARCHAR(10) DEFAULT '€',
    quantity INT DEFAULT 1,
    color_or_variant VARCHAR(255),
    comment TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium',
    is_purchased BOOLEAN DEFAULT FALSE,
    purchased_by JSONB,
    purchased_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR(255) PRIMARY KEY,
    list_id VARCHAR(255) NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_avatar TEXT,
    endpoint TEXT,
    keys JSONB,
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    notify_on_add BOOLEAN DEFAULT TRUE NOT NULL,
    notify_on_reserve BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS list_notifications (
    id VARCHAR(255) PRIMARY KEY,
    list_id VARCHAR(255) NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    list_title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_title VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_id VARCHAR(255),
    is_child_recipient BOOLEAN DEFAULT FALSE NOT NULL,
    actor_id VARCHAR(255),
    actor_name VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);
  ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS recipient_id VARCHAR(255);
  ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS recipient_avatar TEXT;

  CREATE INDEX IF NOT EXISTS idx_wishlist_items_list_id ON wishlist_items(list_id);
  CREATE INDEX IF NOT EXISTS idx_wishlists_invite_code ON wishlists(invite_code);
  CREATE INDEX IF NOT EXISTS idx_wishlists_owner_id ON wishlists(owner_id);
  CREATE INDEX IF NOT EXISTS idx_push_subscriptions_list_id ON push_subscriptions(list_id);
  CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_list_notifications_list_id ON list_notifications(list_id);
`

/**
 * Ensures the PostgreSQL tables and indexes exist using a single-flight initialization promise
 * to prevent redundant DDL queries and race conditions on concurrent requests.
 */
export async function initPostgresSchema(): Promise<boolean> {
  const pool = getPgPool()
  if (!pool) return false

  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      const client = await pool.connect()
      try {
        await client.query(SCHEMA_BOOTSTRAP_SQL)
        return true
      } catch (err) {
        schemaInitPromise = null
        console.error('[Database] Failed to initialize PostgreSQL schema:', err)
        return false
      } finally {
        client.release()
      }
    })()
  }

  return schemaInitPromise
}

/**
 * Returns a ready-to-query Drizzle database instance after ensuring schema readiness.
 */
export async function getReadyDrizzleDb(): Promise<DrizzleDatabase | null> {
  const db = getDrizzleDb()
  if (!db) return null
  const initialized = await initPostgresSchema()
  return initialized ? db : null
}
