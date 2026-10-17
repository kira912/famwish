import type {
  Wishlist,
  WishlistItem,
  WishlistMember,
  WishlistCategory,
  PushSubscriptionRecord,
  ListNotificationEvent,
  ListNotificationType
} from '../../types'
import type {
  WishlistRow,
  NewWishlistRow,
  WishlistItemRow,
  NewWishlistItemRow,
  PushSubscriptionRow,
  NewPushSubscriptionRow,
  ListNotificationRow,
  NewListNotificationRow
} from './schema'

function toIsoString(value: Date | string | null | undefined, fallbackNow = true): string | undefined {
  if (!value) {
    return fallbackNow ? new Date().toISOString() : undefined
  }
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime())
    ? (fallbackNow ? new Date().toISOString() : undefined)
    : date.toISOString()
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return value as T
}

/**
 * Maps a Drizzle WishlistRow (or raw PostgreSQL row) to the domain Wishlist entity.
 */
export function mapRowToWishlist(
  row: WishlistRow | Record<string, unknown>,
  items: WishlistItem[] = []
): Wishlist {
  const r = row as Partial<WishlistRow> & Record<string, unknown>

  const rawMembers = r.members
  const parsedMembers = parseJsonField<(string | WishlistMember)[]>(rawMembers, [])
  const members = Array.isArray(parsedMembers) ? parsedMembers : []

  const ownerId = String(r.ownerId ?? r.owner_id ?? '')
  const ownerName = String(r.ownerName ?? r.owner_name ?? '')
  const ownerAvatar = (r.ownerAvatar ?? r.owner_avatar) as string | null | undefined
  const eventDate = (r.eventDate ?? r.event_date) as string | null | undefined
  const coverEmoji = (r.coverEmoji ?? r.cover_emoji) as string | null | undefined
  const coverGradient = (r.coverGradient ?? r.cover_gradient) as string | null | undefined
  const inviteCode = String(r.inviteCode ?? r.invite_code ?? '')
  const isArchived = Boolean(r.isArchived ?? r.is_archived ?? false)
  const createdAt = toIsoString((r.createdAt ?? r.created_at) as Date | string | undefined, true)!
  const updatedAt = toIsoString((r.updatedAt ?? r.updated_at) as Date | string | undefined, true)!

  return {
    id: String(r.id),
    ownerId,
    ownerName,
    ownerAvatar: ownerAvatar || undefined,
    title: String(r.title ?? ''),
    description: (r.description as string | null | undefined) || undefined,
    category: ((r.category as WishlistCategory | null | undefined) || 'christmas'),
    eventDate: eventDate || undefined,
    coverEmoji: coverEmoji || undefined,
    coverGradient: coverGradient || undefined,
    inviteCode,
    members,
    isArchived,
    createdAt,
    updatedAt,
    items
  }
}

/**
 * Maps a Drizzle WishlistItemRow (or raw PostgreSQL row) to the domain WishlistItem entity.
 */
export function mapRowToWishlistItem(
  row: WishlistItemRow | Record<string, unknown>
): WishlistItem {
  const r = row as Partial<WishlistItemRow> & Record<string, unknown>

  const rawPrice = r.price
  const parsedPrice = rawPrice !== null && rawPrice !== undefined ? Number(rawPrice) : undefined
  const price = parsedPrice !== undefined && !Number.isNaN(parsedPrice) ? parsedPrice : undefined

  const rawQuantity = r.quantity
  const parsedQuantity = rawQuantity !== null && rawQuantity !== undefined ? Number(rawQuantity) : 1
  const quantity = !Number.isNaN(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1

  const rawPurchasedBy = r.purchasedBy ?? r.purchased_by
  const purchasedBy = parseJsonField<WishlistItem['purchasedBy'] | undefined>(rawPurchasedBy, undefined)

  const listId = String(r.listId ?? r.list_id ?? '')
  const recipientName = (r.recipientName ?? r.recipient_name) as string | null | undefined
  const recipientId = (r.recipientId ?? r.recipient_id) as string | null | undefined
  const recipientAvatar = (r.recipientAvatar ?? r.recipient_avatar) as string | null | undefined
  const imageUrl = (r.imageUrl ?? r.image_url) as string | null | undefined
  const colorOrVariant = (r.colorOrVariant ?? r.color_or_variant) as string | null | undefined
  const isFavorite = Boolean(r.isFavorite ?? r.is_favorite ?? false)
  const isPurchased = Boolean(r.isPurchased ?? r.is_purchased ?? false)
  const purchasedAt = toIsoString((r.purchasedAt ?? r.purchased_at) as Date | string | undefined, false)
  const createdAt = toIsoString((r.createdAt ?? r.created_at) as Date | string | undefined, true)!
  const updatedAt = toIsoString((r.updatedAt ?? r.updated_at) as Date | string | undefined, true)!

  return {
    id: String(r.id),
    listId,
    title: String(r.title ?? ''),
    recipientName: recipientName || undefined,
    recipientId: recipientId || undefined,
    recipientAvatar: recipientAvatar || undefined,
    description: (r.description as string | null | undefined) || undefined,
    url: (r.url as string | null | undefined) || undefined,
    imageUrl: imageUrl || undefined,
    price,
    currency: String(r.currency || '€'),
    quantity,
    colorOrVariant: colorOrVariant || undefined,
    comment: (r.comment as string | null | undefined) || undefined,
    isFavorite,
    priority: ((r.priority as WishlistItem['priority'] | null | undefined) || 'medium'),
    isPurchased,
    purchasedBy: purchasedBy || undefined,
    purchasedAt,
    createdAt,
    updatedAt
  }
}

/**
 * Maps a domain Wishlist entity to a Drizzle NewWishlistRow payload for insert/upsert.
 */
export function mapWishlistToRow(list: Wishlist, now: Date = new Date()): NewWishlistRow {
  return {
    id: list.id,
    ownerId: list.ownerId,
    ownerName: list.ownerName,
    ownerAvatar: list.ownerAvatar ?? null,
    title: list.title,
    description: list.description ?? null,
    category: list.category || 'christmas',
    eventDate: list.eventDate ?? null,
    coverEmoji: list.coverEmoji ?? null,
    coverGradient: list.coverGradient ?? null,
    inviteCode: list.inviteCode,
    members: Array.isArray(list.members) ? list.members : [],
    isArchived: Boolean(list.isArchived),
    createdAt: list.createdAt ? new Date(list.createdAt) : now,
    updatedAt: now
  }
}

/**
 * Maps a domain WishlistItem entity to a Drizzle NewWishlistItemRow payload for insert/upsert.
 */
export function mapWishlistItemToRow(
  listId: string,
  item: WishlistItem,
  now: Date = new Date()
): NewWishlistItemRow {
  return {
    id: item.id,
    listId,
    title: item.title,
    recipientName: item.recipientName ?? null,
    recipientId: item.recipientId ?? null,
    recipientAvatar: item.recipientAvatar ?? null,
    description: item.description ?? null,
    url: item.url ?? null,
    imageUrl: item.imageUrl ?? null,
    price: item.price !== undefined && item.price !== null ? String(item.price) : null,
    currency: item.currency || '€',
    quantity: item.quantity ?? 1,
    colorOrVariant: item.colorOrVariant ?? null,
    comment: item.comment ?? null,
    isFavorite: Boolean(item.isFavorite),
    priority: item.priority || 'medium',
    isPurchased: Boolean(item.isPurchased),
    purchasedBy: item.purchasedBy ?? null,
    purchasedAt: item.purchasedAt ? new Date(item.purchasedAt) : null,
    createdAt: item.createdAt ? new Date(item.createdAt) : now,
    updatedAt: now
  }
}

export function mapRowToPushSubscription(
  row: PushSubscriptionRow | Record<string, unknown>
): PushSubscriptionRecord {
  const r = row as Partial<PushSubscriptionRow> & Record<string, unknown>
  const rawKeys = r.keys
  const keys = parseJsonField<PushSubscriptionRecord['keys'] | undefined>(rawKeys, undefined)
  const listId = String(r.listId ?? r.list_id ?? '')
  const userId = String(r.userId ?? r.user_id ?? '')
  const userName = String(r.userName ?? r.user_name ?? '')
  const userAvatar = (r.userAvatar ?? r.user_avatar) as string | null | undefined
  const endpoint = (r.endpoint as string | null | undefined) || undefined
  const enabled = r.enabled !== undefined ? Boolean(r.enabled) : true
  const notifyOnAdd = (r.notifyOnAdd ?? r.notify_on_add) !== undefined ? Boolean(r.notifyOnAdd ?? r.notify_on_add) : true
  const notifyOnReserve = (r.notifyOnReserve ?? r.notify_on_reserve) !== undefined ? Boolean(r.notifyOnReserve ?? r.notify_on_reserve) : true
  const createdAt = toIsoString((r.createdAt ?? r.created_at) as Date | string | undefined, true)!
  const updatedAt = toIsoString((r.updatedAt ?? r.updated_at) as Date | string | undefined, true)!

  return {
    id: String(r.id),
    listId,
    userId,
    userName,
    userAvatar: userAvatar || undefined,
    endpoint,
    keys: keys || undefined,
    enabled,
    notifyOnAdd,
    notifyOnReserve,
    createdAt,
    updatedAt
  }
}

export function mapPushSubscriptionToRow(
  sub: PushSubscriptionRecord,
  now: Date = new Date()
): NewPushSubscriptionRow {
  return {
    id: sub.id,
    listId: sub.listId,
    userId: sub.userId,
    userName: sub.userName,
    userAvatar: sub.userAvatar ?? null,
    endpoint: sub.endpoint ?? null,
    keys: sub.keys ?? null,
    enabled: Boolean(sub.enabled),
    notifyOnAdd: Boolean(sub.notifyOnAdd),
    notifyOnReserve: Boolean(sub.notifyOnReserve),
    createdAt: sub.createdAt ? new Date(sub.createdAt) : now,
    updatedAt: now
  }
}

export function mapRowToListNotification(
  row: ListNotificationRow | Record<string, unknown>
): ListNotificationEvent {
  const r = row as Partial<ListNotificationRow> & Record<string, unknown>
  const listId = String(r.listId ?? r.list_id ?? '')
  const listTitle = String(r.listTitle ?? r.list_title ?? '')
  const type = ((r.type as ListNotificationType) || 'item_added')
  const itemId = String(r.itemId ?? r.item_id ?? '')
  const itemTitle = String(r.itemTitle ?? r.item_title ?? '')
  const recipientName = (r.recipientName ?? r.recipient_name) as string | null | undefined
  const recipientId = (r.recipientId ?? r.recipient_id) as string | null | undefined
  const isChildRecipient = Boolean(r.isChildRecipient ?? r.is_child_recipient ?? false)
  const actorId = (r.actorId ?? r.actor_id) as string | null | undefined
  const actorName = (r.actorName ?? r.actor_name) as string | null | undefined
  const isAnonymous = Boolean(r.isAnonymous ?? r.is_anonymous ?? false)
  const createdAt = toIsoString((r.createdAt ?? r.created_at) as Date | string | undefined, true)!

  return {
    id: String(r.id),
    listId,
    listTitle,
    type,
    title: String(r.title ?? ''),
    body: String(r.body ?? ''),
    itemId,
    itemTitle,
    recipientName: recipientName || undefined,
    recipientId: recipientId || undefined,
    isChildRecipient,
    actorId: actorId || undefined,
    actorName: actorName || undefined,
    isAnonymous,
    createdAt
  }
}

export function mapListNotificationToRow(
  notif: ListNotificationEvent,
  now: Date = new Date()
): NewListNotificationRow {
  return {
    id: notif.id,
    listId: notif.listId,
    listTitle: notif.listTitle,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    itemId: notif.itemId,
    itemTitle: notif.itemTitle,
    recipientName: notif.recipientName ?? null,
    recipientId: notif.recipientId ?? null,
    isChildRecipient: Boolean(notif.isChildRecipient),
    actorId: notif.actorId ?? null,
    actorName: notif.actorName ?? null,
    isAnonymous: Boolean(notif.isAnonymous),
    createdAt: notif.createdAt ? new Date(notif.createdAt) : now
  }
}
