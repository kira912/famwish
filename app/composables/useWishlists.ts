import { ref, computed } from 'vue'
import confetti from 'canvas-confetti'
import type { Wishlist, WishlistItem, WishlistCategory } from '~/types'
import { useAuth } from './useAuth'
import { useToast } from './useToast'

const lists = ref<Wishlist[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref<WishlistCategory | 'all'>('all')

export function useWishlists() {
  const { currentUser, joinListId } = useAuth()
  const toast = useToast()

  const myLists = computed(() => {
    if (!currentUser.value) return []
    return lists.value.filter(l => l.ownerId === currentUser.value?.id)
  })

  const familyLists = computed(() => {
    if (!currentUser.value) return lists.value
    return lists.value.filter(l => {
      // Lists owned by others that I have joined or are shared
      return l.ownerId !== currentUser.value?.id && (
        l.members.includes(currentUser.value?.id || '') ||
        currentUser.value?.joinedListIds.includes(l.id) ||
        currentUser.value?.joinedListIds.includes(l.inviteCode)
      )
    })
  })

  const otherExploreLists = computed(() => {
    if (!currentUser.value) return []
    return lists.value.filter(l => {
      return l.ownerId !== currentUser.value?.id &&
        !l.members.includes(currentUser.value?.id || '') &&
        !currentUser.value?.joinedListIds.includes(l.id)
    })
  })

  const filteredLists = computed(() => {
    let result = lists.value

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
    isLoading.value = true
    try {
      const data = await $fetch<Wishlist[]>('/api/lists')
      if (data && Array.isArray(data)) {
        lists.value = data
        if (import.meta.client) {
          localStorage.setItem('famwish_lists_cache', JSON.stringify(data))
        }
      }
    } catch (err) {
      if (import.meta.client) {
        const cached = localStorage.getItem('famwish_lists_cache')
        if (cached) {
          lists.value = JSON.parse(cached)
        }
      }
    } finally {
      isLoading.value = false
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
      members: [currentUser.value.id],
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

      toast.festive('✨ Liste créée !', `Votre liste "${saved.title}" est prête à être partagée.`)
      triggerConfetti()
      return saved
    } catch (err) {
      // Local fallback
      lists.value.unshift(newList)
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
      toast.success('Liste mise à jour')
      return saved
    } catch (err) {
      const index = lists.value.findIndex(l => l.id === list.id)
      if (index >= 0) {
        lists.value[index] = list
      }
      return list
    }
  }

  async function deleteList(id: string): Promise<boolean> {
    try {
      await $fetch(`/api/lists/${id}`, { method: 'DELETE' })
      lists.value = lists.value.filter(l => l.id !== id)
      toast.info('Liste supprimée')
      return true
    } catch (err) {
      lists.value = lists.value.filter(l => l.id !== id)
      return true
    }
  }

  async function addItem(listId: string, itemPayload: Partial<WishlistItem>): Promise<WishlistItem | null> {
    const list = getList(listId)
    if (!list) return null

    const newItem: WishlistItem = {
      id: itemPayload.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      listId: list.id,
      title: itemPayload.title || 'Nouveau cadeau',
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
      toast.success('🎁 Cadeau ajouté !', saved.title)
      return saved
    } catch (err) {
      list.items.unshift(newItem)
      toast.success('Cadeau ajouté', newItem.title)
      return newItem
    }
  }

  async function updateItem(listId: string, item: WishlistItem): Promise<WishlistItem | null> {
    const list = getList(listId)
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
      toast.success('Cadeau modifié')
      return saved
    } catch (err) {
      const idx = list.items.findIndex(i => i.id === item.id)
      if (idx >= 0) {
        list.items[idx] = item
      }
      return item
    }
  }

  async function deleteItem(listId: string, itemId: string): Promise<boolean> {
    const list = getList(listId)
    if (!list) return false

    try {
      await $fetch(`/api/lists/${list.id}/items/${itemId}`, { method: 'DELETE' })
      list.items = list.items.filter(i => i.id !== itemId)
      toast.info('Cadeau retiré de la liste')
      return true
    } catch (err) {
      list.items = list.items.filter(i => i.id !== itemId)
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

    const prevPurchased = item.isPurchased

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
      return updated
    } catch (err) {
      // keep optimistic
      return item
    }
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
        try {
          const res = await $fetch<{ success: boolean; member: any; list: Wishlist }>(`/api/lists/${target.id}/join`, {
            method: 'POST',
            body: {
              id: activeUser.id,
              name: activeUser.name,
              avatar: activeUser.avatar,
              email: activeUser.email
            }
          })
          if (res?.list) {
            target = res.list
            const idx = lists.value.findIndex(l => l.id === target?.id)
            if (idx >= 0) {
              lists.value[idx] = res.list
            } else {
              lists.value.unshift(res.list)
            }
          }
        } catch (e) {
          console.warn('Could not register join on server:', e)
        }

        joinListId(target.id)
        joinListId(target.inviteCode)
      }

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
    otherExploreLists,
    filteredLists,
    fetchLists,
    getList,
    createList,
    updateList,
    deleteList,
    addItem,
    updateItem,
    deleteItem,
    togglePurchase,
    joinListByCode,
    triggerConfetti
  }
}
