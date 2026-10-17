import { defineEventHandler, getQuery, createError } from 'h3'
import { wishlistService } from '../../../services/wishlist.service'
import { requireRouterParam } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  const listId = requireRouterParam(event, 'id', 'ID de liste manquant')
  const query = getQuery(event)

  const targetList = await wishlistService.getListById(listId)
  if (!targetList) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste introuvable'
    })
  }

  const userId = typeof query.userId === 'string' ? query.userId : undefined
  const userName = typeof query.userName === 'string' ? query.userName : undefined
  const since = typeof query.since === 'string' ? query.since : undefined

  const result = await wishlistService.getListNotificationsForMember(targetList.id, {
    userId,
    userName,
    since
  })

  return result
})
