import { defineEventHandler, readBody, createError } from 'h3'
import type { WishlistItem } from '../../../../types'
import { wishlistService } from '../../../services/wishlist.service'
import { requireRouterParam, validateAndBuildWishlistItem } from '../../../utils/validation'

interface SaveItemRequestBody extends Partial<WishlistItem> {
  actor?: {
    id?: string
    name?: string
  }
}

export default defineEventHandler(async (event) => {
  const listId = requireRouterParam(event, 'id', 'ID de liste manquant')
  const body = await readBody<SaveItemRequestBody>(event)

  const targetList = await wishlistService.getListById(listId)
  if (!targetList) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste introuvable'
    })
  }

  const item = validateAndBuildWishlistItem(targetList.id, body)
  const actor = {
    id: body?.actor?.id || body?.addedById,
    name: body?.actor?.name || body?.addedByName
  }
  const saved = await wishlistService.saveItem(targetList.id, item, actor)

  if (!saved) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste introuvable'
    })
  }

  return saved
})
