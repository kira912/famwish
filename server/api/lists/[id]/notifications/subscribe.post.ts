import { defineEventHandler, readBody, createError } from 'h3'
import type { PushSubscriptionKeys } from '../../../../../types'
import { wishlistService } from '../../../../services/wishlist.service'
import { requireRouterParam } from '../../../../utils/validation'

interface SubscribeRequestBody {
  userId?: string
  userName?: string
  userAvatar?: string
  endpoint?: string
  keys?: PushSubscriptionKeys
  enabled?: boolean
  notifyOnAdd?: boolean
  notifyOnReserve?: boolean
}

export default defineEventHandler(async (event) => {
  const listId = requireRouterParam(event, 'id', 'ID de liste manquant')
  const body = await readBody<SubscribeRequestBody>(event)

  const userId = body?.userId?.trim()
  const userName = body?.userName?.trim()

  if (!userId || !userName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant et prénom du membre requis pour activer les notifications push'
    })
  }

  const subscription = await wishlistService.subscribeMemberToPush(listId, {
    userId,
    userName,
    userAvatar: body?.userAvatar,
    endpoint: body?.endpoint,
    keys: body?.keys,
    enabled: body?.enabled ?? true,
    notifyOnAdd: body?.notifyOnAdd ?? true,
    notifyOnReserve: body?.notifyOnReserve ?? true
  })

  if (!subscription) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste introuvable'
    })
  }

  return {
    success: true,
    subscription
  }
})
