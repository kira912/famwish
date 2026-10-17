import type {
  Wishlist,
  WishlistItem,
  PushSubscriptionRecord,
  ListNotificationEvent
} from '../../types'
import {
  wishlistService,
  mergeMembersList,
  shouldMemberReceiveNotification,
  type AddMemberInput,
  type SaveItemActorInput,
  type SubscribePushInput
} from '../services/wishlist.service'

export { mergeMembersList, shouldMemberReceiveNotification, wishlistService }
export type { AddMemberInput, SaveItemActorInput, SubscribePushInput }

/**
 * Fetch wishlists for a specific user (owned lists + member lists + joined lists).
 */
export async function getLists(userId?: string, joinedIds: string[] = []): Promise<Wishlist[]> {
  return wishlistService.getLists(userId, joinedIds)
}

/**
 * Fetch a single wishlist by its ID or Invite Code (case-insensitive).
 */
export async function getListById(idOrCode: string): Promise<Wishlist | null> {
  return wishlistService.getListById(idOrCode)
}

/**
 * Create or update a wishlist while preserving joined members and ensuring the owner is registered.
 */
export async function saveList(list: Wishlist): Promise<Wishlist> {
  return wishlistService.saveList(list)
}

/**
 * Delete a wishlist by ID (cascading to its items).
 */
export async function deleteList(id: string): Promise<boolean> {
  return wishlistService.deleteList(id)
}

/**
 * Add or update an adult or child member on a wishlist.
 */
export async function addMemberToList(
  listIdOrCode: string,
  member: AddMemberInput
): Promise<Wishlist | null> {
  return wishlistService.addMemberToList(listIdOrCode, member)
}

/**
 * Remove a member (e.g. a child profile or relative) from a wishlist by ID or name.
 */
export async function removeMemberFromList(
  listIdOrCode: string,
  memberIdOrName: string
): Promise<Wishlist | null> {
  return wishlistService.removeMemberFromList(listIdOrCode, memberIdOrName)
}

/**
 * Create or update a gift item inside a wishlist.
 */
export async function saveItem(
  listIdOrCode: string,
  item: WishlistItem,
  actor?: SaveItemActorInput
): Promise<WishlistItem | null> {
  return wishlistService.saveItem(listIdOrCode, item, actor)
}

/**
 * Delete a gift item from a wishlist.
 */
export async function deleteItem(listIdOrCode: string, itemId: string): Promise<boolean> {
  return wishlistService.deleteItem(listIdOrCode, itemId)
}

/**
 * Toggle gift item reservation/purchase state (supports secret/anonymous Santa mode).
 */
export async function togglePurchaseItem(
  listIdOrCode: string,
  itemId: string,
  purchased: boolean,
  purchaserName?: string,
  anonymous: boolean = true,
  userId?: string
): Promise<WishlistItem | null> {
  return wishlistService.togglePurchaseItem(
    listIdOrCode,
    itemId,
    purchased,
    purchaserName,
    anonymous,
    userId
  )
}

/**
 * Subscribe a list member to push notifications for gift additions and reservations.
 */
export async function subscribeMemberToPush(
  listIdOrCode: string,
  input: SubscribePushInput
): Promise<PushSubscriptionRecord | null> {
  return wishlistService.subscribeMemberToPush(listIdOrCode, input)
}

/**
 * Unsubscribe a list member from push notifications.
 */
export async function unsubscribeMemberFromPush(
  listIdOrCode: string,
  userId: string
): Promise<boolean> {
  return wishlistService.unsubscribeMemberFromPush(listIdOrCode, userId)
}

/**
 * Retrieve filtered notifications and push subscription status for a list member.
 */
export async function getListNotificationsForMember(
  listIdOrCode: string,
  viewer: { userId?: string; userName?: string; since?: string } = {}
): Promise<{
  notifications: ListNotificationEvent[]
  subscriptions: PushSubscriptionRecord[]
  mySubscription: PushSubscriptionRecord | null
}> {
  return wishlistService.getListNotificationsForMember(listIdOrCode, viewer)
}
