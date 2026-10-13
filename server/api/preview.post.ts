import { defineEventHandler, readBody } from 'h3'
import type { LinkMetadata } from '../../types'

export default defineEventHandler(async (event): Promise<LinkMetadata> => {
  const body = await readBody(event)
  const rawInput = body?.url?.trim() || ''

  if (!rawInput) {
    return { url: '' }
  }

  // Extract first valid HTTP/HTTPS URL from input (handles mobile share text like "Regarde https://amzn.to/...")
  const urlMatch = rawInput.match(/https?:\/\/[^\s"'<>]+/i)
  let formattedUrl = urlMatch ? urlMatch[0] : rawInput

  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl
  }

  try {
    const parsedUrl = new URL(formattedUrl)
    const siteName = parsedUrl.hostname.replace(/^www\./, '')
    const isAmazon = /(?:amazon\.|amzn\.to|amzn\.eu|zvg\.me)/i.test(parsedUrl.hostname)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    let finalUrl = formattedUrl
    let html = ''

    try {
      const response = await fetch(formattedUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
      })

      finalUrl = response.url || formattedUrl
      const rawText = await response.text()
      // Limit HTML length to avoid catastrophic regex backtracking on giant pages
      html = rawText.slice(0, 500000)
    } catch {
      // Fetch may fail or timeout on anti-bot protected pages
    } finally {
      clearTimeout(timeout)
    }

    // Helper for meta tags
    const getMeta = (prop: string): string | undefined => {
      const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
      return match ? decodeHtmlEntities(match[1]) : undefined
    }

    let title: string | undefined
    let description: string | undefined
    let imageUrl: string | undefined
    let price: number | undefined
    let currency: string = '€'

    // Extract Amazon ASIN if applicable
    const amazonAsin = isAmazon ? extractAmazonAsin(finalUrl) || extractAmazonAsin(formattedUrl) : null

    // 1. Try JSON-LD schema (schema.org/Product) used by Shopify, Fnac, Lego, Decathlon, etc.
    const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim()
        const parsed = JSON.parse(jsonContent)
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed])

        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type']?.includes?.('Product')) {
            if (item.name && !title) title = String(item.name)
            if (item.description && !description) description = String(item.description)

            if (!imageUrl) {
              if (typeof item.image === 'string') imageUrl = item.image
              else if (Array.isArray(item.image) && item.image[0]) {
                imageUrl = typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url || item.image[0]?.contentUrl
              } else if (item.image?.url) imageUrl = item.image.url
            }

            if (!price && item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers
              if (offers?.price) {
                const p = parseFloat(String(offers.price).replace(/[^0-9.,]/g, '').replace(',', '.'))
                if (!isNaN(p) && p > 0) price = p
              } else if (offers?.lowPrice) {
                const p = parseFloat(String(offers.lowPrice).replace(/[^0-9.,]/g, '').replace(',', '.'))
                if (!isNaN(p) && p > 0) price = p
              }
              if (offers?.priceCurrency) {
                currency = offers.priceCurrency === 'EUR' ? '€' : offers.priceCurrency === 'USD' ? '$' : offers.priceCurrency
              }
            }
          }
        }
      } catch {
        // Continue parsing
      }
    }

    // 2. Amazon & E-Commerce specific HTML parsing
    if (isAmazon || !imageUrl || !title) {
      // Amazon Title from HTML
      if (!title) {
        const amazonTitleMatch = html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)
          || html.match(/<h1[^>]+id=["']title["'][^>]*>([\s\S]*?)<\/h1>/i)
          || html.match(/<span[^>]+id=["']title["'][^>]*>([\s\S]*?)<\/span>/i)
        if (amazonTitleMatch) {
          title = decodeHtmlEntities(amazonTitleMatch[1]).trim()
        }
      }

      // Amazon Image Extraction:
      // a) colorImages JS object (initial gallery)
      if (!imageUrl) {
        const colorImagesMatch = html.match(/["']colorImages["']\s*:\s*\{\s*["']initial["']\s*:\s*(\[[\s\S]*?\])\s*\}/i)
        if (colorImagesMatch) {
          try {
            const initial = JSON.parse(colorImagesMatch[1])
            if (Array.isArray(initial) && initial[0]) {
              const first = initial[0]
              if (first.hiRes && typeof first.hiRes === 'string') imageUrl = first.hiRes
              else if (first.large && typeof first.large === 'string') imageUrl = first.large
              else if (first.main && typeof first.main === 'object') {
                const keys = Object.keys(first.main)
                if (keys.length > 0) imageUrl = keys[0]
              }
            }
          } catch {}
        }
      }

      // b) data-a-dynamic-image attributes
      if (!imageUrl) {
        const dynamicImgMatches = [...html.matchAll(/data-a-dynamic-image=["']([^"']+)["']/gi)]
        for (const m of dynamicImgMatches) {
          try {
            const decoded = decodeHtmlEntities(m[1])
            const parsed = JSON.parse(decoded)
            const sorted = Object.entries(parsed).sort((a, b) => {
              const sizeA = Array.isArray(a[1]) ? (Number(a[1][0]) || 0) * (Number(a[1][1]) || 0) : 0
              const sizeB = Array.isArray(b[1]) ? (Number(b[1][0]) || 0) * (Number(b[1][1]) || 0) : 0
              return sizeB - sizeA
            })
            if (sorted.length > 0 && sorted[0][0]) {
              imageUrl = sorted[0][0]
              break
            }
          } catch {}
        }
      }

      // c) data-old-hires attribute
      if (!imageUrl) {
        const oldHiresMatch = html.match(/data-old-hires=["']([^"']+)["']/i)
        if (oldHiresMatch && oldHiresMatch[1] && oldHiresMatch[1].startsWith('http')) {
          imageUrl = decodeHtmlEntities(oldHiresMatch[1])
        }
      }

      // d) Landing / Main image element
      if (!imageUrl) {
        const landingImgMatch = html.match(/<img[^>]+id=["'](?:landingImage|imgBlkFront|main-image|ebooks-img-canvas|litb-canvas-img)["'][^>]+src=["']([^"']+)["']/i)
          || html.match(/<img[^>]+src=["']([^"']+)["'][^>]+id=["'](?:landingImage|imgBlkFront|main-image|ebooks-img-canvas|litb-canvas-img)["']/i)
        if (landingImgMatch && landingImgMatch[1] && landingImgMatch[1].startsWith('http')) {
          imageUrl = decodeHtmlEntities(landingImgMatch[1])
        }
      }

      // e) media-amazon product image scanning
      if (!imageUrl && isAmazon) {
        const allMediaMatches = [...html.matchAll(/https?:\/\/[a-z0-9.-]*(?:media-amazon|ssl-images-amazon)\.com\/images\/I\/[a-zA-Z0-9%_-]+\.(?:jpg|png|webp)/gi)].map(m => m[0])
        const filtered = allMediaMatches.filter(u => !/transparent|pixel|sprite|play-icon|loading|badge|logo|icon|nav|nav2/i.test(u))
        if (filtered.length > 0) {
          imageUrl = filtered[0]
        }
      }

      // f) Amazon ASIN CDN Fallback
      if (!imageUrl && amazonAsin) {
        imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${amazonAsin}.01._SCLZZZZZZZ_SX500_.jpg`
      }
    }

    // 3. Price extraction
    if (!price) {
      // Amazon price elements
      const offscreenPriceMatch = html.match(/<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>([^<]+)<\/span>/i)
        || html.match(/<span[^>]+id=["']priceblock_ourprice["'][^>]*>([^<]+)<\/span>/i)
        || html.match(/<span[^>]+id=["']priceblock_dealprice["'][^>]*>([^<]+)<\/span>/i)
        || html.match(/<span[^>]+class=["'][^"']*priceToPay[^"']*["'][\s\S]*?<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>([^<]+)<\/span>/i)

      if (offscreenPriceMatch && offscreenPriceMatch[1]) {
        const raw = offscreenPriceMatch[1].replace(/[^0-9.,]/g, '').replace(',', '.')
        const p = parseFloat(raw)
        if (!isNaN(p) && p > 0) price = p
      }
    }

    // 4. OpenGraph & Standard Meta Tags fallback
    if (!title) {
      const rawTitle = getMeta('og:title') || getMeta('twitter:title')
      if (rawTitle) title = rawTitle
      else {
        const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
        if (titleTagMatch && titleTagMatch[1]) {
          title = decodeHtmlEntities(titleTagMatch[1]).trim()
        }
      }
    }

    // Fallback: title from URL slug if still not found
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
      if (priceMeta) {
        const parsed = parseFloat(priceMeta.replace(/[^0-9.,]/g, '').replace(',', '.'))
        if (!isNaN(parsed) && parsed > 0) {
          price = parsed
        }
      }
    }

    // 5. Clean up title
    if (title) {
      title = title
        .split(' | ')[0]
        .split(' - Amazon.fr')[0]
        .split(' : Amazon.fr')[0]
        .split(' - Amazon.com')[0]
        .split(' : Amazon.com')[0]
        .split(' - Fnac')[0]
        .split(' | Fnac')[0]
        .split(' | LEGO')[0]
        .split(' - Cdiscount')[0]
        .split(' - Zara')[0]
        .replace(/\s+/g, ' ')
        .trim()
    }

    // 6. Ensure absolute image URL and handle protocols
    if (imageUrl) {
      imageUrl = decodeHtmlEntities(imageUrl).trim()
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (!imageUrl.startsWith('http')) {
        try {
          imageUrl = new URL(imageUrl, finalUrl).toString()
        } catch {
          // Keep as is
        }
      }
    }

    // 7. General Price & Currency Regex Fallback if still not found
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
      description: description ? description.slice(0, 250) : undefined,
      imageUrl: imageUrl || undefined,
      price: price || undefined,
      currency: currency || '€',
      siteName,
      url: finalUrl
    }
  } catch (err) {
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
})

function decodeHtmlEntities(str: string): string {
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
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
}

function extractAmazonAsin(url: string): string | null {
  if (!url) return null
  const patterns = [
    /\/(?:dp|gp\/product|gp\/aw\/d|o\/ASIN|exec\/obidos\/ASIN|asin|product)\/([A-Z0-9]{10})(?:[/?&#]|$)/i,
    /\/([B0-9][A-Z0-9]{9})(?:[/?&#]|$)/i,
    /[?&]asin=([A-Z0-9]{10})(?:&|$)/i
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1].toUpperCase()
    }
  }
  return null
}

function extractSlugTitle(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname
    const slugMatch = pathname.match(/^\/([^/]+)\/(?:dp|gp\/product|asin)/i)
    if (slugMatch && slugMatch[1] && !['dp', 'gp', 'o', 'exec'].includes(slugMatch[1].toLowerCase())) {
      const rawSlug = decodeURIComponent(slugMatch[1].replace(/\+/g, ' '))
      const cleaned = rawSlug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
      if (cleaned.length > 2) {
        return cleaned
      }
    }
  } catch {}
  return undefined
}
