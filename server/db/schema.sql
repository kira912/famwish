-- =============================================================================
-- FamWish - PostgreSQL Database Schema (Vercel Postgres / Neon / Supabase)
-- Managed via Drizzle ORM (server/database/schema.ts)
-- =============================================================================

CREATE TABLE IF NOT EXISTS wishlists (
  id VARCHAR(255) PRIMARY KEY,
  owner_id VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  owner_avatar TEXT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'christmas' NOT NULL,
  event_date VARCHAR(50),
  cover_emoji VARCHAR(50),
  cover_gradient VARCHAR(255),
  invite_code VARCHAR(100) UNIQUE NOT NULL,
  members JSONB DEFAULT '[]'::jsonb NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
  currency VARCHAR(10) DEFAULT '€' NOT NULL,
  quantity INT DEFAULT 1 NOT NULL,
  color_or_variant VARCHAR(255),
  comment TEXT,
  is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' NOT NULL,
  is_purchased BOOLEAN DEFAULT FALSE NOT NULL,
  purchased_by JSONB,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_list_id ON wishlist_items(list_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_invite_code ON wishlists(invite_code);
CREATE INDEX IF NOT EXISTS idx_wishlists_owner_id ON wishlists(owner_id);
