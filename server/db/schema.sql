-- =============================================================================
-- FamWish - PostgreSQL Database Schema (Vercel Postgres / Neon / Supabase)
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_wishlist_items_list_id ON wishlist_items(list_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_invite_code ON wishlists(invite_code);
