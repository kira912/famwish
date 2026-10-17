import type { Wishlist, WishlistItem, UserProfile } from '../../types'
import { getPgPool, initPostgresSchema, mapRowToWishlist, mapRowToWishlistItem } from './postgres'

// In-memory fallback store when PostgreSQL is not configured
let listsStore: Wishlist[] = []

// Fetch lists for a specific user (their own lists + joined lists)
export async function getLists(userId?: string, joinedIds: string[] = []): Promise<Wishlist[]> {
  const cleanUserId = userId ? userId.trim() : null
  const cleanJoinedIds = Array.isArray(joinedIds) ? joinedIds.map(s => s.trim()).filter(Boolean) : []
  const cleanUpperJoinedCodes = cleanJoinedIds.map(s => s.toUpperCase())

  // If no user is identified and no joined lists provided, return empty array to protect privacy
  if (!cleanUserId && cleanJoinedIds.length === 0) {
    return []
  }

  const pool = getPgPool()
  if (pool) {
    await initPostgresSchema()
    const query = `
      SELECT * FROM wishlists
      WHERE ($1::text IS NOT NULL AND owner_id = $1)
         OR ($1::text IS NOT NULL AND members::text LIKE ('%' || $1 || '%'))
         OR id = ANY($2::text[])
         OR UPPER(invite_code) = ANY($3::text[])
      ORDER BY created_at DESC
    `
    const { rows: listRows } = await pool.query(query, [
      cleanUserId,
      cleanJoinedIds,
      cleanUpperJoinedCodes
    ])
    if (listRows.length === 0) {
      return []
    }
    const listIds = listRows.map(r => r.id)
    const { rows: itemRows } = await pool.query(
      'SELECT * FROM wishlist_items WHERE list_id = ANY($1::text[]) ORDER BY created_at ASC',
      [listIds]
    )
    return listRows.map(row => {
      const items = itemRows.filter(i => i.list_id === row.id).map(mapRowToWishlistItem)
      return mapRowToWishlist(row, items)
    })
  }

  return listsStore.filter(l => {
    const isOwner = Boolean(cleanUserId && l.ownerId === cleanUserId)
    const isMember = Boolean(cleanUserId && (
      (Array.isArray(l.members) && l.members.some((m: any) => {
        if (typeof m === 'string') return m === cleanUserId || m.toLowerCase() === cleanUserId.toLowerCase()
        return m?.id === cleanUserId || (m?.name && m?.name.toLowerCase() === cleanUserId.toLowerCase())
      }))
    ))
    const isJoined = cleanJoinedIds.some(id => 
      id.toLowerCase() === l.id.toLowerCase() || 
      id.toUpperCase() === l.inviteCode.toUpperCase()
    )
    return isOwner || isMember || isJoined
  })
}

// Fetch single list by ID or Invite Code
export async function getListById(id: string): Promise<Wishlist | null> {
  const pool = getPgPool()
  if (pool) {
    await initPostgresSchema()
    const { rows: listRows } = await pool.query(
      'SELECT * FROM wishlists WHERE id = $1 OR UPPER(invite_code) = UPPER($1) LIMIT 1',
      [id]
    )
    if (listRows.length === 0) return null
    const listRow = listRows[0]
    const { rows: itemRows } = await pool.query(
      'SELECT * FROM wishlist_items WHERE list_id = $1 ORDER BY created_at ASC',
      [listRow.id]
    )
    return mapRowToWishlist(listRow, itemRows.map(mapRowToWishlistItem))
  }
  const found = listsStore.find(l => l.id === id || l.inviteCode.toUpperCase() === id.toUpperCase())
  return found || null
}

// Helper to merge member lists without losing joined members
function mergeMembersList(existingMembers: any[] = [], incomingMembers: any[] = []): any[] {
  const result: any[] = []
  const all = [...existingMembers, ...incomingMembers]

  for (const m of all) {
    if (!m) continue
    if (typeof m === 'string') {
      const cleanStr = m.trim()
      if (!cleanStr) continue
      const alreadyHas = result.some(r =>
        (typeof r === 'string' && r.toLowerCase() === cleanStr.toLowerCase()) ||
        (typeof r === 'object' && (r.id === cleanStr || (r.name && r.name.toLowerCase() === cleanStr.toLowerCase())))
      )
      if (!alreadyHas) {
        result.push(cleanStr)
      }
    } else if (typeof m === 'object' && m.name) {
      const cleanName = String(m.name).trim()
      if (!cleanName) continue
      const existingIdx = result.findIndex(r => {
        if (typeof r === 'string') {
          return r === m.id || r.toLowerCase() === cleanName.toLowerCase()
        }
        return (m.id && r.id === m.id) || (r.name && String(r.name).trim().toLowerCase() === cleanName.toLowerCase())
      })
      if (existingIdx >= 0) {
        result[existingIdx] = {
          ...(typeof result[existingIdx] === 'object' ? result[existingIdx] : {}),
          ...m,
          name: cleanName
        }
      } else {
        result.push({
          ...m,
          name: cleanName
        })
      }
    }
  }
  return result
}

// Create or update a wishlist
export async function saveList(list: Wishlist): Promise<Wishlist> {
  const existing = await getListById(list.id)
  const mergedMembers = mergeMembersList(
    existing?.members || [],
    Array.isArray(list.members) ? list.members : []
  )

  // Ensure owner is present as a full member object
  if (list.ownerName) {
    const ownerObj = {
      id: list.ownerId,
      name: list.ownerName,
      avatar: list.ownerAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(list.ownerName)}`,
      joinedAt: list.createdAt || new Date().toISOString(),
      role: 'owner' as const
    }
    list.members = mergeMembersList([ownerObj], mergedMembers)
  } else {
    list.members = mergedMembers
  }

  const pool = getPgPool()
  if (pool) {
    await initPostgresSchema()
    const now = new Date().toISOString()
    const query = `
      INSERT INTO wishlists (
        id, owner_id, owner_name, owner_avatar, title, description, category,
        event_date, cover_emoji, cover_gradient, invite_code, members, is_archived,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        owner_name = EXCLUDED.owner_name,
        owner_avatar = EXCLUDED.owner_avatar,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        event_date = EXCLUDED.event_date,
        cover_emoji = EXCLUDED.cover_emoji,
        cover_gradient = EXCLUDED.cover_gradient,
        invite_code = EXCLUDED.invite_code,
        members = EXCLUDED.members,
        is_archived = EXCLUDED.is_archived,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `
    const values = [
      list.id,
      list.ownerId,
      list.ownerName,
      list.ownerAvatar || null,
      list.title,
      list.description || null,
      list.category || 'christmas',
      list.eventDate || null,
      list.coverEmoji || null,
      list.coverGradient || null,
      list.inviteCode,
      JSON.stringify(list.members || []),
      list.isArchived || false,
      list.createdAt || now,
      now
    ]

    const { rows } = await pool.query(query, values)
    
    // Save items if any exist
    if (list.items && list.items.length > 0) {
      for (const item of list.items) {
        await saveItem(list.id, item)
      }
    }

    const updated = await getListById(list.id)
    return updated || mapRowToWishlist(rows[0], list.items || [])
  }

  const index = listsStore.findIndex(l => l.id === list.id)
  if (index >= 0) {
    listsStore[index] = { ...list, updatedAt: new Date().toISOString() }
    return listsStore[index]
  } else {
    listsStore.unshift({ ...list, updatedAt: new Date().toISOString() })
    return list
  }
}

// Delete list
export async function deleteList(id: string): Promise<boolean> {
  const pool = getPgPool()
  if (pool) {
    await initPostgresSchema()
    const res = await pool.query('DELETE FROM wishlists WHERE id = $1', [id])
    return (res.rowCount ?? 0) > 0
  }
  const index = listsStore.findIndex(l => l.id === id)
  if (index >= 0) {
    listsStore.splice(index, 1)
    return true
  }
  return false
}

// Add a member to a wishlist
export async function addMemberToList(
  listIdOrCode: string,
  member: { id: string; name: string; avatar?: string; email?: string }
): Promise<Wishlist | null> {
  const target = await getListById(listIdOrCode)
  if (!target) return null

  const pool = getPgPool()
  const currentMembers = Array.isArray(target.members) ? [...target.members] : []

  const cleanName = member.name.trim()
  const memberObj = {
    id: member.id,
    name: cleanName,
    avatar: member.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanName)}`,
    joinedAt: new Date().toISOString(),
    role: member.id === target.ownerId ? ('owner' as const) : ('member' as const)
  }

  const updatedMembers = mergeMembersList(currentMembers, [memberObj])
  target.members = updatedMembers

  if (pool) {
    await initPostgresSchema()
    await pool.query(
      'UPDATE wishlists SET members = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(updatedMembers), target.id]
    )
  } else {
    const idx = listsStore.findIndex(l => l.id === target.id)
    if (idx >= 0) {
      listsStore[idx].members = updatedMembers
      listsStore[idx].updatedAt = new Date().toISOString()
    }
  }

  return await getListById(target.id)
}

// Save or add item
export async function saveItem(listId: string, item: WishlistItem): Promise<WishlistItem | null> {
  const target = await getListById(listId)
  if (!target) return null
  const actualListId = target.id

  const pool = getPgPool()
  if (pool) {
    await initPostgresSchema()
    const now = new Date().toISOString()
    const query = `
      INSERT INTO wishlist_items (
        id, list_id, title, recipient_name, recipient_id, recipient_avatar,
        description, url, image_url, price, currency,
        quantity, color_or_variant, comment, is_favorite, priority, is_purchased,
        purchased_by, purchased_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        recipient_name = EXCLUDED.recipient_name,
        recipient_id = EXCLUDED.recipient_id,
        recipient_avatar = EXCLUDED.recipient_avatar,
        description = EXCLUDED.description,
        url = EXCLUDED.url,
        image_url = EXCLUDED.image_url,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        quantity = EXCLUDED.quantity,
        color_or_variant = EXCLUDED.color_or_variant,
        comment = EXCLUDED.comment,
        is_favorite = EXCLUDED.is_favorite,
        priority = EXCLUDED.priority,
        is_purchased = EXCLUDED.is_purchased,
        purchased_by = EXCLUDED.purchased_by,
        purchased_at = EXCLUDED.purchased_at,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `
    const values = [
      item.id,
      actualListId,
      item.title,
      item.recipientName || null,
      item.recipientId || null,
      item.recipientAvatar || null,
      item.description || null,
      item.url || null,
      item.imageUrl || null,
      item.price != null ? item.price : null,
      item.currency || '€',
      item.quantity || 1,
      item.colorOrVariant || null,
      item.comment || null,
      item.isFavorite || false,
      item.priority || 'medium',
      item.isPurchased || false,
      item.purchasedBy ? JSON.stringify(item.purchasedBy) : null,
      item.purchasedAt || null,
      item.createdAt || now,
      now
    ]

    const { rows } = await pool.query(query, values)
    return mapRowToWishlistItem(rows[0])
  }

  const list = target

  const itemIndex = list.items.findIndex(i => i.id === item.id)
  if (itemIndex >= 0) {
    list.items[itemIndex] = { ...item, listId: actualListId, updatedAt: new Date().toISOString() }
  } else {
    list.items.unshift({ ...item, listId: actualListId, updatedAt: new Date().toISOString() })
  }
  list.updatedAt = new Date().toISOString()
  return item
}

// Delete item
export async function deleteItem(listId: string, itemId: string): Promise<boolean> {
  const target = await getListById(listId)
  if (!target) return false
  const actualListId = target.id

  const pool = getPgPool()
  if (pool) {
    await initPostgresSchema()
    const res = await pool.query('DELETE FROM wishlist_items WHERE id = $1 AND list_id = $2', [itemId, actualListId])
    return (res.rowCount ?? 0) > 0
  }
  const list = target

  const itemIndex = list.items.findIndex(i => i.id === itemId)
  if (itemIndex >= 0) {
    list.items.splice(itemIndex, 1)
    list.updatedAt = new Date().toISOString()
    return true
  }
  return false
}

// Toggle purchase (reserve anonymously)
export async function togglePurchaseItem(
  listId: string,
  itemId: string,
  purchased: boolean,
  purchaserName?: string,
  anonymous: boolean = true,
  userId?: string
): Promise<WishlistItem | null> {
  const target = await getListById(listId)
  if (!target) return null
  const actualListId = target.id

  const pool = getPgPool()
  if (pool) {
    await initPostgresSchema()
    const now = new Date().toISOString()
    const purchasedBy = purchased
      ? JSON.stringify({
          isAnonymous: anonymous,
          name: anonymous ? (purchaserName || 'Père Noël Secret') : purchaserName,
          userId: userId || undefined
        })
      : null

    const query = `
      UPDATE wishlist_items
      SET is_purchased = $1,
          purchased_by = $2,
          purchased_at = $3,
          updated_at = $4
      WHERE id = $5 AND list_id = $6
      RETURNING *;
    `
    const { rows } = await pool.query(query, [
      purchased,
      purchasedBy,
      purchased ? now : null,
      now,
      itemId,
      actualListId
    ])

    if (rows.length === 0) return null
    return mapRowToWishlistItem(rows[0])
  }

  const list = target

  const item = list.items.find(i => i.id === itemId)
  if (!item) return null

  item.isPurchased = purchased
  if (purchased) {
    item.purchasedAt = new Date().toISOString()
    item.purchasedBy = {
      isAnonymous: anonymous,
      name: anonymous ? (purchaserName || 'Père Noël Secret') : purchaserName,
      userId: userId || undefined
    }
  } else {
    item.purchasedAt = undefined
    item.purchasedBy = undefined
  }
  item.updatedAt = new Date().toISOString()
  list.updatedAt = new Date().toISOString()

  return item
}
