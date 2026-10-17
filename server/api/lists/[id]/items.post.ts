import { defineEventHandler, readBody, createError } from 'h3'
import type { WishlistItem } from '../../../../types'
import { wishlistService } from '../../../services/wishlist.service'
import { requireRouterParam, validateAndBuildWishlistItem } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  const listId = requireRouterParam(event, 'id', 'ID de liste manquant')
  const body = await readBody<Partial<WishlistItem>>(event)

  const targetList = await wishlistService.getListById(listId)
  if (!targetList) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste introuvable'
    })
  }

  const item = validateAndBuildWishlistItem(targetList.id, body)
  const saved = await wishlistService.saveItem(targetList.id, item)

  if (!saved) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste introuvable'
    })
  }

  return saved
})
