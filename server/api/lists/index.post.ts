import { defineEventHandler, readBody } from 'h3'
import type { Wishlist } from '../../../types'
import { wishlistService } from '../../services/wishlist.service'
import { validateAndBuildWishlist } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Wishlist>>(event)
  const list = validateAndBuildWishlist(body)
  return wishlistService.saveList(list)
})
