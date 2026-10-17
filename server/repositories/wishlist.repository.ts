import { and, asc, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm'
import type {
  Wishlist,
  WishlistItem,
  WishlistMember,
  PushSubscriptionRecord,
  ListNotificationEvent
} from '../../types'
import { getReadyDrizzleDb, type DrizzleDatabase } from '../database/client'
import {
  wishlistsTable,
  wishlistItemsTable,
  pushSubscriptionsTable,
  listNotificationsTable
} from '../database/schema'
import {
  mapRowToWishlist,
  mapRowToWishlistItem,
  mapWishlistToRow,
  mapWishlistItemToRow,
  mapRowToPushSubscription,
  mapPushSubscriptionToRow,
  mapRowToListNotification,
  mapListNotificationToRow
} from '../database/mappers'

export interface UserListFilterCriteria {
  userId: string | null
  joinedIds: string[]
  joinedInviteCodes: string[]
}

export interface ItemPurchaseUpdate {
  isPurchased: boolean
  purchasedBy?: WishlistItem['purchasedBy']
  purchasedAt?: Date | null
  updatedAt: Date
}

/**
 * Port / Contract for Wishlist persistence operations.
 * Decouples domain business logic from the underlying storage engine (PostgreSQL via Drizzle vs. In-Memory).
 */
export interface IWishlistRepository {
  findForUser(criteria: UserListFilterCriteria): Promise<Wishlist[]>
  findByIdOrCode(idOrCode: string): Promise<Wishlist | null>
  upsertList(list: Wishlist): Promise<Wishlist>
  deleteList(id: string): Promise<boolean>
  updateMembers(listId: string, members: (string | WishlistMember)[], updatedAt?: Date): Promise<Wishlist | null>
  upsertItem(listId: string, item: WishlistItem): Promise<WishlistItem>
  deleteItem(listId: string, itemId: string): Promise<boolean>
  updateItemPurchase(listId: string, itemId: string, update: ItemPurchaseUpdate): Promise<WishlistItem | null>
  upsertPushSubscription(sub: PushSubscriptionRecord): Promise<PushSubscriptionRecord>
  getPushSubscriptionsForList(listId: string): Promise<PushSubscriptionRecord[]>
  deletePushSubscription(listId: string, userId: string): Promise<boolean>
  createNotification(notification: ListNotificationEvent): Promise<ListNotificationEvent>
  getNotificationsForList(listId: string, limit?: number): Promise<ListNotificationEvent[]>
}

/**
 * PostgreSQL Repository implementation powered by Drizzle ORM.
 */
export class DrizzleWishlistRepository implements IWishlistRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async findForUser(criteria: UserListFilterCriteria): Promise<Wishlist[]> {
    const conditions: SQL[] = []

    if (criteria.userId) {
      const escapedPattern = `%${criteria.userId}%`
      conditions.push(
        eq(wishlistsTable.ownerId, criteria.userId),
        sql`${wishlistsTable.members}::text ILIKE ${escapedPattern}`
      )
    }

    if (criteria.joinedIds.length > 0) {
      conditions.push(inArray(wishlistsTable.id, criteria.joinedIds))
    }

    if (criteria.joinedInviteCodes.length > 0) {
      conditions.push(
        inArray(sql<string>`UPPER(${wishlistsTable.inviteCode})`, criteria.joinedInviteCodes)
      )
    }

    if (conditions.length === 0) {
      return []
    }

    const listRows = await this.db
      .select()
      .from(wishlistsTable)
      .where(or(...conditions))
      .orderBy(desc(wishlistsTable.createdAt))

    if (listRows.length === 0) {
      return []
    }

    const listIds = listRows.map(row => row.id)
    const itemRows = await this.db
      .select()
      .from(wishlistItemsTable)
      .where(inArray(wishlistItemsTable.listId, listIds))
      .orderBy(asc(wishlistItemsTable.createdAt))

    // Group items by listId in O(N) instead of O(N*M) nested filtering
    const itemsByListId = new Map<string, WishlistItem[]>()
    for (const itemRow of itemRows) {
      const mapped = mapRowToWishlistItem(itemRow)
      const bucket = itemsByListId.get(itemRow.listId)
      if (bucket) {
        bucket.push(mapped)
      } else {
        itemsByListId.set(itemRow.listId, [mapped])
      }
    }

    return listRows.map(row => mapRowToWishlist(row, itemsByListId.get(row.id) ?? []))
  }

  async findByIdOrCode(idOrCode: string): Promise<Wishlist | null> {
    const cleanInput = idOrCode.trim()
    if (!cleanInput) return null

    const [listRow] = await this.db
      .select()
      .from(wishlistsTable)
      .where(
        or(
          eq(wishlistsTable.id, cleanInput),
          eq(sql<string>`UPPER(${wishlistsTable.inviteCode})`, cleanInput.toUpperCase())
        )
      )
      .limit(1)

    if (!listRow) {
      return null
    }

    const itemRows = await this.db
      .select()
      .from(wishlistItemsTable)
      .where(eq(wishlistItemsTable.listId, listRow.id))
      .orderBy(asc(wishlistItemsTable.createdAt))

    return mapRowToWishlist(listRow, itemRows.map(mapRowToWishlistItem))
  }

  async upsertList(list: Wishlist): Promise<Wishlist> {
    const now = new Date()
    const rowPayload = mapWishlistToRow(list, now)

    await this.db.transaction(async (tx) => {
      await tx
        .insert(wishlistsTable)
        .values(rowPayload)
        .onConflictDoUpdate({
          target: wishlistsTable.id,
          set: {
            ownerName: rowPayload.ownerName,
            ownerAvatar: rowPayload.ownerAvatar,
            title: rowPayload.title,
            description: rowPayload.description,
            category: rowPayload.category,
            eventDate: rowPayload.eventDate,
            coverEmoji: rowPayload.coverEmoji,
            coverGradient: rowPayload.coverGradient,
            inviteCode: rowPayload.inviteCode,
            members: rowPayload.members,
            isArchived: rowPayload.isArchived,
            updatedAt: now
          }
        })

      if (Array.isArray(list.items) && list.items.length > 0) {
        for (const item of list.items) {
          const itemPayload = mapWishlistItemToRow(list.id, item, now)
          await tx
            .insert(wishlistItemsTable)
            .values(itemPayload)
            .onConflictDoUpdate({
              target: wishlistItemsTable.id,
              set: {
                title: itemPayload.title,
                recipientName: itemPayload.recipientName,
                recipientId: itemPayload.recipientId,
                recipientAvatar: itemPayload.recipientAvatar,
                description: itemPayload.description,
                url: itemPayload.url,
                imageUrl: itemPayload.imageUrl,
                price: itemPayload.price,
                currency: itemPayload.currency,
                quantity: itemPayload.quantity,
                colorOrVariant: itemPayload.colorOrVariant,
                comment: itemPayload.comment,
                isFavorite: itemPayload.isFavorite,
                priority: itemPayload.priority,
                isPurchased: itemPayload.isPurchased,
                purchasedBy: itemPayload.purchasedBy,
                purchasedAt: itemPayload.purchasedAt,
                updatedAt: now
              }
            })
        }
      }
    })

    const refreshed = await this.findByIdOrCode(list.id)
    return refreshed ?? { ...list, updatedAt: now.toISOString() }
  }

  async deleteList(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(wishlistsTable)
      .where(eq(wishlistsTable.id, id))
      .returning({ id: wishlistsTable.id })

    return deleted.length > 0
  }

  async updateMembers(
    listId: string,
    members: (string | WishlistMember)[],
    updatedAt: Date = new Date()
  ): Promise<Wishlist | null> {
    await this.db
      .update(wishlistsTable)
      .set({
        members,
        updatedAt
      })
      .where(eq(wishlistsTable.id, listId))

    return this.findByIdOrCode(listId)
  }

  async upsertItem(listId: string, item: WishlistItem): Promise<WishlistItem> {
    const now = new Date()
    const itemPayload = mapWishlistItemToRow(listId, item, now)

    const [savedRow] = await this.db
      .insert(wishlistItemsTable)
      .values(itemPayload)
      .onConflictDoUpdate({
        target: wishlistItemsTable.id,
        set: {
          title: itemPayload.title,
          recipientName: itemPayload.recipientName,
          recipientId: itemPayload.recipientId,
          recipientAvatar: itemPayload.recipientAvatar,
          description: itemPayload.description,
          url: itemPayload.url,
          imageUrl: itemPayload.imageUrl,
          price: itemPayload.price,
          currency: itemPayload.currency,
          quantity: itemPayload.quantity,
          colorOrVariant: itemPayload.colorOrVariant,
          comment: itemPayload.comment,
          isFavorite: itemPayload.isFavorite,
          priority: itemPayload.priority,
          isPurchased: itemPayload.isPurchased,
          purchasedBy: itemPayload.purchasedBy,
          purchasedAt: itemPayload.purchasedAt,
          updatedAt: now
        }
      })
      .returning()

    return mapRowToWishlistItem(savedRow)
  }

  async deleteItem(listId: string, itemId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(wishlistItemsTable)
      .where(
        and(
          eq(wishlistItemsTable.id, itemId),
          eq(wishlistItemsTable.listId, listId)
        )
      )
      .returning({ id: wishlistItemsTable.id })

    return deleted.length > 0
  }

  async updateItemPurchase(
    listId: string,
    itemId: string,
    update: ItemPurchaseUpdate
  ): Promise<WishlistItem | null> {
    const [updatedRow] = await this.db
      .update(wishlistItemsTable)
      .set({
        isPurchased: update.isPurchased,
        purchasedBy: update.purchasedBy ?? null,
        purchasedAt: update.purchasedAt ?? null,
        updatedAt: update.updatedAt
      })
      .where(
        and(
          eq(wishlistItemsTable.id, itemId),
          eq(wishlistItemsTable.listId, listId)
        )
      )
      .returning()

    if (!updatedRow) return null
    return mapRowToWishlistItem(updatedRow)
  }

  async upsertPushSubscription(sub: PushSubscriptionRecord): Promise<PushSubscriptionRecord> {
    const now = new Date()
    const rowPayload = mapPushSubscriptionToRow(sub, now)

    const [savedRow] = await this.db
      .insert(pushSubscriptionsTable)
      .values(rowPayload)
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.id,
        set: {
          userName: rowPayload.userName,
          userAvatar: rowPayload.userAvatar,
          endpoint: rowPayload.endpoint,
          keys: rowPayload.keys,
          enabled: rowPayload.enabled,
          notifyOnAdd: rowPayload.notifyOnAdd,
          notifyOnReserve: rowPayload.notifyOnReserve,
          updatedAt: now
        }
      })
      .returning()

    return mapRowToPushSubscription(savedRow)
  }

  async getPushSubscriptionsForList(listId: string): Promise<PushSubscriptionRecord[]> {
    const rows = await this.db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.listId, listId))
      .orderBy(desc(pushSubscriptionsTable.updatedAt))

    return rows.map(mapRowToPushSubscription)
  }

  async deletePushSubscription(listId: string, userId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(pushSubscriptionsTable)
      .where(
        and(
          eq(pushSubscriptionsTable.listId, listId),
          eq(pushSubscriptionsTable.userId, userId)
        )
      )
      .returning({ id: pushSubscriptionsTable.id })

    return deleted.length > 0
  }

  async createNotification(notification: ListNotificationEvent): Promise<ListNotificationEvent> {
    const now = new Date()
    const rowPayload = mapListNotificationToRow(notification, now)

    const [savedRow] = await this.db
      .insert(listNotificationsTable)
      .values(rowPayload)
      .onConflictDoUpdate({
        target: listNotificationsTable.id,
        set: {
          title: rowPayload.title,
          body: rowPayload.body
        }
      })
      .returning()

    return mapRowToListNotification(savedRow)
  }

  async getNotificationsForList(listId: string, limit: number = 30): Promise<ListNotificationEvent[]> {
    const rows = await this.db
      .select()
      .from(listNotificationsTable)
      .where(eq(listNotificationsTable.listId, listId))
      .orderBy(desc(listNotificationsTable.createdAt))
      .limit(limit)

    return rows.map(mapRowToListNotification)
  }
}

/**
 * In-Memory Repository fallback when PostgreSQL is not configured (local dev / unit & E2E tests).
 */
export class InMemoryWishlistRepository implements IWishlistRepository {
  private store: Wishlist[] = []
  private pushSubscriptions: PushSubscriptionRecord[] = []
  private notifications: ListNotificationEvent[] = []

  async findForUser(criteria: UserListFilterCriteria): Promise<Wishlist[]> {
    const { userId, joinedIds, joinedInviteCodes } = criteria
    if (!userId && joinedIds.length === 0 && joinedInviteCodes.length === 0) {
      return []
    }

    const lowerUserId = userId?.toLowerCase() ?? null
    const lowerJoinedIds = new Set(joinedIds.map(id => id.toLowerCase()))
    const upperCodes = new Set(joinedInviteCodes.map(code => code.toUpperCase()))

    return this.store.filter((list) => {
      const isOwner = Boolean(userId && list.ownerId === userId)

      const isMember = Boolean(
        userId &&
          lowerUserId &&
          Array.isArray(list.members) &&
          list.members.some((m) => {
            if (typeof m === 'string') {
              return m === userId || m.toLowerCase() === lowerUserId
            }
            return (
              m?.id === userId ||
              Boolean(m?.name && m.name.toLowerCase() === lowerUserId)
            )
          })
      )

      const isJoined =
        lowerJoinedIds.has(list.id.toLowerCase()) ||
        upperCodes.has(list.inviteCode.toUpperCase())

      return isOwner || isMember || isJoined
    })
  }

  async findByIdOrCode(idOrCode: string): Promise<Wishlist | null> {
    const clean = idOrCode.trim()
    if (!clean) return null
    const upper = clean.toUpperCase()

    const found = this.store.find(
      list => list.id === clean || list.inviteCode.toUpperCase() === upper
    )
    return found ?? null
  }

  async upsertList(list: Wishlist): Promise<Wishlist> {
    const nowIso = new Date().toISOString()
    const normalized: Wishlist = {
      ...list,
      items: Array.isArray(list.items) ? [...list.items] : [],
      members: Array.isArray(list.members) ? [...list.members] : [],
      updatedAt: nowIso
    }

    const index = this.store.findIndex(l => l.id === list.id)
    if (index >= 0) {
      this.store[index] = normalized
      return this.store[index]
    }

    this.store.unshift(normalized)
    return normalized
  }

  async deleteList(id: string): Promise<boolean> {
    const index = this.store.findIndex(l => l.id === id)
    this.pushSubscriptions = this.pushSubscriptions.filter(s => s.listId !== id)
    this.notifications = this.notifications.filter(n => n.listId !== id)
    if (index < 0) return false
    this.store.splice(index, 1)
    return true
  }

  async updateMembers(
    listId: string,
    members: (string | WishlistMember)[],
    updatedAt: Date = new Date()
  ): Promise<Wishlist | null> {
    const target = this.store.find(l => l.id === listId)
    if (!target) return null

    target.members = [...members]
    target.updatedAt = updatedAt.toISOString()
    return target
  }

  async upsertItem(listId: string, item: WishlistItem): Promise<WishlistItem> {
    const target = this.store.find(l => l.id === listId)
    if (!target) {
      throw new Error(`Wishlist ${listId} not found`)
    }

    const nowIso = new Date().toISOString()
    const updatedItem: WishlistItem = {
      ...item,
      listId,
      updatedAt: nowIso
    }

    const idx = target.items.findIndex(i => i.id === item.id)
    if (idx >= 0) {
      target.items[idx] = updatedItem
    } else {
      target.items.unshift(updatedItem)
    }
    target.updatedAt = nowIso

    return updatedItem
  }

  async deleteItem(listId: string, itemId: string): Promise<boolean> {
    const target = this.store.find(l => l.id === listId)
    if (!target) return false

    const idx = target.items.findIndex(i => i.id === itemId)
    if (idx < 0) return false

    target.items.splice(idx, 1)
    target.updatedAt = new Date().toISOString()
    return true
  }

  async updateItemPurchase(
    listId: string,
    itemId: string,
    update: ItemPurchaseUpdate
  ): Promise<WishlistItem | null> {
    const target = this.store.find(l => l.id === listId)
    if (!target) return null

    const item = target.items.find(i => i.id === itemId)
    if (!item) return null

    const nowIso = update.updatedAt.toISOString()
    item.isPurchased = update.isPurchased
    if (update.isPurchased) {
      item.purchasedAt = (update.purchasedAt ?? update.updatedAt).toISOString()
      item.purchasedBy = update.purchasedBy
    } else {
      item.purchasedAt = undefined
      item.purchasedBy = undefined
    }
    item.updatedAt = nowIso
    target.updatedAt = nowIso

    return item
  }

  async upsertPushSubscription(sub: PushSubscriptionRecord): Promise<PushSubscriptionRecord> {
    const nowIso = new Date().toISOString()
    const normalized: PushSubscriptionRecord = {
      ...sub,
      updatedAt: nowIso,
      createdAt: sub.createdAt || nowIso
    }

    const idx = this.pushSubscriptions.findIndex(
      s => s.id === sub.id || (s.listId === sub.listId && s.userId === sub.userId)
    )
    if (idx >= 0) {
      this.pushSubscriptions[idx] = {
        ...this.pushSubscriptions[idx],
        ...normalized,
        id: this.pushSubscriptions[idx].id
      }
      return this.pushSubscriptions[idx]
    }

    this.pushSubscriptions.unshift(normalized)
    return normalized
  }

  async getPushSubscriptionsForList(listId: string): Promise<PushSubscriptionRecord[]> {
    return this.pushSubscriptions.filter(s => s.listId === listId)
  }

  async deletePushSubscription(listId: string, userId: string): Promise<boolean> {
    const lowerUser = userId.trim().toLowerCase()
    const before = this.pushSubscriptions.length
    this.pushSubscriptions = this.pushSubscriptions.filter(
      s => !(s.listId === listId && (s.userId === userId || s.userId.toLowerCase() === lowerUser || s.userName.toLowerCase() === lowerUser))
    )
    return this.pushSubscriptions.length < before
  }

  async createNotification(notification: ListNotificationEvent): Promise<ListNotificationEvent> {
    const normalized: ListNotificationEvent = {
      ...notification,
      createdAt: notification.createdAt || new Date().toISOString()
    }
    this.notifications.unshift(normalized)
    return normalized
  }

  async getNotificationsForList(listId: string, limit: number = 30): Promise<ListNotificationEvent[]> {
    return this.notifications
      .filter(n => n.listId === listId)
      .slice(0, limit)
  }
}

const inMemoryRepositorySingleton = new InMemoryWishlistRepository()

/**
 * Resolves the active WishlistRepository strategy (Drizzle PostgreSQL if configured, otherwise In-Memory).
 */
export async function resolveWishlistRepository(): Promise<IWishlistRepository> {
  const drizzleDb = await getReadyDrizzleDb()
  if (drizzleDb) {
    return new DrizzleWishlistRepository(drizzleDb)
  }
  return inMemoryRepositorySingleton
}
