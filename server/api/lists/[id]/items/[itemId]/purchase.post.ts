import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const listId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')

  if (!listId || !itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Paramètres manquants' })
  }

  const body = await readBody<{
    purchased: boolean
    purchaserName?: string
    anonymous?: boolean
    userId?: string
  }>(event)

  const updated = await togglePurchaseItem(
    listId,
    itemId,
    body?.purchased ?? true,
    body?.purchaserName,
    body?.anonymous ?? true,
    body?.userId
  )

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Cadeau ou liste introuvable' })
  }

  return updated
})
