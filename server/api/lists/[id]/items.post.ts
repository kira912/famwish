import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import type { WishlistItem } from '../../../../types'
import { getListById, saveItem } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const listId = getRouterParam(event, 'id')
  if (!listId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de liste manquant' })
  }

  const body = await readBody<WishlistItem>(event)
  if (!body || !body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Le titre du cadeau est requis' })
  }

  const targetList = await getListById(listId)
  if (!targetList) {
    throw createError({ statusCode: 404, statusMessage: 'Liste introuvable' })
  }

  const item: WishlistItem = {
    ...body,
    id: body.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    listId: targetList.id,
    quantity: body.quantity || 1,
    isPurchased: body.isPurchased || false,
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const saved = await saveItem(targetList.id, item)
  if (!saved) {
    throw createError({ statusCode: 404, statusMessage: 'Liste introuvable' })
  }

  return saved
})
