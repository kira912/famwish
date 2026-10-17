import { ref, computed } from 'vue'
import confetti from 'canvas-confetti'
import type { Wishlist, WishlistItem, WishlistCategory, WishlistMember } from '~/types'
import { useAuth } from './useAuth'
import { useToast } from './useToast'

const lists = ref<Wishlist[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref<WishlistCategory | 'all'>('all')

function persistCache() {
  if (import.meta.client) {
    try {
      localStorage.setItem('famwish_lists_cache', JSON.stringify(lists.value))
    } catch {}
  }
}

export function useWishlists() {
  const { currentUser, joinListId } = useAuth()
  const toast = useToast()

  const myLists = computed(() => {
    if (!currentUser.value) return []
    return lists.value.filter(l => l.ownerId === currentUser.value?.id)
  })

  const familyLists = computed(() => {
    if (!currentUser.value) return []
    return lists.value.filter(l => {
      // Lists owned by others that I have joined or am a member of
      const isOwner = l.ownerId === currentUser.value?.id
      if (isOwner) return false

      const isMember = Array.isArray(l.members) && l.members.some((m: any) => {
        if (typeof m === 'string') return m === currentUser.value?.id
        return m?.id === currentUser.value?.id || (m?.name && m?.name.toLowerCase() === currentUser.value?.name.toLowerCase())
      })
      const isJoined = (currentUser.value?.joinedListIds || []).includes(l.id) ||
        (currentUser.value?.joinedListIds || []).map(x => x.toUpperCase()).includes(l.inviteCode.toUpperCase())

      return isMember || isJoined
    })
  })

  const filteredLists = computed(() => {
    if (!currentUser.value) return []
    let result = [...myLists.value, ...familyLists.value]

    if (selectedCategory.value !== 'all') {
      result = result.filter(l => l.category === selectedCategory.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(l => 
        l.title.toLowerCase().includes(q) ||
        l.ownerName.toLowerCase().includes(q) ||
        l.items.some(i => i.title.toLowerCase().includes(q))
      )
    }

    return result
  })

  async function fetchLists() {
    if (!currentUser.value) {
      lists.value = []
      return
    }

    isLoading.value = true
    try {
      const query: Record<string, string> = {
        userId: currentUser.value.id
      }
      if (currentUser.value.joinedListIds && currentUser.value.joinedListIds.length > 0) {
        query.joinedIds = currentUser.value.joinedListIds.join(',')
      }

      const data = await $fetch<Wishlist[]>('/api/lists', { query })
      if (data && Array.isArray(data)) {
        // Merge with any in-memory lists the user just joined to avoid race conditions
        const serverMap = new Map(data.map(l => [l.id, l]))
        const currentJoinedIds = currentUser.value?.joinedListIds || []
        for (const existing of lists.value) {
          if (
            !serverMap.has(existing.id) &&
            (existing.ownerId === currentUser.value?.id ||
              currentJoinedIds.includes(existing.id) ||
              currentJoinedIds.map(c => c.toUpperCase()).includes(existing.inviteCode.toUpperCase()))
          ) {
            serverMap.set(existing.id, existing)
          }
        }
        lists.value = Array.from(serverMap.values())
        persistCache()
      }
    } catch (err) {
      if (import.meta.client) {
        const cached = localStorage.getItem('famwish_lists_cache')
        if (cached) {
          try {
            lists.value = JSON.parse(cached)
          } catch (_) {}
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchListById(idOrCode: string): Promise<Wishlist | null> {
    try {
      const data = await $fetch<Wishlist>(`/api/lists/${encodeURIComponent(idOrCode)}`)
      if (data) {
        const index = lists.value.findIndex(l => l.id === data.id)
        if (index >= 0) {
          lists.value[index] = data
        } else {
          lists.value.push(data)
        }
        persistCache()
        return data
      }
      return null
    } catch (err) {
      return getList(idOrCode) || null
    }
  }

  function getList(idOrCode: string): Wishlist | undefined {
    return lists.value.find(
      l => l.id === idOrCode || l.inviteCode.toUpperCase() === idOrCode.toUpperCase()
    )
  }

  async function createList(payload: Partial<Wishlist>): Promise<Wishlist | null> {
    if (!currentUser.value) {
      toast.error('Connexion requise', 'Connectez-vous pour créer une liste de souhaits')
      return null
    }

    const ownerMember: WishlistMember = {
      id: currentUser.value.id,
      name: currentUser.value.name,
      avatar: currentUser.value.avatar,
      joinedAt: new Date().toISOString(),
      role: 'owner'
    }

    const newList: Wishlist = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ownerId: currentUser.value.id,
      ownerName: currentUser.value.name,
      ownerAvatar: currentUser.value.avatar,
      title: payload.title || 'Ma Liste de Souhaits',
      description: payload.description || '',
      category: payload.category || 'christmas',
      eventDate: payload.eventDate,
      coverEmoji: payload.coverEmoji || (payload.category === 'christmas' ? '🎄' : '🎁'),
      coverGradient: payload.coverGradient || 'from-rose-500 via-brand-600 to-pine-700',
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      members: [ownerMember],
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const saved = await $fetch<Wishlist>('/api/lists', {
        method: 'POST',
        body: newList
      })
      
      const index = lists.value.findIndex(l => l.id === saved.id)
      if (index >= 0) {
        lists.value[index] = saved
      } else {
        lists.value.unshift(saved)
      }
      persistCache()

      toast.festive('✨ Liste créée !', `Votre liste "${saved.title}" est prête à être partagée.`)
      triggerConfetti()
      return saved
    } catch (err) {
      // Local fallback
      lists.value.unshift(newList)
      persistCache()
      toast.success('Liste créée (mode local)', newList.title)
      return newList
    }
  }

  async function updateList(list: Wishlist): Promise<Wishlist | null> {
    try {
      const saved = await $fetch<Wishlist>('/api/lists', {
        method: 'POST',
        body: list
      })
      const index = lists.value.findIndex(l => l.id === saved.id)
      if (index >= 0) {
        lists.value[index] = saved
      }
      persistCache()
      toast.success('Liste mise à jour')
      return saved
    } catch (err) {
      const index = lists.value.findIndex(l => l.id === list.id)
      if (index >= 0) {
        lists.value[index] = list
      }
      persistCache()
      return list
    }
  }

  async function deleteList(id: string): Promise<boolean> {
    try {
      await $fetch(`/api/lists/${id}`, { method: 'DELETE' })
      lists.value = lists.value.filter(l => l.id !== id)
      persistCache()
      toast.info('Liste supprimée')
      return true
    } catch (err) {
      lists.value = lists.value.filter(l => l.id !== id)
      persistCache()
      return true
    }
  }

  async function addItem(listId: string, itemPayload: Partial<WishlistItem>): Promise<WishlistItem | null> {
    let list = getList(listId)
    if (!list) {
      list = (await fetchListById(listId)) || undefined
    }
    if (!list) return null

    const recipient = itemPayload.recipientName || currentUser.value?.name || list.ownerName || 'Moi'
    const isCurrentUserRecipient = currentUser.value?.name && recipient.toLowerCase() === currentUser.value.name.toLowerCase()

    const newItem: WishlistItem = {
      id: itemPayload.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      listId: list.id,
      title: itemPayload.title || 'Nouveau cadeau',
      recipientName: recipient,
      recipientId: itemPayload.recipientId || (isCurrentUserRecipient ? currentUser.value?.id : undefined),
      recipientAvatar: itemPayload.recipientAvatar || (isCurrentUserRecipient ? currentUser.value?.avatar : undefined),
      description: itemPayload.description,
      url: itemPayload.url,
      imageUrl: itemPayload.imageUrl,
      price: itemPayload.price,
      currency: itemPayload.currency || '€',
      quantity: itemPayload.quantity || 1,
      colorOrVariant: itemPayload.colorOrVariant,
      comment: itemPayload.comment,
      isFavorite: itemPayload.isFavorite || false,
      priority: itemPayload.priority || 'medium',
      isPurchased: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const saved = await $fetch<WishlistItem>(`/api/lists/${list.id}/items`, {
        method: 'POST',
        body: newItem
      })
      const idx = list.items.findIndex(i => i.id === saved.id)
      if (idx >= 0) {
        list.items[idx] = saved
      } else {
        list.items.unshift(saved)
      }
      persistCache()
      toast.success('🎁 Cadeau ajouté !', saved.title)
      return saved
    } catch (err) {
      list.items.unshift(newItem)
      persistCache()
      toast.success('Cadeau ajouté', newItem.title)
      return newItem
    }
  }

  async function updateItem(listId: string, item: WishlistItem): Promise<WishlistItem | null> {
    let list = getList(listId)
    if (!list) {
      list = (await fetchListById(listId)) || undefined
    }
    if (!list) return null

    try {
      const saved = await $fetch<WishlistItem>(`/api/lists/${list.id}/items`, {
        method: 'POST',
        body: item
      })
      const idx = list.items.findIndex(i => i.id === saved.id)
      if (idx >= 0) {
        list.items[idx] = saved
      }
      persistCache()
      toast.success('Cadeau modifié')
      return saved
    } catch (err) {
      const idx = list.items.findIndex(i => i.id === item.id)
      if (idx >= 0) {
        list.items[idx] = item
      }
      persistCache()
      return item
    }
  }

  async function deleteItem(listId: string, itemId: string): Promise<boolean> {
    const list = getList(listId)
    if (!list) return false

    try {
      await $fetch(`/api/lists/${list.id}/items/${itemId}`, { method: 'DELETE' })
      list.items = list.items.filter(i => i.id !== itemId)
      persistCache()
      toast.info('Cadeau retiré de la liste')
      return true
    } catch (err) {
      list.items = list.items.filter(i => i.id !== itemId)
      persistCache()
      return true
    }
  }

  async function togglePurchase(
    listId: string,
    itemId: string,
    purchased: boolean,
    anonymous: boolean = true
  ): Promise<WishlistItem | null> {
    const list = getList(listId)
    if (!list) return null

    const item = list.items.find(i => i.id === itemId)
    if (!item) return null

    // Optimistic UI update
    item.isPurchased = purchased
    if (purchased) {
      item.purchasedBy = {
        isAnonymous: anonymous,
        name: anonymous ? 'Anonyme' : (currentUser.value?.name || 'Un proche'),
        userId: currentUser.value?.id
      }
      item.purchasedAt = new Date().toISOString()
      
      triggerConfetti()
      toast.festive(
        '🎉 Cadeau réservé en secret !',
        anonymous 
          ? 'Coché anonymement ! Le destinataire aura la surprise le jour J.'
          : `Réservé par ${currentUser.value?.name || 'vous'}.`
      )
    } else {
      item.purchasedBy = undefined
      item.purchasedAt = undefined
      toast.info('Réservation annulée', 'Le cadeau est de nouveau disponible.')
    }

    try {
      const updated = await $fetch<WishlistItem>(`/api/lists/${list.id}/items/${itemId}/purchase`, {
        method: 'POST',
        body: {
          purchased,
          anonymous,
          user: currentUser.value ? { id: currentUser.value.id, name: currentUser.value.name } : undefined
        }
      })
      persistCache()
      return updated
    } catch (err) {
      persistCache()
      return item
    }
  }

  function ensureLocalMemberAdded(target: Wishlist, user: { id?: string; name: string; avatar?: string }) {
    const cleanName = user.name.trim()
    if (!cleanName) return
    if (!Array.isArray(target.members)) {
      target.members = []
    }
    const existingIdx = target.members.findIndex((m: any) => {
      if (typeof m === 'string') return m === user.id || m.toLowerCase() === cleanName.toLowerCase()
      return (user.id && m?.id === user.id) || (m?.name && String(m.name).trim().toLowerCase() === cleanName.toLowerCase())
    })
    const memberObj: WishlistMember = {
      id: user.id || `user-${Date.now()}`,
      name: cleanName,
      avatar: user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanName)}`,
      joinedAt: new Date().toISOString(),
      role: user.id === target.ownerId ? 'owner' : 'member'
    }
    if (existingIdx >= 0) {
      if (typeof target.members[existingIdx] === 'string') {
        target.members[existingIdx] = memberObj
      }
    } else {
      target.members.push(memberObj)
    }
  }

  async function syncMemberOnServer(listIdOrCode: string, user?: { id?: string; name: string; avatar?: string; email?: string } | null): Promise<Wishlist | null> {
    const activeUser = user || currentUser.value
    if (!activeUser || !activeUser.name) return null

    let target = getList(listIdOrCode)
    if (target) {
      ensureLocalMemberAdded(target, activeUser)
    }

    try {
      const res = await $fetch<{ success: boolean; member: any; list: Wishlist }>(`/api/lists/${encodeURIComponent(listIdOrCode)}/join`, {
        method: 'POST',
        body: {
          id: activeUser.id,
          name: activeUser.name,
          avatar: activeUser.avatar,
          email: activeUser.email
        }
      })
      if (res?.list) {
        const idx = lists.value.findIndex(l => l.id === res.list.id)
        if (idx >= 0) {
          lists.value[idx] = res.list
        } else {
          lists.value.unshift(res.list)
        }
        persistCache()
        return res.list
      }
    } catch (e) {
      console.warn('Could not register join on server:', e)
    }
    return target || null
  }

  async function joinListByCode(codeOrId: string, memberProfile?: { id?: string; name: string; avatar?: string; email?: string }): Promise<Wishlist | null> {
    const cleanCode = codeOrId.trim()
    if (!cleanCode) return null

    // Check if list already in local store or fetch it
    let target = getList(cleanCode)

    if (!target) {
      try {
        target = await $fetch<Wishlist>(`/api/lists/${encodeURIComponent(cleanCode)}`)
        if (target) {
          const exists = lists.value.some(l => l.id === target?.id)
          if (!exists) {
            lists.value.unshift(target)
          }
        }
      } catch (err) {
        toast.error('Liste introuvable', `Aucune liste trouvée avec le code "${cleanCode}"`)
        return null
      }
    }

    if (target) {
      const activeUser = memberProfile || currentUser.value
      if (activeUser && activeUser.name) {
        joinListId(target.id)
        joinListId(target.inviteCode)
        const synced = await syncMemberOnServer(target.id, activeUser)
        if (synced) {
          target = synced
        }
      }

      persistCache()
      toast.festive('✨ Liste rejointe !', `Vous avez rejoint "${target.title}" de ${target.ownerName}`)
      triggerConfetti()
      return target
    }

    return null
  }

  function triggerConfetti() {
    if (!import.meta.client) return
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#f43f5e', '#fb7185', '#eab308', '#22c55e', '#38bdf8']
      })
    } catch {
      // Ignore if confetti not supported
    }
  }

  return {
    lists,
    isLoading,
    searchQuery,
    selectedCategory,
    myLists,
    familyLists,
    filteredLists,
    fetchLists,
    fetchListById,
    getList,
    createList,
    updateList,
    deleteList,
    addItem,
    updateItem,
    deleteItem,
    togglePurchase,
    joinListByCode,
    syncMemberOnServer,
    triggerConfetti
  }
}
