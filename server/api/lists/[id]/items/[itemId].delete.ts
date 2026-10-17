import { defineEventHandler, createError } from 'h3'
import { wishlistService } from '../../../../services/wishlist.service'
import { requireRouterParam } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  const listId = requireRouterParam(event, 'id', 'Paramètres manquants')
  const itemId = requireRouterParam(event, 'itemId', 'Paramètres manquants')

  const deleted = await wishlistService.deleteItem(listId, itemId)
  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Cadeau ou liste introuvable'
    })
  }

  return { success: true }
})
