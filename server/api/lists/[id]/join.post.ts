import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { addMemberToList } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID manquant' })
  }

  const body = await readBody(event)
  if (!body || !body.name) {
    throw createError({ statusCode: 400, statusMessage: 'Le prénom ou nom du membre est requis' })
  }

  const member = {
    id: body.id || `user-${Date.now()}`,
    name: body.name.trim(),
    avatar: body.avatar || undefined,
    email: body.email || undefined
  }

  const updatedList = await addMemberToList(id, member)
  if (!updatedList) {
    throw createError({ statusCode: 404, statusMessage: 'Liste non trouvée' })
  }

  return {
    success: true,
    member,
    list: updatedList
  }
})
