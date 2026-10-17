import type { LinkMetadata } from '../../types'

const FETCH_TIMEOUT_MS = 6000
const MAX_HTML_LENGTH = 500_000

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1'
}

const BRAND_TITLE_SUFFIXES = [
  ' | ',
  ' - Amazon.fr',
  ' : Amazon.fr',
  ' - Amazon.com',
  ' : Amazon.com',
  ' - Fnac',
  ' | Fnac',
  ' | LEGO',
  ' - Cdiscount',
  ' - Zara'
]

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.local') || lower === '[::1]') {
    return true
  }
  return /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(lower)
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
}

export function extractAmazonAsin(url: string): string | null {
  if (!url) return null
  const patterns = [
    /\/(?:dp|gp\/product|gp\/aw\/d|o\/ASIN|exec\/obidos\/ASIN|asin|product)\/([A-Z0-9]{10})(?:[/?&#]|$)/i,
    /\/([B0-9][A-Z0-9]{9})(?:[/?&#]|$)/i,
    /[?&]asin=([A-Z0-9]{10})(?:&|$)/i
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1].toUpperCase()
    }
  }
  return null
}

export function extractSlugTitle(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    const slugMatch = parsed.pathname.match(/^\/([^/]+)\/(?:dp|gp\/product|asin)/i)
    if (slugMatch?.[1] && !['dp', 'gp', 'o', 'exec'].includes(slugMatch[1].toLowerCase())) {
      const rawSlug = decodeURIComponent(slugMatch[1].replace(/\+/g, ' '))
      const cleaned = rawSlug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
      if (cleaned.length > 2) {
        return cleaned
      }
    }
  } catch {
    // Ignore invalid URLs
  }
  return undefined
}

function normalizeCurrency(rawCurrency?: string): string {
  if (!rawCurrency) return '€'
  if (rawCurrency === 'EUR') return '€'
  if (rawCurrency === 'USD') return '$'
  return rawCurrency
}

function parseNumericPrice(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined
  const parsed = parseFloat(String(raw).replace(/[^0-9.,]/g, '').replace(',', '.'))
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined
}

function cleanProductTitle(rawTitle: string): string {
  let cleaned = rawTitle
  for (const suffix of BRAND_TITLE_SUFFIXES) {
    cleaned = cleaned.split(suffix)[0] ?? cleaned
  }
  return cleaned.replace(/\s+/g, ' ').trim()
}

export class LinkPreviewService {
  async extractMetadata(rawInput: string): Promise<LinkMetadata> {
    const trimmed = rawInput?.trim() || ''
    if (!trimmed) {
      return { url: '' }
    }

    const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i)
    let formattedUrl = urlMatch ? urlMatch[0] : trimmed

    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`
    }

    try {
      const parsedUrl = new URL(formattedUrl)
      const siteName = parsedUrl.hostname.replace(/^www\./, '')

      // SSRF protection against private network scanning
      if (isPrivateOrLoopbackHost(parsedUrl.hostname)) {
        return {
          title: siteName,
          siteName,
          url: formattedUrl,
          currency: '€'
        }
      }

      const isAmazon = /(?:amazon\.|amzn\.to|amzn\.eu|zvg\.me)/i.test(parsedUrl.hostname)
      const { finalUrl, html } = await this.fetchHtmlSafe(formattedUrl)

      const getMeta = (prop: string): string | undefined => {
        const match =
          html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
          html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
        return match?.[1] ? decodeHtmlEntities(match[1]) : undefined
      }

      let title: string | undefined
      let description: string | undefined
      let imageUrl: string | undefined
      let price: number | undefined
      let currency = '€'

      const amazonAsin = isAmazon ? extractAmazonAsin(finalUrl) || extractAmazonAsin(formattedUrl) : null

      // 1. JSON-LD Product Schema
      const jsonLdData = this.extractFromJsonLd(html)
      title = jsonLdData.title
      description = jsonLdData.description
      imageUrl = jsonLdData.imageUrl
      price = jsonLdData.price
      if (jsonLdData.currency) {
        currency = jsonLdData.currency
      }

      // 2. Amazon & E-Commerce specific HTML heuristics
      if (isAmazon || !imageUrl || !title) {
        const amazonData = this.extractAmazonSpecifics(html, isAmazon, amazonAsin)
        if (!title && amazonData.title) title = amazonData.title
        if (!imageUrl && amazonData.imageUrl) imageUrl = amazonData.imageUrl
      }

      // 3. Price DOM fallback
      if (!price) {
        price = this.extractDomPrice(html)
      }

      // 4. OpenGraph & Meta Tags fallback
      if (!title) {
        const metaTitle = getMeta('og:title') || getMeta('twitter:title')
        if (metaTitle) {
          title = metaTitle
        } else {
          const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
          if (titleTagMatch?.[1]) {
            title = decodeHtmlEntities(titleTagMatch[1]).trim()
          }
        }
      }

      if (!title || title.toLowerCase().includes('robot check') || title.toLowerCase().includes('captcha')) {
        const slugTitle = extractSlugTitle(finalUrl) || extractSlugTitle(formattedUrl)
        if (slugTitle) {
          title = slugTitle
        }
      }

      if (!description) {
        description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description')
      }

      if (!imageUrl) {
        imageUrl = getMeta('og:image') || getMeta('twitter:image') || getMeta('image')
      }

      if (!imageUrl && isAmazon && amazonAsin) {
        imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${amazonAsin}.01._SCLZZZZZZZ_SX500_.jpg`
      }

      if (!price) {
        const priceMeta = getMeta('product:price:amount') || getMeta('og:price:amount') || getMeta('twitter:data1')
        price = parseNumericPrice(priceMeta)
      }

      if (title) {
        title = cleanProductTitle(title)
      }

      if (imageUrl) {
        imageUrl = this.resolveAbsoluteUrl(decodeHtmlEntities(imageUrl).trim(), finalUrl)
      }

      if (!price) {
        const priceRegex = /([0-9]{1,4}(?:[.,][0-9]{2})?)\s*(?:€|EUR|euros?|\$|£)/i
        const match = html.match(priceRegex)
        if (match?.[1]) {
          const parsed = parseNumericPrice(match[1])
          if (parsed && parsed < 100_000) {
            price = parsed
          }
        }
      }

      const currencyMeta = getMeta('product:price:currency') || getMeta('og:price:currency')
      if (currencyMeta) {
        currency = normalizeCurrency(currencyMeta)
      }

      return {
        title: title || siteName,
        description: description ? description.slice(0, 250) : undefined,
        imageUrl: imageUrl || undefined,
        price: price || undefined,
        currency: currency || '€',
        siteName,
        url: finalUrl
      }
    } catch {
      return this.buildFallbackMetadata(formattedUrl)
    }
  }

  private async fetchHtmlSafe(url: string): Promise<{ finalUrl: string; html: string }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: BROWSER_HEADERS
      })
      const finalUrl = response.url || url
      const rawText = await response.text()
      return {
        finalUrl,
        html: rawText.slice(0, MAX_HTML_LENGTH)
      }
    } catch {
      return { finalUrl: url, html: '' }
    } finally {
      clearTimeout(timeout)
    }
  }

  private extractFromJsonLd(html: string): Partial<LinkMetadata> {
    const result: Partial<LinkMetadata> = {}
    const matches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []

    for (const match of matches) {
      try {
        const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
        const parsed = JSON.parse(jsonContent)
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed])

        for (const item of items) {
          if (item?.['@type'] === 'Product' || item?.['@type']?.includes?.('Product')) {
            if (item.name && !result.title) result.title = String(item.name)
            if (item.description && !result.description) result.description = String(item.description)

            if (!result.imageUrl) {
              if (typeof item.image === 'string') result.imageUrl = item.image
              else if (Array.isArray(item.image) && item.image[0]) {
                result.imageUrl =
                  typeof item.image[0] === 'string'
                    ? item.image[0]
                    : item.image[0]?.url || item.image[0]?.contentUrl
              } else if (item.image?.url) {
                result.imageUrl = item.image.url
              }
            }

            if (!result.price && item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers
              result.price = parseNumericPrice(offers?.price ?? offers?.lowPrice)
              if (offers?.priceCurrency) {
                result.currency = normalizeCurrency(offers.priceCurrency)
              }
            }
          }
        }
      } catch {
        // Ignore malformed JSON-LD blocks
      }
    }

    return result
  }

  private extractAmazonSpecifics(
    html: string,
    isAmazon: boolean,
    amazonAsin: string | null
  ): { title?: string; imageUrl?: string } {
    let title: string | undefined
    let imageUrl: string | undefined

    const amazonTitleMatch =
      html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i) ||
      html.match(/<h1[^>]+id=["']title["'][^>]*>([\s\S]*?)<\/h1>/i) ||
      html.match(/<span[^>]+id=["']title["'][^>]*>([\s\S]*?)<\/span>/i)

    if (amazonTitleMatch?.[1]) {
      title = decodeHtmlEntities(amazonTitleMatch[1]).trim()
    }

    const colorImagesMatch = html.match(/["']colorImages["']\s*:\s*\{\s*["']initial["']\s*:\s*(\[[\s\S]*?\])\s*\}/i)
    if (colorImagesMatch?.[1]) {
      try {
        const initial = JSON.parse(colorImagesMatch[1])
        if (Array.isArray(initial) && initial[0]) {
          const first = initial[0]
          if (typeof first.hiRes === 'string') imageUrl = first.hiRes
          else if (typeof first.large === 'string') imageUrl = first.large
          else if (first.main && typeof first.main === 'object') {
            const firstKey = Object.keys(first.main)[0]
            if (firstKey) imageUrl = firstKey
          }
        }
      } catch {
        // Ignore parse error
      }
    }

    if (!imageUrl) {
      const dynamicImgMatches = [...html.matchAll(/data-a-dynamic-image=["']([^"']+)["']/gi)]
      for (const m of dynamicImgMatches) {
        try {
          const decoded = decodeHtmlEntities(m[1] ?? '')
          const parsed = JSON.parse(decoded) as Record<string, unknown>
          const sorted = Object.entries(parsed).sort((a, b) => {
            const sizeA = Array.isArray(a[1]) ? (Number(a[1][0]) || 0) * (Number(a[1][1]) || 0) : 0
            const sizeB = Array.isArray(b[1]) ? (Number(b[1][0]) || 0) * (Number(b[1][1]) || 0) : 0
            return sizeB - sizeA
          })
          if (sorted[0]?.[0]) {
            imageUrl = sorted[0][0]
            break
          }
        } catch {
          // Ignore malformed attribute
        }
      }
    }

    if (!imageUrl) {
      const oldHiresMatch = html.match(/data-old-hires=["']([^"']+)["']/i)
      if (oldHiresMatch?.[1]?.startsWith('http')) {
        imageUrl = decodeHtmlEntities(oldHiresMatch[1])
      }
    }

    if (!imageUrl) {
      const landingImgMatch =
        html.match(/<img[^>]+id=["'](?:landingImage|imgBlkFront|main-image|ebooks-img-canvas|litb-canvas-img)["'][^>]+src=["']([^"']+)["']/i) ||
        html.match(/<img[^>]+src=["']([^"']+)["'][^>]+id=["'](?:landingImage|imgBlkFront|main-image|ebooks-img-canvas|litb-canvas-img)["']/i)
      if (landingImgMatch?.[1]?.startsWith('http')) {
        imageUrl = decodeHtmlEntities(landingImgMatch[1])
      }
    }

    if (!imageUrl && isAmazon) {
      const allMediaMatches = [
        ...html.matchAll(/https?:\/\/[a-z0-9.-]*(?:media-amazon|ssl-images-amazon)\.com\/images\/I\/[a-zA-Z0-9%_-]+\.(?:jpg|png|webp)/gi)
      ].map(m => m[0])
      const filtered = allMediaMatches.filter(
        u => !/transparent|pixel|sprite|play-icon|loading|badge|logo|icon|nav|nav2/i.test(u)
      )
      if (filtered[0]) {
        imageUrl = filtered[0]
      }
    }

    if (!imageUrl && amazonAsin) {
      imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${amazonAsin}.01._SCLZZZZZZZ_SX500_.jpg`
    }

    return { title, imageUrl }
  }

  private extractDomPrice(html: string): number | undefined {
    const offscreenPriceMatch =
      html.match(/<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>([^<]+)<\/span>/i) ||
      html.match(/<span[^>]+id=["']priceblock_ourprice["'][^>]*>([^<]+)<\/span>/i) ||
      html.match(/<span[^>]+id=["']priceblock_dealprice["'][^>]*>([^<]+)<\/span>/i) ||
      html.match(/<span[^>]+class=["'][^"']*priceToPay[^"']*["'][\s\S]*?<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>([^<]+)<\/span>/i)

    return offscreenPriceMatch?.[1] ? parseNumericPrice(offscreenPriceMatch[1]) : undefined
  }

  private resolveAbsoluteUrl(imageUrl: string, baseUrl: string): string {
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`
    }
    if (!imageUrl.startsWith('http')) {
      try {
        return new URL(imageUrl, baseUrl).toString()
      } catch {
        return imageUrl
      }
    }
    return imageUrl
  }

  private buildFallbackMetadata(formattedUrl: string): LinkMetadata {
    try {
      const host = new URL(formattedUrl).hostname.replace(/^www\./, '')
      const asin = extractAmazonAsin(formattedUrl)
      return {
        title: extractSlugTitle(formattedUrl) || `Article sur ${host}`,
        imageUrl: asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX500_.jpg` : undefined,
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
}

export const linkPreviewService = new LinkPreviewService()
