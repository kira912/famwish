import { defineEventHandler, readBody, createError } from 'h3'
import { wishlistService } from '../../../services/wishlist.service'
import { requireRouterParam, validateAndBuildMemberInput } from '../../../utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireRouterParam(event, 'id', 'ID manquant')
  const body = await readBody<Record<string, unknown>>(event)
  const member = validateAndBuildMemberInput(body)

  const updatedList = await wishlistService.addMemberToList(id, member)
  if (!updatedList) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Liste non trouvée'
    })
  }

  return {
    success: true,
    member,
    list: updatedList
  }
})
