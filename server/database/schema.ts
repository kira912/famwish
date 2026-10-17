import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  jsonb,
  index
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type {
  WishlistCategory,
  WishlistMember,
  WishlistItem,
  PushSubscriptionKeys,
  ListNotificationType
} from '../../types'

export type PurchasedByRecord = NonNullable<WishlistItem['purchasedBy']>
export type WishlistPriority = NonNullable<WishlistItem['priority']>

export const wishlistsTable = pgTable(
  'wishlists',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    ownerId: varchar('owner_id', { length: 255 }).notNull(),
    ownerName: varchar('owner_name', { length: 255 }).notNull(),
    ownerAvatar: text('owner_avatar'),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }).$type<WishlistCategory>().default('christmas').notNull(),
    eventDate: varchar('event_date', { length: 50 }),
    coverEmoji: varchar('cover_emoji', { length: 50 }),
    coverGradient: varchar('cover_gradient', { length: 255 }),
    inviteCode: varchar('invite_code', { length: 100 }).unique().notNull(),
    members: jsonb('members').$type<(string | WishlistMember)[]>().default([]).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    index('idx_wishlists_invite_code').on(table.inviteCode),
    index('idx_wishlists_owner_id').on(table.ownerId)
  ]
)

export const wishlistItemsTable = pgTable(
  'wishlist_items',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    listId: varchar('list_id', { length: 255 })
      .notNull()
      .references(() => wishlistsTable.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    recipientName: varchar('recipient_name', { length: 255 }),
    recipientId: varchar('recipient_id', { length: 255 }),
    recipientAvatar: text('recipient_avatar'),
    description: text('description'),
    url: text('url'),
    imageUrl: text('image_url'),
    price: numeric('price', { precision: 10, scale: 2 }),
    currency: varchar('currency', { length: 10 }).default('€').notNull(),
    quantity: integer('quantity').default(1).notNull(),
    colorOrVariant: varchar('color_or_variant', { length: 255 }),
    comment: text('comment'),
    isFavorite: boolean('is_favorite').default(false).notNull(),
    priority: varchar('priority', { length: 20 }).$type<WishlistPriority>().default('medium').notNull(),
    isPurchased: boolean('is_purchased').default(false).notNull(),
    purchasedBy: jsonb('purchased_by').$type<PurchasedByRecord | null>(),
    purchasedAt: timestamp('purchased_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    index('idx_wishlist_items_list_id').on(table.listId)
  ]
)

export const pushSubscriptionsTable = pgTable(
  'push_subscriptions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    listId: varchar('list_id', { length: 255 })
      .notNull()
      .references(() => wishlistsTable.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }).notNull(),
    userName: varchar('user_name', { length: 255 }).notNull(),
    userAvatar: text('user_avatar'),
    endpoint: text('endpoint'),
    keys: jsonb('keys').$type<PushSubscriptionKeys | null>(),
    enabled: boolean('enabled').default(true).notNull(),
    notifyOnAdd: boolean('notify_on_add').default(true).notNull(),
    notifyOnReserve: boolean('notify_on_reserve').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    index('idx_push_subscriptions_list_id').on(table.listId),
    index('idx_push_subscriptions_user_id').on(table.userId)
  ]
)

export const listNotificationsTable = pgTable(
  'list_notifications',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    listId: varchar('list_id', { length: 255 })
      .notNull()
      .references(() => wishlistsTable.id, { onDelete: 'cascade' }),
    listTitle: varchar('list_title', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).$type<ListNotificationType>().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    itemId: varchar('item_id', { length: 255 }).notNull(),
    itemTitle: varchar('item_title', { length: 255 }).notNull(),
    recipientName: varchar('recipient_name', { length: 255 }),
    recipientId: varchar('recipient_id', { length: 255 }),
    isChildRecipient: boolean('is_child_recipient').default(false).notNull(),
    actorId: varchar('actor_id', { length: 255 }),
    actorName: varchar('actor_name', { length: 255 }),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    index('idx_list_notifications_list_id').on(table.listId)
  ]
)

export const wishlistsRelations = relations(wishlistsTable, ({ many }) => ({
  items: many(wishlistItemsTable),
  pushSubscriptions: many(pushSubscriptionsTable),
  notifications: many(listNotificationsTable)
}))

export const wishlistItemsRelations = relations(wishlistItemsTable, ({ one }) => ({
  wishlist: one(wishlistsTable, {
    fields: [wishlistItemsTable.listId],
    references: [wishlistsTable.id]
  })
}))

export const pushSubscriptionsRelations = relations(pushSubscriptionsTable, ({ one }) => ({
  wishlist: one(wishlistsTable, {
    fields: [pushSubscriptionsTable.listId],
    references: [wishlistsTable.id]
  })
}))

export const listNotificationsRelations = relations(listNotificationsTable, ({ one }) => ({
  wishlist: one(wishlistsTable, {
    fields: [listNotificationsTable.listId],
    references: [wishlistsTable.id]
  })
}))

export type WishlistRow = typeof wishlistsTable.$inferSelect
export type NewWishlistRow = typeof wishlistsTable.$inferInsert
export type WishlistItemRow = typeof wishlistItemsTable.$inferSelect
export type NewWishlistItemRow = typeof wishlistItemsTable.$inferInsert
export type PushSubscriptionRow = typeof pushSubscriptionsTable.$inferSelect
export type NewPushSubscriptionRow = typeof pushSubscriptionsTable.$inferInsert
export type ListNotificationRow = typeof listNotificationsTable.$inferSelect
export type NewListNotificationRow = typeof listNotificationsTable.$inferInsert
