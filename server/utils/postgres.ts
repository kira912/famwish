import pg from 'pg'
import type { Wishlist, WishlistItem } from '../../types'

const { Pool } = pg

let pool: pg.Pool | null = null
let isInitialized = false

export function getPgPool(): pg.Pool | null {
  const connectionString = 
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING

  if (!connectionString) {
    return null
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=require') || connectionString.includes('vercel-storage.com') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000
    })
  }

  return pool
}

export async function initPostgresSchema(): Promise<boolean> {
  const p = getPgPool()
  if (!p) return false
  if (isInitialized) return true

  const client = await p.connect()
  try {
    await client.query(`
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

      ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);
      ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS recipient_id VARCHAR(255);
      ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS recipient_avatar TEXT;

      CREATE INDEX IF NOT EXISTS idx_wishlist_items_list_id ON wishlist_items(list_id);
      CREATE INDEX IF NOT EXISTS idx_wishlists_invite_code ON wishlists(invite_code);
    `)
    isInitialized = true
    return true
  } catch (err) {
    console.error('[PostgreSQL] Erreur initialisation schema:', err)
    return false
  } finally {
    client.release()
  }
}

export function mapRowToWishlist(row: any, items: WishlistItem[] = []): Wishlist {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerAvatar: row.owner_avatar || undefined,
    title: row.title,
    description: row.description || undefined,
    category: row.category || 'christmas',
    eventDate: row.event_date || undefined,
    coverEmoji: row.cover_emoji || undefined,
    coverGradient: row.cover_gradient || undefined,
    inviteCode: row.invite_code,
    members: Array.isArray(row.members) ? row.members : (typeof row.members === 'string' ? JSON.parse(row.members) : []),
    isArchived: Boolean(row.is_archived),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    items
  }
}

export function mapRowToWishlistItem(row: any): WishlistItem {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    recipientName: row.recipient_name || undefined,
    recipientId: row.recipient_id || undefined,
    recipientAvatar: row.recipient_avatar || undefined,
    description: row.description || undefined,
    url: row.url || undefined,
    imageUrl: row.image_url || undefined,
    price: row.price != null ? Number(row.price) : undefined,
    currency: row.currency || '€',
    quantity: row.quantity != null ? Number(row.quantity) : 1,
    colorOrVariant: row.color_or_variant || undefined,
    comment: row.comment || undefined,
    isFavorite: Boolean(row.is_favorite),
    priority: row.priority || 'medium',
    isPurchased: Boolean(row.is_purchased),
    purchasedBy: row.purchased_by ? (typeof row.purchased_by === 'string' ? JSON.parse(row.purchased_by) : row.purchased_by) : undefined,
    purchasedAt: row.purchased_at ? new Date(row.purchased_at).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  }
}
