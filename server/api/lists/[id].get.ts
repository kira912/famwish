import { defineEventHandler, getRouterParam, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID manquant' })
  }

  const list = await getListById(id)
  if (!list) {
    throw createError({ statusCode: 404, statusMessage: 'Liste non trouvée' })
  }

  return list
})
