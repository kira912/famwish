import { defineEventHandler, createError } from 'h3'
import { wishlistService } from '../../services/wishlist.service'
import { requireRouterParam } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireRouterParam(event, 'id', 'ID manquant')
  const deleted = await wishlistService.deleteList(id)

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste non trouvée'
    })
  }

  return { success: true }
})
