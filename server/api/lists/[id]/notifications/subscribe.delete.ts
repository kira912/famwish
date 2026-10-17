import { defineEventHandler, readBody, getQuery, createError } from 'h3'
import { wishlistService } from '../../../../services/wishlist.service'
import { requireRouterParam } from '../../../../utils/validation'

export default defineEventHandler(async (event) => {
  const listId = requireRouterParam(event, 'id', 'ID de liste manquant')
  const query = getQuery(event)
  const body = await readBody<{ userId?: string }>(event).catch(() => ({} as { userId?: string }))

  const userId = (typeof query.userId === 'string' ? query.userId : body?.userId)?.trim()
  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant du membre requis'
    })
  }

  const unsubscribed = await wishlistService.unsubscribeMemberFromPush(listId, userId)
  return {
    success: unsubscribed
  }
})
