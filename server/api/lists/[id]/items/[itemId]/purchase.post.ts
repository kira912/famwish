import { defineEventHandler, readBody, createError } from 'h3'
import { wishlistService } from '#server/services/wishlist.service.ts'
import { requireRouterParam } from '#server/utils/validation.ts'

interface PurchaseRequestBody {
  purchased?: boolean
  purchaserName?: string
  anonymous?: boolean
  userId?: string
}

export default defineEventHandler(async (event) => {
  const listId = requireRouterParam(event, 'id', 'Paramètres manquants')
  const itemId = requireRouterParam(event, 'itemId', 'Paramètres manquants')

  const body = await readBody<PurchaseRequestBody>(event)

  const updated = await wishlistService.togglePurchaseItem(
    listId,
    itemId,
    body?.purchased ?? true,
    body?.purchaserName,
    body?.anonymous ?? true,
    body?.userId
  )

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Cadeau ou liste introuvable'
    })
  }

  return updated
})
