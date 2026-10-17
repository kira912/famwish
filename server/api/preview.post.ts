import { defineEventHandler, readBody } from 'h3'
import type { LinkMetadata } from '../../types'
import { linkPreviewService } from '../services/link-preview.service'

export default defineEventHandler(async (event): Promise<LinkMetadata> => {
  const body = await readBody<{ url?: string }>(event)
  return linkPreviewService.extractMetadata(body?.url ?? '')
})
