import { defineEventHandler, getRouterParam, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID manquant' })
  }

  const success = await deleteList(id)
  if (!success) {
    throw createError({ statusCode: 404, statusMessage: 'Liste non trouvée' })
  }

  return { success: true }
})
