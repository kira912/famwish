import type {
  Wishlist,
  WishlistItem,
  WishlistMember,
  PushSubscriptionRecord,
  PushSubscriptionKeys,
  ListNotificationEvent
} from '../../types'
import { resolveWishlistRepository, type IWishlistRepository } from '../repositories/wishlist.repository'

export interface AddMemberInput {
  id: string
  name: string
  avatar?: string
  email?: string
  role?: 'owner' | 'member' | 'child'
  isChild?: boolean
  parentId?: string
  parentName?: string
  age?: number
}

export interface TogglePurchaseInput {
  purchased: boolean
  purchaserName?: string
  anonymous?: boolean
  userId?: string
}

export interface SaveItemActorInput {
  id?: string
  name?: string
}

export interface SubscribePushInput {
  userId: string
  userName: string
  userAvatar?: string
  endpoint?: string
  keys?: PushSubscriptionKeys
  enabled?: boolean
  notifyOnAdd?: boolean
  notifyOnReserve?: boolean
}

export interface MemberNotificationCheck {
  userId?: string
  userName?: string
  notifyOnAdd?: boolean
  notifyOnReserve?: boolean
}

export function buildDefaultAvatarUrl(seedName: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seedName.trim())}`
}

/**
 * Determines whether a given list member should receive a specific notification,
 * enforcing actor exclusion and anti-spoiler protection for adult gift reservations.
 */
export function shouldMemberReceiveNotification(
  notification: ListNotificationEvent,
  member: MemberNotificationCheck,
  list?: Wishlist | null
): boolean {
  if (notification.type === 'item_added' && member.notifyOnAdd === false) {
    return false
  }
  if (notification.type === 'item_reserved' && member.notifyOnReserve === false) {
    return false
  }

  const memberId = member.userId?.trim()
  const memberNameLower = member.userName?.trim().toLowerCase()
  const actorId = notification.actorId?.trim()
  const actorNameLower = notification.actorName?.trim().toLowerCase()

  // 1. Do not notify the person who performed the action
  if (memberId && actorId && memberId === actorId) {
    return false
  }
  if (
    !notification.isAnonymous &&
    memberNameLower &&
    actorNameLower &&
    memberNameLower === actorNameLower
  ) {
    return false
  }

  // 2. Anti-Spoiler Rule: Never notify an adult recipient when their own gift is reserved
  if (notification.type === 'item_reserved' && !notification.isChildRecipient) {
    const recId = notification.recipientId?.trim()
    const recNameLower = (notification.recipientName || list?.ownerName || '').trim().toLowerCase()

    if (memberId && recId && memberId === recId) {
      return false
    }
    if (memberNameLower && recNameLower && memberNameLower === recNameLower) {
      return false
    }
    if (
      list &&
      memberId &&
      list.ownerId === memberId &&
      (!notification.recipientName || recNameLower === list.ownerName.trim().toLowerCase())
    ) {
      return false
    }
  }

  return true
}

/**
 * Pure domain helper that merges existing and incoming members without losing joined relatives or children,
 * upgrading plain string IDs to rich WishlistMember objects when available.
 */
export function mergeMembersList(
  existingMembers: (string | WishlistMember)[] = [],
  incomingMembers: (string | WishlistMember)[] = []
): (string | WishlistMember)[] {
  const result: (string | WishlistMember)[] = []
  const combined = [...existingMembers, ...incomingMembers]

  for (const candidate of combined) {
    if (!candidate) continue

    if (typeof candidate === 'string') {
      const cleanStr = candidate.trim()
      if (!cleanStr) continue
      const lowerStr = cleanStr.toLowerCase()

      const alreadyExists = result.some((entry) => {
        if (typeof entry === 'string') {
          return entry.toLowerCase() === lowerStr
        }
        return (
          entry.id === cleanStr ||
          Boolean(entry.name && entry.name.toLowerCase() === lowerStr)
        )
      })

      if (!alreadyExists) {
        result.push(cleanStr)
      }
      continue
    }

    if (typeof candidate === 'object' && candidate.name) {
      const cleanName = String(candidate.name).trim()
      if (!cleanName) continue
      const lowerName = cleanName.toLowerCase()

      const existingIdx = result.findIndex((entry) => {
        if (typeof entry === 'string') {
          return entry === candidate.id || entry.toLowerCase() === lowerName
        }
        return (
          Boolean(candidate.id && entry.id === candidate.id) ||
          Boolean(entry.name && String(entry.name).trim().toLowerCase() === lowerName)
        )
      })

      if (existingIdx >= 0) {
        const previous = result[existingIdx]
        result[existingIdx] = {
          ...(typeof previous === 'object' ? previous : {}),
          ...candidate,
          name: cleanName
        }
      } else {
        result.push({
          ...candidate,
          name: cleanName
        })
      }
    }
  }

  return result
}

function isRecipientChildInList(list: Wishlist, recipientName?: string, recipientId?: string): boolean {
  if (!Array.isArray(list.members)) return false
  const cleanNameLower = recipientName?.trim().toLowerCase()
  const cleanId = recipientId?.trim()

  return list.members.some((m) => {
    if (typeof m !== 'object' || m === null) return false
    const isChild = Boolean(m.isChild || m.role === 'child')
    if (!isChild) return false
    if (cleanId && m.id === cleanId) return true
    if (cleanNameLower && m.name && m.name.trim().toLowerCase() === cleanNameLower) return true
    return false
  })
}

/**
 * Domain Service orchestrating Wishlist, Member, Gift Item, and Push Notification business rules.
 */
export class WishlistService {
  constructor(
    private readonly repositoryResolver: () => Promise<IWishlistRepository> = resolveWishlistRepository
  ) {}

  async getLists(userId?: string, joinedIds: string[] = []): Promise<Wishlist[]> {
    const cleanUserId = userId?.trim() || null
    const cleanJoinedIds = Array.isArray(joinedIds)
      ? joinedIds.map(s => s.trim()).filter(Boolean)
      : []
    const joinedInviteCodes = cleanJoinedIds.map(s => s.toUpperCase())

    // Privacy guard: never return public lists if neither userId nor joinedIds are provided
    if (!cleanUserId && cleanJoinedIds.length === 0) {
      return []
    }

    const repo = await this.repositoryResolver()
    return repo.findForUser({
      userId: cleanUserId,
      joinedIds: cleanJoinedIds,
      joinedInviteCodes
    })
  }

  async getListById(idOrCode: string): Promise<Wishlist | null> {
    if (!idOrCode || !idOrCode.trim()) return null
    const repo = await this.repositoryResolver()
    return repo.findByIdOrCode(idOrCode)
  }

  async saveList(list: Wishlist): Promise<Wishlist> {
    const repo = await this.repositoryResolver()
    const existing = await repo.findByIdOrCode(list.id)

    const mergedMembers = mergeMembersList(
      existing?.members ?? [],
      Array.isArray(list.members) ? list.members : []
    )

    let finalMembers = mergedMembers
    if (list.ownerName) {
      const ownerMember: WishlistMember = {
        id: list.ownerId,
        name: list.ownerName.trim(),
        avatar: list.ownerAvatar || buildDefaultAvatarUrl(list.ownerName),
        joinedAt: list.createdAt || new Date().toISOString(),
        role: 'owner',
        pushEnabled: true
      }
      finalMembers = mergeMembersList([ownerMember], mergedMembers)
    }

    const normalizedList: Wishlist = {
      ...list,
      members: finalMembers,
      items: Array.isArray(list.items)
        ? list.items
        : (existing?.items ?? [])
    }

    const saved = await repo.upsertList(normalizedList)

    // Push notifications are active by default for the list owner
    if (saved.ownerId && saved.ownerName) {
      const nowIso = new Date().toISOString()
      await repo.upsertPushSubscription({
        id: `push-${saved.id}-${saved.ownerId}`,
        listId: saved.id,
        userId: saved.ownerId,
        userName: saved.ownerName.trim(),
        userAvatar: saved.ownerAvatar || buildDefaultAvatarUrl(saved.ownerName),
        enabled: true,
        notifyOnAdd: true,
        notifyOnReserve: true,
        createdAt: nowIso,
        updatedAt: nowIso
      })
    }

    return saved
  }

  async deleteList(id: string): Promise<boolean> {
    if (!id || !id.trim()) return false
    const repo = await this.repositoryResolver()
    return repo.deleteList(id.trim())
  }

  async addMemberToList(
    listIdOrCode: string,
    member: AddMemberInput
  ): Promise<Wishlist | null> {
    const repo = await this.repositoryResolver()
    const target = await repo.findByIdOrCode(listIdOrCode)
    if (!target) return null

    const currentMembers = Array.isArray(target.members) ? [...target.members] : []
    const cleanName = member.name.trim()
    const isChildMember = Boolean(member.isChild || member.role === 'child')
    const memberRole: 'owner' | 'member' | 'child' = isChildMember
      ? 'child'
      : (member.id === target.ownerId ? 'owner' : 'member')

    const parsedAge =
      member.age !== undefined && member.age !== null && !Number.isNaN(Number(member.age))
        ? Number(member.age)
        : undefined

    const avatarUrl = member.avatar || buildDefaultAvatarUrl(cleanName)

    const memberObj: WishlistMember = {
      id: member.id,
      name: cleanName,
      avatar: avatarUrl,
      joinedAt: new Date().toISOString(),
      role: memberRole,
      ...(!isChildMember ? { pushEnabled: true } : {}),
      ...(isChildMember
        ? {
            isChild: true,
            parentId: member.parentId || undefined,
            parentName: member.parentName ? member.parentName.trim() : undefined,
            age: parsedAge
          }
        : {})
    }

    const updatedMembers = mergeMembersList(currentMembers, [memberObj])
    const updatedList = await repo.updateMembers(target.id, updatedMembers, new Date())

    // Push notifications are active by default for every adult member joining the list
    if (!isChildMember && member.id) {
      const nowIso = new Date().toISOString()
      await repo.upsertPushSubscription({
        id: `push-${target.id}-${member.id.trim()}`,
        listId: target.id,
        userId: member.id.trim(),
        userName: cleanName,
        userAvatar: avatarUrl,
        enabled: true,
        notifyOnAdd: true,
        notifyOnReserve: true,
        createdAt: nowIso,
        updatedAt: nowIso
      })
    }

    return updatedList
  }

  async removeMemberFromList(
    listIdOrCode: string,
    memberIdOrName: string
  ): Promise<Wishlist | null> {
    const repo = await this.repositoryResolver()
    const target = await repo.findByIdOrCode(listIdOrCode)
    if (!target) return null

    const cleanKey = memberIdOrName.trim().toLowerCase()
    if (!cleanKey) return target

    const ownerIdLower = (target.ownerId || '').trim().toLowerCase()
    const ownerNameLower = (target.ownerName || '').trim().toLowerCase()

    // Never remove the list owner
    if (cleanKey === ownerIdLower || cleanKey === ownerNameLower) {
      return target
    }

    const removedKeys = new Set<string>([cleanKey])
    const currentMembers = Array.isArray(target.members) ? [...target.members] : []
    const updatedMembers = currentMembers.filter((entry) => {
      if (!entry) return false
      if (typeof entry === 'string') {
        const strLower = entry.trim().toLowerCase()
        if (strLower === ownerIdLower || strLower === ownerNameLower) return true
        if (strLower === cleanKey) {
          removedKeys.add(strLower)
          return false
        }
        return true
      }
      if (entry.role === 'owner') return true
      const entryIdLower = entry.id ? String(entry.id).trim().toLowerCase() : ''
      const entryNameLower = entry.name ? String(entry.name).trim().toLowerCase() : ''
      if (
        (ownerIdLower && entryIdLower === ownerIdLower) ||
        (ownerNameLower && entryNameLower === ownerNameLower)
      ) {
        return true
      }

      const idMatch = Boolean(entryIdLower && entryIdLower === cleanKey)
      const nameMatch = Boolean(entryNameLower && entryNameLower === cleanKey)
      if (idMatch || nameMatch) {
        if (entryIdLower) removedKeys.add(entryIdLower)
        if (entryNameLower) removedKeys.add(entryNameLower)
        return false
      }
      return true
    })

    // Also delete gifts associated with the removed person
    if (Array.isArray(target.items)) {
      for (const item of target.items) {
        const recIdLower = item.recipientId ? String(item.recipientId).trim().toLowerCase() : ''
        const recNameLower = item.recipientName ? String(item.recipientName).trim().toLowerCase() : ''
        if (
          (recIdLower && removedKeys.has(recIdLower)) ||
          (recNameLower && removedKeys.has(recNameLower))
        ) {
          await repo.deleteItem(target.id, item.id)
        }
      }
    }

    return repo.updateMembers(target.id, updatedMembers, new Date())
  }

  async saveItem(
    listIdOrCode: string,
    item: WishlistItem,
    actor?: SaveItemActorInput
  ): Promise<WishlistItem | null> {
    const repo = await this.repositoryResolver()
    const target = await repo.findByIdOrCode(listIdOrCode)
    if (!target) return null

    const isUpdate = Array.isArray(target.items) && target.items.some(i => i.id === item.id)

    const saved = await repo.upsertItem(target.id, {
      ...item,
      listId: target.id
    })

    // Trigger Push Notification to list members when a brand new gift is added
    if (!isUpdate && saved) {
      const recipientName = (saved.recipientName || target.ownerName || 'un membre').trim()
      const actorName = (actor?.name || item.addedByName || saved.recipientName || target.ownerName || 'Un membre').trim()
      const actorId = (actor?.id || item.addedById || saved.recipientId || target.ownerId || '').trim() || undefined
      const isChildRecipient = isRecipientChildInList(target, recipientName, saved.recipientId)

      const samePerson = actorName.toLowerCase() === recipientName.toLowerCase()
      const bodyText = samePerson
        ? `${actorName} a ajouté « ${saved.title} » à ses souhaits.`
        : `${actorName} a ajouté « ${saved.title} » pour ${recipientName}.`

      const notification: ListNotificationEvent = {
        id: `notif-add-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        listId: target.id,
        listTitle: target.title,
        type: 'item_added',
        title: `🎁 Nouveau cadeau dans « ${target.title} »`,
        body: bodyText,
        itemId: saved.id,
        itemTitle: saved.title,
        recipientName,
        recipientId: saved.recipientId,
        isChildRecipient,
        actorId,
        actorName,
        isAnonymous: false,
        createdAt: new Date().toISOString()
      }

      try {
        await repo.createNotification(notification)
      } catch (err) {
        console.warn('[PushNotifications] Could not persist item_added notification:', err)
      }
    }

    return saved
  }

  async deleteItem(listIdOrCode: string, itemId: string): Promise<boolean> {
    const repo = await this.repositoryResolver()
    const target = await repo.findByIdOrCode(listIdOrCode)
    if (!target) return false

    return repo.deleteItem(target.id, itemId)
  }

  async togglePurchaseItem(
    listIdOrCode: string,
    itemId: string,
    purchased: boolean,
    purchaserName?: string,
    anonymous: boolean = true,
    userId?: string
  ): Promise<WishlistItem | null> {
    const repo = await this.repositoryResolver()
    const target = await repo.findByIdOrCode(listIdOrCode)
    if (!target) return null

    const existingItem = Array.isArray(target.items)
      ? target.items.find(i => i.id === itemId)
      : undefined
    const wasAlreadyPurchased = Boolean(existingItem?.isPurchased)

    const now = new Date()
    const purchasedBy: WishlistItem['purchasedBy'] = purchased
      ? {
          isAnonymous: anonymous,
          name: anonymous ? (purchaserName || 'Père Noël Secret') : purchaserName,
          userId: userId || undefined
        }
      : undefined

    const updated = await repo.updateItemPurchase(target.id, itemId, {
      isPurchased: purchased,
      purchasedBy,
      purchasedAt: purchased ? now : null,
      updatedAt: now
    })

    // Trigger Push Notification to list members when a gift is reserved
    if (purchased && updated && !wasAlreadyPurchased) {
      const recipientName = (updated.recipientName || target.ownerName || 'un proche').trim()
      const isChildRecipient = isRecipientChildInList(target, recipientName, updated.recipientId)
      const cleanPurchaserName = purchaserName?.trim() || 'Un proche'
      const displayActor = anonymous ? 'Un lutin secret' : cleanPurchaserName

      const bodyText = anonymous
        ? `🎅 Un lutin secret a réservé « ${updated.title} » pour ${recipientName} !`
        : `🎁 ${cleanPurchaserName} a réservé « ${updated.title} » pour ${recipientName} !`

      const notification: ListNotificationEvent = {
        id: `notif-res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        listId: target.id,
        listTitle: target.title,
        type: 'item_reserved',
        title: `🤫 Cadeau réservé dans « ${target.title} »`,
        body: bodyText,
        itemId: updated.id,
        itemTitle: updated.title,
        recipientName,
        recipientId: updated.recipientId || (recipientName.toLowerCase() === target.ownerName.trim().toLowerCase() ? target.ownerId : undefined),
        isChildRecipient,
        actorId: userId?.trim() || undefined,
        actorName: displayActor,
        isAnonymous: anonymous,
        createdAt: now.toISOString()
      }

      try {
        await repo.createNotification(notification)
      } catch (err) {
        console.warn('[PushNotifications] Could not persist item_reserved notification:', err)
      }
    }

    return updated
  }

  async subscribeMemberToPush(
    listIdOrCode: string,
    input: SubscribePushInput
  ): Promise<PushSubscriptionRecord | null> {
    const repo = await this.repositoryResolver()
    const target = await repo.findByIdOrCode(listIdOrCode)
    if (!target) return null

    const cleanUserId = input.userId.trim()
    const cleanUserName = input.userName.trim() || 'Membre'
    if (!cleanUserId) return null

    const nowIso = new Date().toISOString()
    const subRecord: PushSubscriptionRecord = {
      id: `push-${target.id}-${cleanUserId}`,
      listId: target.id,
      userId: cleanUserId,
      userName: cleanUserName,
      userAvatar: input.userAvatar || buildDefaultAvatarUrl(cleanUserName),
      endpoint: input.endpoint,
      keys: input.keys,
      enabled: input.enabled ?? true,
      notifyOnAdd: input.notifyOnAdd ?? true,
      notifyOnReserve: input.notifyOnReserve ?? true,
      createdAt: nowIso,
      updatedAt: nowIso
    }

    const savedSub = await repo.upsertPushSubscription(subRecord)

    // Mark pushEnabled on the member entry inside the list
    const currentMembers = Array.isArray(target.members) ? [...target.members] : []
    const memberObj: WishlistMember = {
      id: cleanUserId,
      name: cleanUserName,
      avatar: subRecord.userAvatar,
      role: cleanUserId === target.ownerId ? 'owner' : 'member',
      pushEnabled: savedSub.enabled
    }
    const updatedMembers = mergeMembersList(currentMembers, [memberObj])
    await repo.updateMembers(target.id, updatedMembers, new Date())

    return savedSub
  }

  async unsubscribeMemberFromPush(
    listIdOrCode: string,
    userId: string
  ): Promise<boolean> {
    const repo = await this.repositoryResolver()
    const target = await repo.findByIdOrCode(listIdOrCode)
    if (!target) return false

    const cleanUserId = userId.trim()
    if (!cleanUserId) return false

    const deleted = await repo.deletePushSubscription(target.id, cleanUserId)

    // Update member pushEnabled flag to false
    if (Array.isArray(target.members)) {
      const updatedMembers = target.members.map((m) => {
        if (typeof m === 'object' && m !== null && (m.id === cleanUserId || m.name.toLowerCase() === cleanUserId.toLowerCase())) {
          return { ...m, pushEnabled: false }
        }
        return m
      })
      await repo.updateMembers(target.id, updatedMembers, new Date())
    }

    return deleted
  }

  async getListNotificationsForMember(
    listIdOrCode: string,
    viewer: { userId?: string; userName?: string; since?: string } = {}
  ): Promise<{
    notifications: ListNotificationEvent[]
    subscriptions: PushSubscriptionRecord[]
    mySubscription: PushSubscriptionRecord | null
  }> {
    const repo = await this.repositoryResolver()
    const target = await repo.findByIdOrCode(listIdOrCode)
    if (!target) {
      return {
        notifications: [],
        subscriptions: [],
        mySubscription: null
      }
    }

    const [allNotifications, allSubscriptions] = await Promise.all([
      repo.getNotificationsForList(target.id, 40),
      repo.getPushSubscriptionsForList(target.id)
    ])

    const viewerId = viewer.userId?.trim()
    const viewerNameLower = viewer.userName?.trim().toLowerCase()

    let mySubscription =
      allSubscriptions.find((s) => {
        if (viewerId && s.userId === viewerId) return true
        if (viewerNameLower && s.userName.trim().toLowerCase() === viewerNameLower) return true
        return false
      }) || null

    // Auto-provision default active subscription for any list member if not yet created
    if (!mySubscription && viewerId && viewer.userName?.trim()) {
      const cleanName = viewer.userName.trim()
      const nowIso = new Date().toISOString()
      mySubscription = await repo.upsertPushSubscription({
        id: `push-${target.id}-${viewerId}`,
        listId: target.id,
        userId: viewerId,
        userName: cleanName,
        userAvatar: buildDefaultAvatarUrl(cleanName),
        enabled: true,
        notifyOnAdd: true,
        notifyOnReserve: true,
        createdAt: nowIso,
        updatedAt: nowIso
      })
      allSubscriptions.push(mySubscription)
    }

    const sinceTime = viewer.since ? new Date(viewer.since).getTime() : 0

    const filteredNotifications = allNotifications.filter((notif) => {
      if (sinceTime > 0 && !Number.isNaN(sinceTime)) {
        const notifTime = new Date(notif.createdAt).getTime()
        if (notifTime <= sinceTime) return false
      }

      return shouldMemberReceiveNotification(
        notif,
        {
          userId: viewerId,
          userName: viewer.userName,
          notifyOnAdd: mySubscription ? mySubscription.notifyOnAdd : true,
          notifyOnReserve: mySubscription ? mySubscription.notifyOnReserve : true
        },
        target
      )
    })

    return {
      notifications: filteredNotifications,
      subscriptions: allSubscriptions.filter(s => s.enabled),
      mySubscription
    }
  }
}

export const wishlistService = new WishlistService()
