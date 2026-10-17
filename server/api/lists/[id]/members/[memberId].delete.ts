import { defineEventHandler, createError } from 'h3'
import { wishlistService } from '../../../../services/wishlist.service'
import { requireRouterParam } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireRouterParam(event, 'id', 'Paramètres manquants')
  const memberId = requireRouterParam(event, 'memberId', 'Paramètres manquants')

  const updatedList = await wishlistService.removeMemberFromList(id, decodeURIComponent(memberId))
  if (!updatedList) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste non trouvée'
    })
  }

  return {
    success: true,
    list: updatedList
  }
})
