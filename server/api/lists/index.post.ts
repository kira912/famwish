import { defineEventHandler, readBody, createError } from 'h3'
import type { Wishlist } from '../../../types'

export default defineEventHandler(async (event) => {
  const body = await readBody<Wishlist>(event)
  if (!body || !body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Le titre de la liste est requis' })
  }

  const list: Wishlist = {
    ...body,
    id: body.id || `list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    inviteCode: body.inviteCode || `WISH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    members: body.members || (body.ownerId ? [body.ownerId] : []),
    items: body.items || [],
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return await saveList(list)
})
