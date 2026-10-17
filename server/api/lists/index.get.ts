import { defineEventHandler, getQuery } from 'h3'
import { wishlistService } from '../../services/wishlist.service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = typeof query.userId === 'string' ? query.userId : undefined
  const joinedIdsStr = typeof query.joinedIds === 'string' ? query.joinedIds : undefined
  const joinedIds = joinedIdsStr
    ? joinedIdsStr.split(',').map(s => s.trim()).filter(Boolean)
    : []

  return wishlistService.getLists(userId, joinedIds)
})
