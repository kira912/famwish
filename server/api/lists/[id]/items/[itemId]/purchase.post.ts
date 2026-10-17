import { defineEventHandler, readBody, createError } from 'h3'
import { wishlistService } from '#server/services/wishlist.service.ts'
import { requireRouterParam } from '#server/utils/validation.ts'

interface PurchaseRequestBody {
  purchased?: boolean
  purchaserName?: string
  anonymous?: boolean
  userId?: string
  user?: {
    id?: string
    name?: string
  }
}

export default defineEventHandler(async (event) => {
  const listId = requireRouterParam(event, 'id', 'Paramètres manquants')
  const itemId = requireRouterParam(event, 'itemId', 'Paramètres manquants')

  const body = await readBody<PurchaseRequestBody>(event)

  const purchaserName = body?.purchaserName || body?.user?.name
  const userId = body?.userId || body?.user?.id

  const updated = await wishlistService.togglePurchaseItem(
    listId,
    itemId,
    body?.purchased ?? true,
    purchaserName,
    body?.anonymous ?? true,
    userId
  )

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Cadeau ou liste introuvable'
    })
  }

  return updated
})
