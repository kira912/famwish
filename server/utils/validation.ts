import { createError, getRouterParam, type H3Event } from 'h3'
import type { Wishlist, WishlistItem, WishlistCategory } from '../../types'
import type { AddMemberInput } from '../services/wishlist.service'

const VALID_CATEGORIES = new Set<WishlistCategory>([
  'christmas',
  'birthday',
  'birth',
  'wedding',
  'housewarming',
  'other'
])

export function requireRouterParam(event: H3Event, name: string, errorMessage = 'Paramètre manquant'): string {
  const value = getRouterParam(event, name)?.trim()
  if (!value) {
    throw createError({
      statusCode: 400,
      statusMessage: errorMessage
    })
  }
  return value
}

export function generateListId(): string {
  return `list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
}

export function generateInviteCode(): string {
  return `WISH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

export function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
}

export function validateAndBuildWishlist(body: Partial<Wishlist> | null | undefined): Wishlist {
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le titre de la liste est requis'
    })
  }

  const nowIso = new Date().toISOString()
  const ownerId = body.ownerId?.trim() || `user-${Date.now()}`
  const ownerName = body.ownerName?.trim() || 'Propriétaire'
  const category: WishlistCategory =
    body.category && VALID_CATEGORIES.has(body.category) ? body.category : 'christmas'

  return {
    ...body,
    id: body.id?.trim() || generateListId(),
    ownerId,
    ownerName,
    title: body.title.trim(),
    category,
    inviteCode: body.inviteCode?.trim() || generateInviteCode(),
    members: Array.isArray(body.members) ? body.members : (ownerId ? [ownerId] : []),
    items: Array.isArray(body.items) ? body.items : [],
    createdAt: body.createdAt || nowIso,
    updatedAt: nowIso
  }
}

export function validateAndBuildWishlistItem(
  listId: string,
  body: Partial<WishlistItem> | null | undefined
): WishlistItem {
  if (!body || typeof body.title !== 'string' || !body.title.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le titre du cadeau est requis'
    })
  }

  const nowIso = new Date().toISOString()
  const parsedPrice =
    body.price !== undefined && body.price !== null && !Number.isNaN(Number(body.price))
      ? Number(body.price)
      : undefined
  const parsedQuantity =
    body.quantity !== undefined && body.quantity !== null && Number(body.quantity) > 0
      ? Number(body.quantity)
      : 1

  return {
    ...body,
    id: body.id?.trim() || generateItemId(),
    listId,
    title: body.title.trim(),
    price: parsedPrice,
    quantity: parsedQuantity,
    isPurchased: Boolean(body.isPurchased),
    createdAt: body.createdAt || nowIso,
    updatedAt: nowIso
  }
}

export function validateAndBuildMemberInput(body: Record<string, unknown> | null | undefined): AddMemberInput {
  const rawName = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!rawName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le prénom ou nom du membre est requis'
    })
  }

  const isChild = Boolean(body?.isChild || body?.role === 'child')
  const id =
    typeof body?.id === 'string' && body.id.trim()
      ? body.id.trim()
      : (isChild ? `child-${Date.now()}` : `user-${Date.now()}`)

  const rawAge = body?.age
  const parsedAge =
    rawAge !== undefined && rawAge !== null && rawAge !== '' && !Number.isNaN(Number(rawAge))
      ? Number(rawAge)
      : undefined

  return {
    id,
    name: rawName,
    avatar: typeof body?.avatar === 'string' && body.avatar.trim() ? body.avatar.trim() : undefined,
    email: typeof body?.email === 'string' && body.email.trim() ? body.email.trim() : undefined,
    role: (body?.role as AddMemberInput['role']) || (isChild ? 'child' : undefined),
    isChild,
    parentId: typeof body?.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : undefined,
    parentName: typeof body?.parentName === 'string' && body.parentName.trim() ? body.parentName.trim() : undefined,
    age: parsedAge
  }
}
