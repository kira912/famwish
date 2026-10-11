import { defineEventHandler, readBody } from 'h3'
import type { LinkMetadata } from '../../types'

export default defineEventHandler(async (event): Promise<LinkMetadata> => {
  const body = await readBody(event)
  const rawUrl = body?.url?.trim()

  if (!rawUrl) {
    return { url: '' }
  }

  let formattedUrl = rawUrl
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl
  }

  try {
    const urlObj = new URL(formattedUrl)
    const siteName = urlObj.hostname.replace(/^www\./, '')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const response = await fetch(formattedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    })
    clearTimeout(timeout)

    const html = await response.text()

    // Helper functions for meta tags
    const getMeta = (prop: string): string | undefined => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
      return match ? decodeHtmlEntities(match[1]) : undefined
    }

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const rawTitle = getMeta('og:title') || getMeta('twitter:title') || (titleMatch ? decodeHtmlEntities(titleMatch[1]) : undefined)
    
    // Clean up title (remove trailing store names)
    let title = rawTitle?.trim()
    if (title) {
      title = title.split(' | ')[0].split(' - ')[0].split(' : ')[0].trim()
    }

    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description')

    // Image
    let imageUrl = getMeta('og:image') || getMeta('twitter:image') || getMeta('image')
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, formattedUrl).toString()
      } catch {
        // keep as is
      }
    }

    // Try price detection from meta or regex
    let price: number | undefined
    let currency: string = '€'

    const priceMeta = getMeta('product:price:amount') || getMeta('og:price:amount') || getMeta('twitter:data1')
    if (priceMeta) {
      const parsed = parseFloat(priceMeta.replace(/[^0-9.,]/g, '').replace(',', '.'))
      if (!isNaN(parsed) && parsed > 0) {
        price = parsed
      }
    }

    // If no price in meta, search in html for common price formats like 49,99 € or 49.99 EUR
    if (!price) {
      const priceRegex = /([0-9]{1,4}(?:[.,][0-9]{2})?)\s*(?:€|EUR|euros?|\$|£)/i
      const match = html.match(priceRegex)
      if (match && match[1]) {
        const parsed = parseFloat(match[1].replace(',', '.'))
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
          price = parsed
        }
      }
    }

    const currencyMeta = getMeta('product:price:currency') || getMeta('og:price:currency')
    if (currencyMeta) {
      currency = currencyMeta === 'EUR' ? '€' : currencyMeta === 'USD' ? '$' : currencyMeta
    }

    return {
      title: title || siteName,
      description: description ? description.slice(0, 200) : undefined,
      imageUrl,
      price,
      currency,
      siteName,
      url: formattedUrl
    }
  } catch (err) {
    // Fallback if URL couldn't be scraped directly
    try {
      const host = new URL(formattedUrl).hostname.replace(/^www\./, '')
      return {
        title: `Cadeau sur ${host}`,
        siteName: host,
        url: formattedUrl,
        currency: '€'
      }
    } catch {
      return {
        title: formattedUrl,
        url: formattedUrl,
        currency: '€'
      }
    }
  }
})

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
