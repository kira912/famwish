import { defineEventHandler, getRouterParam, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const listId = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')

  if (!listId || !itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Paramètres manquants' })
  }

  const success = await deleteItem(listId, itemId)
  if (!success) {
    throw createError({ statusCode: 404, statusMessage: 'Cadeau ou liste introuvable' })
  }

  return { success: true }
})
