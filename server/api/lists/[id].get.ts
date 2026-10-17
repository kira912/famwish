import { defineEventHandler, createError } from 'h3'
import { wishlistService } from '../../services/wishlist.service'
import { requireRouterParam } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireRouterParam(event, 'id', 'ID manquant')
  const list = await wishlistService.getListById(id)

  if (!list) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste non trouvée'
    })
  }

  return list
})
