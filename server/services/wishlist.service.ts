import type { Wishlist, WishlistItem, WishlistMember } from '../../types'
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

export function buildDefaultAvatarUrl(seedName: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seedName.trim())}`
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

/**
 * Domain Service orchestrating Wishlist, Member, and Gift Item business rules.
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
        role: 'owner'
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

    return repo.upsertList(normalizedList)
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

    const memberObj: WishlistMember = {
      id: member.id,
      name: cleanName,
      avatar: member.avatar || buildDefaultAvatarUrl(cleanName),
      joinedAt: new Date().toISOString(),
      role: memberRole,
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
    return repo.updateMembers(target.id, updatedMembers, new Date())
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

    const currentMembers = Array.isArray(target.members) ? [...target.members] : []
    const updatedMembers = currentMembers.filter((entry) => {
      if (!entry) return false
      if (typeof entry === 'string') {
        return entry.trim().toLowerCase() !== cleanKey
      }
      const idMatch = Boolean(entry.id && String(entry.id).trim().toLowerCase() === cleanKey)
      const nameMatch = Boolean(entry.name && String(entry.name).trim().toLowerCase() === cleanKey)
      return !idMatch && !nameMatch
    })

    return repo.updateMembers(target.id, updatedMembers, new Date())
  }

  async saveItem(listIdOrCode: string, item: WishlistItem): Promise<WishlistItem | null> {
    const repo = await this.repositoryResolver()
    const target = await repo.findByIdOrCode(listIdOrCode)
    if (!target) return null

    return repo.upsertItem(target.id, {
      ...item,
      listId: target.id
    })
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

    const now = new Date()
    const purchasedBy: WishlistItem['purchasedBy'] = purchased
      ? {
          isAnonymous: anonymous,
          name: anonymous ? (purchaserName || 'Père Noël Secret') : purchaserName,
          userId: userId || undefined
        }
      : undefined

    return repo.updateItemPurchase(target.id, itemId, {
      isPurchased: purchased,
      purchasedBy,
      purchasedAt: purchased ? now : null,
      updatedAt: now
    })
  }
}

export const wishlistService = new WishlistService()
