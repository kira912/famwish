<script setup lang="ts">
import { ref, reactive, computed, inject, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Users,
  Plus,
  Lock,
  Heart,
  Calendar,
  Search,
  Sparkles,
  Edit2,
  Trash2,
  Copy,
  Check,
  Gift,
  Baby,
  UserCheck,
  UserMinus,
  X
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import type { Wishlist, WishlistItem } from '~/types'

const route = useRoute()
const router = useRouter()
const {
  getList,
  fetchListById,
  deleteList,
  deleteItem,
  syncMemberOnServer,
  addChildMember,
  removeMember,
  removeChildMember
} = useWishlists()
const { currentUser, joinListId } = useAuth()
const toast = useToast()

const openShareModal = inject<(list: Wishlist) => void>('openShareModal')

const listId = computed(() => route.params.id as string)

const list = computed(() => {
  return getList(listId.value)
})

const isOwner = computed(() => {
  return list.value?.ownerId === currentUser.value?.id
})

const isChristmasList = computed(() => {
  if (!list.value) return false
  return list.value.category === 'christmas' ||
    list.value.title.toLowerCase().includes('noël') ||
    list.value.title.toLowerCase().includes('noel') ||
    list.value.title.toLowerCase().includes('christmas')
})

// Modals
const isAddItemOpen = ref(false)
const itemToEdit = ref<WishlistItem | null>(null)
const isEditListOpen = ref(false)
const isInviteModalOpen = ref(false)
const isChildModalOpen = ref(false)
const isCodeCopied = ref(false)

// Item filters
const filterStatus = ref<'all' | 'favorites' | 'available' | 'purchased'>('all')
const selectedRecipient = ref<string>('all')
const itemSearch = ref('')

export interface RecipientEntry {
  key: string
  id?: string
  name: string
  avatar?: string
  role?: 'owner' | 'member' | 'child'
  isChild?: boolean
  parentId?: string
  parentName?: string
  age?: number
  count: number
  availableCount: number
}

const recipientsList = computed<RecipientEntry[]>(() => {
  if (!list.value) return []
  const map = new Map<string, RecipientEntry>()

  const addOrGetRecipient = (
    rawName: unknown,
    avatar?: string,
    role?: 'owner' | 'member' | 'child',
    meta?: { id?: string; isChild?: boolean; parentId?: string; parentName?: string; age?: number }
  ) => {
    if (typeof rawName !== 'string') return null
    const cleanName = rawName.trim()
    if (!cleanName || cleanName.startsWith('user-') || cleanName.startsWith('google-') || cleanName.startsWith('child-')) return null
    const key = cleanName.toLowerCase()
    const isChild = Boolean(meta?.isChild || role === 'child')
    if (!map.has(key)) {
      map.set(key, {
        key,
        id: meta?.id,
        name: cleanName,
        avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanName)}`,
        role: isChild ? 'child' : role,
        isChild,
        parentId: meta?.parentId,
        parentName: meta?.parentName,
        age: meta?.age,
        count: 0,
        availableCount: 0
      })
    } else {
      const existing = map.get(key)!
      if (avatar && !existing.avatar) existing.avatar = avatar
      if (meta?.id && !existing.id) existing.id = meta.id
      if (role === 'owner') existing.role = 'owner'
      if (isChild) {
        existing.role = 'child'
        existing.isChild = true
        if (meta?.parentId) existing.parentId = meta.parentId
        if (meta?.parentName) existing.parentName = meta.parentName
        if (meta?.age !== undefined) existing.age = meta.age
        if (avatar) existing.avatar = avatar
      }
    }
    return map.get(key)!
  }

  const owner = list.value.ownerName || 'Moi'
  addOrGetRecipient(owner, list.value.ownerAvatar, 'owner', { id: list.value.ownerId })

  if (Array.isArray(list.value.members)) {
    list.value.members.forEach((m: any) => {
      if (typeof m === 'object' && m !== null && m.name) {
        const isChild = Boolean(m.isChild || m.role === 'child')
        addOrGetRecipient(m.name, m.avatar, isChild ? 'child' : (m.role || 'member'), {
          id: m.id,
          isChild,
          parentId: m.parentId,
          parentName: m.parentName,
          age: m.age !== undefined && m.age !== null && !isNaN(Number(m.age)) ? Number(m.age) : undefined
        })
      } else if (typeof m === 'string') {
        addOrGetRecipient(m, undefined, 'member')
      }
    })
  }

  list.value.items.forEach(i => {
    const rawRec = typeof i.recipientName === 'string' ? i.recipientName.trim() : ''
    const recName = rawRec || owner
    const rec = addOrGetRecipient(recName, i.recipientAvatar, 'member')
    if (rec) {
      rec.count += 1
      if (!i.isPurchased) {
        rec.availableCount += 1
      }
    }
  })

  return Array.from(map.values())
})

// Adult members who can be selected as a parent for a child
const adultMembers = computed(() => {
  const adults = recipientsList.value.filter(r => !r.isChild && r.role !== 'child')
  if (currentUser.value?.name) {
    const exists = adults.some(a => a.name.toLowerCase() === currentUser.value!.name.trim().toLowerCase())
    if (!exists) {
      adults.unshift({
        key: currentUser.value.name.trim().toLowerCase(),
        id: currentUser.value.id,
        name: currentUser.value.name.trim(),
        avatar: currentUser.value.avatar,
        role: isOwner.value ? 'owner' : 'member',
        count: 0,
        availableCount: 0
      })
    }
  }
  return adults
})

const childrenMembers = computed(() => {
  return recipientsList.value.filter(r => r.isChild || r.role === 'child')
})

const selectedMemberObj = computed<RecipientEntry | null>(() => {
  if (selectedRecipient.value === 'all') return null
  return recipientsList.value.find(
    r => r.name.toLowerCase() === selectedRecipient.value.toLowerCase()
  ) || null
})

function getChildInfo(recipientName?: string) {
  if (!recipientName) return null
  const found = recipientsList.value.find(
    r => (r.isChild || r.role === 'child') && r.name.toLowerCase() === recipientName.trim().toLowerCase()
  )
  if (!found) return null
  return {
    name: found.name,
    parentName: found.parentName || list.value?.ownerName,
    age: found.age
  }
}

function isMemberListOwner(member: RecipientEntry): boolean {
  if (member.role === 'owner') return true
  if (list.value?.ownerId && member.id && member.id === list.value.ownerId) return true
  if (
    list.value?.ownerName &&
    member.name.trim().toLowerCase() === list.value.ownerName.trim().toLowerCase()
  ) {
    return true
  }
  return false
}

function canManageChild(child: RecipientEntry): boolean {
  if (isOwner.value) return true
  if (!currentUser.value) return false
  if (child.parentId && child.parentId === currentUser.value.id) return true
  if (
    child.parentName &&
    currentUser.value.name &&
    child.parentName.trim().toLowerCase() === currentUser.value.name.trim().toLowerCase()
  ) {
    return true
  }
  return false
}

function canRemoveMember(member: RecipientEntry): boolean {
  if (isMemberListOwner(member)) return false
  if (isOwner.value) return true
  if ((member.isChild || member.role === 'child') && canManageChild(member)) {
    return true
  }
  return false
}

function canManageItem(item: WishlistItem): boolean {
  if (isOwner.value) return true
  if (!currentUser.value) return false
  const recName = (item.recipientName || list.value?.ownerName || '').trim().toLowerCase()
  if (recName && currentUser.value.name && recName === currentUser.value.name.trim().toLowerCase()) {
    return true
  }
  const child = recipientsList.value.find(
    r => (r.isChild || r.role === 'child') && r.name.toLowerCase() === recName
  )
  if (child && canManageChild(child)) {
    return true
  }
  return false
}

// Child Modal State & Logic
const editingChildId = ref<string | undefined>(undefined)
const showCustomParentInput = ref(false)
const isSavingChild = ref(false)
const childAvatarSeeds = ['Leo', 'Lily', 'Felix', 'Mia', 'Lucas', 'Chloe', 'Noa', 'Emma']

const childForm = reactive({
  name: '',
  age: undefined as number | undefined,
  parentName: '',
  parentId: undefined as string | undefined,
  avatarSeed: 'Leo'
})

const computedChildAvatar = computed(() => {
  const seed = childForm.avatarSeed || childForm.name.trim() || 'Enfant'
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`
})

function openChildModal(childToEdit?: RecipientEntry) {
  if (childToEdit && (childToEdit.isChild || childToEdit.role === 'child')) {
    editingChildId.value = childToEdit.id
    childForm.name = childToEdit.name
    childForm.age = childToEdit.age
    childForm.parentName = childToEdit.parentName || currentUser.value?.name || list.value?.ownerName || ''
    childForm.parentId = childToEdit.parentId
    childForm.avatarSeed = childToEdit.name
    showCustomParentInput.value = !adultMembers.value.some(
      a => a.name.toLowerCase() === childForm.parentName.toLowerCase()
    )
  } else {
    editingChildId.value = undefined
    childForm.name = ''
    childForm.age = undefined
    const defaultParent = currentUser.value?.name || list.value?.ownerName || adultMembers.value[0]?.name || ''
    childForm.parentName = defaultParent
    childForm.parentId = currentUser.value?.id || list.value?.ownerId
    childForm.avatarSeed = childAvatarSeeds[Math.floor(Math.random() * childAvatarSeeds.length)] || 'Leo'
    showCustomParentInput.value = false
  }
  isChildModalOpen.value = true
}

function selectParentForChild(adult: RecipientEntry) {
  childForm.parentName = adult.name
  childForm.parentId = adult.id
  showCustomParentInput.value = false
}

async function handleSaveChild() {
  if (!list.value) return
  const cleanName = childForm.name.trim()
  const cleanParent = childForm.parentName.trim() || currentUser.value?.name || list.value.ownerName || 'Parent'
  if (!cleanName) return

  isSavingChild.value = true
  try {
    const matchedParent = adultMembers.value.find(
      a => a.name.toLowerCase() === cleanParent.toLowerCase()
    )
    await addChildMember(list.value.id, {
      id: editingChildId.value,
      name: cleanName,
      age: childForm.age !== undefined && childForm.age !== null && !isNaN(Number(childForm.age)) && Number(childForm.age) >= 0
        ? Number(childForm.age)
        : undefined,
      parentId: matchedParent?.id || childForm.parentId,
      parentName: cleanParent,
      avatar: computedChildAvatar.value
    })
    selectedRecipient.value = cleanName
    isChildModalOpen.value = false
  } finally {
    isSavingChild.value = false
  }
}

async function handleRemoveMember(member: RecipientEntry) {
  if (!list.value || !canRemoveMember(member)) return
  const isChild = Boolean(member.isChild || member.role === 'child')
  const giftNotice = member.count > 0
    ? `\nSes ${member.count} cadeau(x) associé(s) seront également supprimés.`
    : ''
  const confirmMessage = isChild
    ? `Voulez-vous retirer l'enfant ${member.name} de cette liste ?${giftNotice}`
    : `Voulez-vous retirer ${member.name} de cette liste ?${giftNotice}`

  if (confirm(confirmMessage)) {
    await removeMember(list.value.id, member.id || member.name, member.name)
    if (selectedRecipient.value.toLowerCase() === member.name.toLowerCase()) {
      selectedRecipient.value = 'all'
    }
  }
}

async function handleRemoveChild(child: RecipientEntry) {
  await handleRemoveMember(child)
}

if (import.meta.server || !list.value) {
  await fetchListById(listId.value)
}

async function refreshListAndSyncMember() {
  const fetched = await fetchListById(listId.value)
  const activeList = fetched || list.value
  if (activeList && currentUser.value) {
    joinListId(activeList.id)
    joinListId(activeList.inviteCode)
    const alreadyInMembers = Array.isArray(activeList.members) && activeList.members.some((m: any) => {
      if (typeof m === 'object' && m !== null) {
        return (
          (m.id && m.id === currentUser.value?.id) ||
          (m.name && String(m.name).trim().toLowerCase() === currentUser.value?.name.trim().toLowerCase())
        )
      }
      return false
    })
    if (!alreadyInMembers) {
      await syncMemberOnServer(activeList.id, currentUser.value)
    }
  }
}

function handleWindowFocus() {
  if (listId.value) {
    fetchListById(listId.value)
  }
}

onMounted(async () => {
  await refreshListAndSyncMember()
  if (import.meta.client) {
    window.addEventListener('focus', handleWindowFocus)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('focus', handleWindowFocus)
  }
})

watch(currentUser, async (newUser) => {
  if (newUser && list.value) {
    joinListId(list.value.id)
    joinListId(list.value.inviteCode)
    await syncMemberOnServer(list.value.id, newUser)
  }
})

const filteredItems = computed(() => {
  if (!list.value) return []
  let items = list.value.items

  if (selectedRecipient.value !== 'all') {
    items = items.filter(i => {
      const rawRec = typeof i.recipientName === 'string' ? i.recipientName.trim() : ''
      const rec = rawRec || list.value!.ownerName
      return rec.toLowerCase() === selectedRecipient.value.toLowerCase()
    })
  }

  if (filterStatus.value === 'favorites') {
    items = items.filter(i => i.isFavorite)
  } else if (filterStatus.value === 'available') {
    items = items.filter(i => !i.isPurchased)
  } else if (filterStatus.value === 'purchased') {
    items = items.filter(i => i.isPurchased)
  }

  if (itemSearch.value.trim()) {
    const q = itemSearch.value.toLowerCase()
    items = items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.recipientName?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.colorOrVariant?.toLowerCase().includes(q) ||
      i.comment?.toLowerCase().includes(q)
    )
  }

  return items
})

const totalBudget = computed(() => {
  if (!list.value) return 0
  return filteredItems.value.reduce((acc, i) => acc + (i.price ? i.price * (i.quantity || 1) : 0), 0)
})

const daysLeft = computed(() => {
  if (!list.value?.eventDate) return null
  const target = new Date(list.value.eventDate)
  const now = new Date()
  const diffTime = target.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

const defaultAddRecipient = ref('')

function openAddItem(recipientName?: string) {
  itemToEdit.value = null
  if (typeof recipientName === 'string' && recipientName && recipientName !== 'all') {
    defaultAddRecipient.value = recipientName
  } else if (typeof selectedRecipient.value === 'string' && selectedRecipient.value !== 'all') {
    defaultAddRecipient.value = selectedRecipient.value
  } else if (currentUser.value?.name) {
    defaultAddRecipient.value = currentUser.value.name
  } else {
    defaultAddRecipient.value = list.value?.ownerName || ''
  }
  isAddItemOpen.value = true
}

function handleEditItem(item: WishlistItem) {
  itemToEdit.value = item
  isAddItemOpen.value = true
}

async function handleDeleteItem(itemId: string) {
  if (confirm('Voulez-vous retirer ce cadeau de votre liste ?')) {
    await deleteItem(list.value!.id, itemId)
  }
}

async function handleDeleteList() {
  if (confirm('Êtes-vous sûr de vouloir supprimer définitivement cette liste ?')) {
    await deleteList(list.value!.id)
    router.push('/')
  }
}

function handleShare() {
  if (list.value) {
    isInviteModalOpen.value = true
  }
}

async function copyInviteCode() {
  if (!list.value) return
  if (import.meta.client && navigator.clipboard) {
    await navigator.clipboard.writeText(list.value.inviteCode)
    isCodeCopied.value = true
    toast.success('Code copié !')
    setTimeout(() => {
      isCodeCopied.value = false
    }, 2000)
  }
}
</script>

<template>
  <div
    v-if="list"
    class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 transition-colors duration-300 relative"
    :class="isChristmasList ? 'bg-christmas-page py-4 sm:py-6 rounded-3xl shadow-[inset_0_0_60px_rgba(185,28,28,0.03)]' : ''"
  >
    <!-- Gentle Ambient Snowfall for Christmas lists across the page -->
    <SnowEffect v-if="isChristmasList" :count="26" :full-page="true" />

    <!-- Top Back button & Breadcrumb -->
    <div class="flex items-center justify-between relative z-10">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors shadow-subtle"
        :class="isChristmasList
          ? 'border-amber-300/70 dark:border-amber-600/40 bg-white/95 dark:bg-slate-900/95 text-amber-950 dark:text-amber-100 hover:bg-amber-50 dark:hover:bg-slate-800'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'"
      >
        <ArrowLeft class="w-4 h-4" :class="isChristmasList ? 'text-amber-600 dark:text-amber-400' : ''" />
        <span>Toutes les listes</span>
      </NuxtLink>

      <!-- Action buttons: Add Child, Share & Edit -->
      <div class="flex items-center gap-2">
        <button
          @click="handleShare"
          type="button"
          class="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all shadow-subtle active:scale-98"
          :class="isChristmasList
            ? 'gold-border-glow bg-gradient-to-r from-xmas-700 via-rose-700 to-xmas-800 text-amber-100 hover:from-xmas-800 hover:to-rose-800 shadow-[0_2px_12px_rgba(185,28,28,0.3)]'
            : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold'"
        >
          <Sparkles v-if="isChristmasList" class="w-3.5 h-3.5 text-amber-300" />
          <Users v-else class="w-3.5 h-3.5 text-rose-500" />
          <span>{{ isChristmasList ? 'Inviter des proches ✨' : 'Inviter des proches' }}</span>
        </button>

        <button
          v-if="isOwner"
          @click="isEditListOpen = true"
          type="button"
          class="p-2 rounded-xl border text-xs transition-colors shadow-subtle"
          :class="isChristmasList
            ? 'border-amber-300/70 dark:border-amber-600/40 bg-white/95 dark:bg-slate-900/95 text-amber-950 dark:text-amber-100 hover:bg-amber-50 dark:hover:bg-slate-800'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'"
          title="Modifier la liste"
          aria-label="Modifier la liste"
        >
          <Edit2 class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="isOwner"
          @click="handleDeleteList"
          type="button"
          class="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition-colors"
          :class="isChristmasList ? 'border border-amber-300/40 dark:border-amber-900/40 bg-white/80 dark:bg-slate-900/80' : ''"
          title="Supprimer la liste"
          aria-label="Supprimer la liste"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Header Banner Card -->
    <section
      aria-labelledby="list-detail-title"
      class="relative rounded-3xl p-6 sm:p-8 text-white overflow-hidden shadow-card"
      :class="isChristmasList
        ? 'bg-christmas-pattern border-2 border-amber-300/60 shadow-[0_12px_36px_-6px_rgba(185,28,28,0.4),0_0_24px_rgba(234,179,8,0.25)]'
        : (list.coverGradient ? `bg-gradient-to-r ${list.coverGradient}` : 'bg-gradient-to-r from-xmas-800 to-rose-800')"
    >
      <!-- Gentle Falling Snow inside header -->
      <SnowEffect v-if="isChristmasList" :count="18" />

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-3 max-w-2xl">
          <!-- Emoji & Tag -->
          <div class="flex items-center gap-3">
            <span class="text-4xl sm:text-5xl filter drop-shadow-md">{{ list.coverEmoji || (isChristmasList ? '🎄' : '🎁') }}</span>
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="isChristmasList"
                class="px-3 py-1 rounded-full gold-badge text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
              >
                <span>🎄</span>
                <span>FÉERIE DE NOËL ✨</span>
              </span>

              <span
                v-if="isOwner"
                class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm"
                :class="isChristmasList ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-white text-slate-900'"
              >
                {{ isChristmasList ? 'Votre Liste de Noël' : 'Votre Liste' }}
              </span>
              <span
                v-else
                class="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-medium border border-white/10"
              >
                Liste de {{ list.ownerName }}
              </span>

              <div
                v-if="daysLeft !== null"
                class="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-sm"
                :class="isChristmasList
                  ? 'bg-black/50 border border-amber-400/50 text-amber-200'
                  : 'bg-black/40 text-white'"
              >
                <Calendar class="w-3.5 h-3.5 text-amber-300" />
                <span v-if="daysLeft > 0">
                  {{ isChristmasList ? `🎅 J-${daysLeft} avant Noël !` : `J-${daysLeft}` }}
                </span>
                <span v-else-if="daysLeft === 0">Aujourd'hui, c'est Noël ! 🎉</span>
                <span v-else>Terminé</span>
              </div>
            </div>
          </div>

          <h1
            id="list-detail-title"
            class="text-2xl sm:text-4xl font-extrabold font-display leading-tight tracking-tight drop-shadow-sm"
          >
            {{ list.title }}
          </h1>

          <p v-if="list.description" class="text-xs sm:text-sm text-white/95 leading-relaxed max-w-xl font-normal drop-shadow-sm">
            {{ list.description }}
          </p>

          <!-- Joined Members & Invite Code Row -->
          <div class="pt-1.5 space-y-2.5">
            <!-- Joined Members Badges -->
            <div v-if="recipientsList.length > 0" class="flex flex-wrap items-center gap-1.5">
              <span class="text-xs text-white/90 font-semibold flex items-center gap-1 mr-1">
                <Users class="w-3.5 h-3.5 text-amber-300" />
                <span>Membres ({{ recipientsList.length }}) :</span>
              </span>
              <div
                v-for="member in recipientsList"
                :key="member.key"
                class="inline-flex items-center rounded-full text-xs font-semibold transition-all border backdrop-blur-md overflow-hidden"
                :class="selectedRecipient.toLowerCase() === member.name.toLowerCase()
                  ? 'bg-white text-slate-900 border-white shadow-sm scale-105'
                  : 'bg-black/35 hover:bg-black/50 text-white border-white/20'"
              >
                <button
                  type="button"
                  @click="selectedRecipient = selectedRecipient.toLowerCase() === member.name.toLowerCase() ? 'all' : member.name"
                  class="inline-flex items-center gap-1.5 pl-2.5 py-1 cursor-pointer"
                  :class="canRemoveMember(member) ? 'pr-1' : 'pr-2.5'"
                  :title="member.isChild && member.parentName
                    ? `Filtrer les cadeaux de ${member.name} (Enfant de ${member.parentName})`
                    : `Filtrer les cadeaux de ${member.name}`"
                >
                  <img
                    v-if="member.avatar"
                    :src="member.avatar"
                    :alt="member.name"
                    class="w-4 h-4 rounded-full object-cover bg-white/20"
                  />
                  <span>{{ member.name }}</span>
                  <span v-if="member.isChild" class="text-[10px]" :title="`Enfant rattaché à ${member.parentName || list.ownerName}`">
                    👶<template v-if="member.age"> {{ member.age }}a</template>
                  </span>
                  <span v-else-if="isMemberListOwner(member)" class="text-[10px] opacity-80" title="Créateur de la liste">👑</span>
                </button>
                <button
                  v-if="canRemoveMember(member)"
                  type="button"
                  @click.stop="handleRemoveMember(member)"
                  class="pr-2 pl-1 py-1 opacity-75 hover:opacity-100 hover:text-rose-400 transition-colors cursor-pointer"
                  :title="`Retirer ${member.name} de la liste`"
                  :aria-label="`Retirer ${member.name} de la liste`"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>

            <!-- Invite Code pill -->
            <div class="flex items-center gap-2 text-xs text-white/95">
              <span class="font-medium">{{ isChristmasList ? 'Code secret de la hotte :' : 'Code d\'invitation :' }}</span>
              <button
                @click="copyInviteCode"
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold tracking-wider transition-all"
                :class="isChristmasList
                  ? 'bg-black/45 hover:bg-black/60 text-amber-200 border border-amber-300/40 shadow-sm'
                  : 'bg-black/30 hover:bg-black/40 text-amber-200 border border-white/10'"
                title="Cliquer pour copier le code"
              >
                <span>{{ list.inviteCode }}</span>
                <Check v-if="isCodeCopied" class="w-3 h-3 text-emerald-400" />
                <Copy v-else class="w-3 h-3 text-amber-200" />
              </button>
            </div>
          </div>
        </div>

        <!-- Right Side CTA: Prominent Add Gift Button for Everyone -->
        <div class="shrink-0 flex flex-col items-stretch sm:items-start md:items-end gap-3 relative z-10">
          <button
            @click="openAddItem()"
            type="button"
            class="group flex items-center justify-center gap-3 font-extrabold text-sm sm:text-base transition-all duration-200 hover:scale-[1.03] active:scale-98 cursor-pointer"
            :class="isChristmasList
              ? 'gold-gradient-btn py-3.5 px-6 sm:py-4 sm:px-7 rounded-2xl shadow-[0_8px_30px_rgba(250,204,21,0.55)] ring-4 ring-amber-300/35'
              : 'py-3.5 px-6 sm:py-4 sm:px-7 rounded-2xl bg-white text-rose-600 hover:bg-rose-50 shadow-[0_10px_30px_rgba(0,0,0,0.28)] ring-4 ring-white/30'"
          >
            <span
              class="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-90"
              :class="isChristmasList ? 'bg-amber-950/15 text-amber-950' : 'bg-rose-600 text-white shadow-sm'"
            >
              <Plus class="w-5 h-5 stroke-[3]" />
            </span>
            <span>{{ isChristmasList ? 'Ajouter un cadeau sous le sapin 🎁' : 'Ajouter un cadeau à la liste ✨' }}</span>
          </button>

          <!-- Non-owner Secret Notice -->
          <div
            v-if="!isOwner"
            class="p-3.5 rounded-2xl backdrop-blur-md text-xs max-w-xs space-y-1 shadow-lg border"
            :class="isChristmasList
              ? 'bg-black/50 border-amber-300/40'
              : 'bg-black/40 border-white/10'"
          >
            <div class="flex items-center gap-1.5 font-bold text-amber-300">
              <Lock class="w-3.5 h-3.5 text-amber-300" />
              <span>{{ isChristmasList ? 'Secret des Lutins de Noël 🎅' : 'Surprise garantie !' }}</span>
            </div>
            <p class="text-[11px] leading-relaxed text-white/90">
              {{ isChristmasList
                ? `Cochez un cadeau pour réserver en secret ! ${list.ownerName} ne découvrira ses cadeaux qu'au déballage sous le sapin. 🤫🎄`
                : `Cochez un cadeau pour indiquer à la famille que vous vous en chargez. ${list.ownerName} ne verra pas vos réservations secrètes.`
              }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Multi-person Family Members & Children Tabs Navigation -->
    <section aria-labelledby="members-section-title" class="space-y-3 relative z-10">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span v-if="isChristmasList" class="text-base">🎅</span>
          <Users v-else class="w-4 h-4 text-rose-500" />
          <h2
            id="members-section-title"
            class="text-xs sm:text-sm font-bold uppercase tracking-wider"
            :class="isChristmasList ? 'text-amber-950 dark:text-amber-200 font-extrabold' : 'text-slate-800 dark:text-slate-200'"
          >
            {{ isChristmasList ? 'Hotte de Noël par membre & enfant de la famille' : 'Membres, Enfants & Cadeaux de la liste' }}
          </h2>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="openChildModal()"
            type="button"
            class="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold transition-all border shadow-subtle hover:scale-[1.01] active:scale-98 cursor-pointer"
            :class="isChristmasList
              ? 'bg-white/95 dark:bg-slate-900/95 border-amber-300 dark:border-amber-600/60 text-amber-950 dark:text-amber-100 hover:bg-amber-50 dark:hover:bg-slate-800'
              : 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/60'"
          >
            <Baby class="w-4 h-4 text-sky-500" />
            <span>+ Ajouter un enfant 👶</span>
          </button>

          <button
            @click="openAddItem()"
            type="button"
            class="inline-flex items-center gap-2 py-2.5 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md hover:scale-[1.02] active:scale-98 cursor-pointer"
            :class="isChristmasList
              ? 'gold-gradient-btn shadow-[0_4px_16px_rgba(234,179,8,0.4)]'
              : 'bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-[0_4px_16px_rgba(225,29,72,0.35)]'"
          >
            <Plus class="w-4 h-4 stroke-[2.5]" />
            <span>
              {{ selectedRecipient !== 'all'
                ? `Ajouter un cadeau pour ${selectedRecipient}`
                : (isChristmasList ? 'Ajouter un cadeau à la hotte 🎁' : 'Ajouter un cadeau 🎁')
              }}
            </span>
          </button>
        </div>
      </div>

      <!-- Members Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <!-- All Family Button -->
        <button
          type="button"
          @click="selectedRecipient = 'all'"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border shadow-sm active:scale-98"
          :class="[
            selectedRecipient === 'all'
              ? (isChristmasList
                  ? 'bg-gradient-to-r from-xmas-700 via-rose-700 to-xmas-800 text-amber-100 border-amber-400 shadow-[0_2px_12px_rgba(185,28,28,0.35)]'
                  : 'bg-rose-600 text-white border-rose-600')
              : (isChristmasList
                  ? 'bg-white/95 dark:bg-slate-900/95 text-amber-950 dark:text-amber-100 border-amber-300/60 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-slate-800'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800')
          ]"
        >
          <span>👨‍👩‍👧‍👦 Toute la famille</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
            :class="selectedRecipient === 'all'
              ? (isChristmasList ? 'bg-amber-300/30 text-amber-200' : 'bg-white/20 text-white')
              : (isChristmasList ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')"
          >
            {{ list.items.length }}
          </span>
        </button>

        <!-- Individual Family Member & Child Pills -->
        <div
          v-for="member in recipientsList"
          :key="member.key"
          class="flex items-center rounded-xl text-xs font-bold transition-all shrink-0 border shadow-sm overflow-hidden"
          :class="[
            selectedRecipient.toLowerCase() === member.name.toLowerCase()
              ? (isChristmasList
                  ? 'gold-gradient-btn border-amber-400 font-extrabold'
                  : (member.isChild
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'))
              : (isChristmasList
                  ? 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 border-amber-300/60 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-slate-800'
                  : (member.isChild
                      ? 'bg-sky-50/70 dark:bg-sky-950/30 text-sky-950 dark:text-sky-200 border-sky-200/90 dark:border-sky-800/60 hover:bg-sky-100/70 dark:hover:bg-sky-900/40'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'))
          ]"
        >
          <button
            type="button"
            @click="selectedRecipient = member.name"
            class="flex items-center gap-2 pl-3.5 py-2 cursor-pointer"
            :class="canRemoveMember(member) ? 'pr-1.5' : 'pr-3.5'"
          >
            <div class="relative shrink-0">
              <img
                v-if="member.avatar"
                :src="member.avatar"
                :alt="member.name"
                class="w-5 h-5 rounded-full object-cover ring-1 ring-black/10"
              />
              <span v-else>{{ member.isChild ? '👶' : '🎁' }}</span>
              <span
                v-if="member.isChild"
                class="absolute -bottom-1 -right-1 text-[9px] leading-none"
                title="Enfant sans compte"
              >
                👶
              </span>
            </div>

            <div class="text-left leading-tight">
              <div class="flex items-center gap-1">
                <span>{{ member.name }}</span>
                <span v-if="member.isChild && member.age" class="text-[10px] opacity-80 font-semibold">
                  ({{ member.age }} ans)
                </span>
              </div>
              <span
                v-if="member.isChild && member.parentName"
                class="block text-[9px] font-medium opacity-75"
              >
                Enfant de {{ member.parentName }}
              </span>
            </div>

            <span
              class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
              :class="selectedRecipient.toLowerCase() === member.name.toLowerCase()
                ? (isChristmasList ? 'bg-amber-950/20 text-amber-950' : 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900')
                : (isChristmasList ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')"
            >
              {{ member.count }}
            </span>
          </button>

          <button
            v-if="canRemoveMember(member)"
            type="button"
            @click.stop="handleRemoveMember(member)"
            class="pr-2.5 pl-1 py-2 opacity-60 hover:opacity-100 hover:text-rose-500 transition-colors cursor-pointer"
            :title="`Supprimer ${member.name} de la liste`"
            :aria-label="`Supprimer ${member.name} de la liste`"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Add Child pill button -->
        <button
          type="button"
          @click="openChildModal()"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 border border-dashed"
          :class="isChristmasList
            ? 'border-amber-400/80 dark:border-amber-600/60 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-xmas-950/40'
            : 'border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-semibold'"
        >
          <Baby class="w-3.5 h-3.5 text-sky-500" />
          <span>+ Enfant (sans compte)</span>
        </button>

        <!-- Invite family member button -->
        <button
          type="button"
          @click="isInviteModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 border border-dashed"
          :class="isChristmasList
            ? 'border-amber-400/80 dark:border-amber-600/60 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-xmas-950/40'
            : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold'"
        >
          <Sparkles v-if="isChristmasList" class="w-3.5 h-3.5 text-amber-500" />
          <Users v-else class="w-3.5 h-3.5 text-rose-500" />
          <span>{{ isChristmasList ? '+ Inviter un proche 🎄' : '+ Inviter un membre' }}</span>
        </button>
      </div>

      <!-- Contextual Banner when a Member or Child Tab is Selected -->
      <div
        v-if="selectedMemberObj"
        class="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
        :class="isChristmasList
          ? 'bg-gradient-to-r from-amber-50/95 via-white/95 to-sky-50/90 dark:from-slate-900/95 dark:via-slate-900 dark:to-sky-950/40 border-amber-300/80 dark:border-amber-600/50 shadow-sm'
          : (selectedMemberObj.isChild || selectedMemberObj.role === 'child'
              ? 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-subtle')"
      >
        <div class="flex items-center gap-3">
          <div class="relative shrink-0">
            <img
              :src="selectedMemberObj.avatar"
              :alt="selectedMemberObj.name"
              class="w-11 h-11 rounded-2xl object-cover bg-white ring-2 shadow-sm"
              :class="selectedMemberObj.isChild || selectedMemberObj.role === 'child'
                ? 'ring-sky-300 dark:ring-sky-700'
                : 'ring-rose-200 dark:ring-slate-700'"
            />
            <span
              v-if="selectedMemberObj.isChild || selectedMemberObj.role === 'child'"
              class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-sky-500 text-white text-[11px] flex items-center justify-center shadow"
            >
              👶
            </span>
            <span
              v-else-if="isMemberListOwner(selectedMemberObj)"
              class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-amber-950 text-[11px] flex items-center justify-center shadow"
              title="Créateur de la liste"
            >
              👑
            </span>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">
                Souhaits de {{ selectedMemberObj.name }}
              </h3>
              <span
                v-if="(selectedMemberObj.isChild || selectedMemberObj.role === 'child') && selectedMemberObj.age"
                class="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 text-[11px] font-bold"
              >
                {{ selectedMemberObj.age }} ans
              </span>
              <span
                v-if="selectedMemberObj.isChild || selectedMemberObj.role === 'child'"
                class="px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold flex items-center gap-1"
              >
                <UserCheck class="w-3 h-3 text-emerald-500" />
                <span>Rattaché à <strong>{{ selectedMemberObj.parentName || list.ownerName }}</strong></span>
              </span>
              <span
                v-else-if="isMemberListOwner(selectedMemberObj)"
                class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-[11px] font-bold"
              >
                Créateur de la liste 👑
              </span>
              <span
                v-else
                class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold"
              >
                Membre de la liste
              </span>
            </div>
            <p
              v-if="selectedMemberObj.isChild || selectedMemberObj.role === 'child'"
              class="text-xs text-slate-600 dark:text-slate-400 mt-0.5"
            >
              Cet enfant n'a pas de compte : sa liste de cadeaux est gérée par <strong>{{ selectedMemberObj.parentName || list.ownerName }}</strong>.
            </p>
            <p
              v-else
              class="text-xs text-slate-600 dark:text-slate-400 mt-0.5"
            >
              {{ selectedMemberObj.count }} cadeau(x) dans la liste pour {{ selectedMemberObj.name }}.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            @click="openAddItem(selectedMemberObj.name)"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Ajouter un cadeau</span>
          </button>

          <button
            v-if="(selectedMemberObj.isChild || selectedMemberObj.role === 'child') && canManageChild(selectedMemberObj)"
            type="button"
            @click="openChildModal(selectedMemberObj)"
            class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Modifier les informations de l'enfant"
            aria-label="Modifier l'enfant"
          >
            <Edit2 class="w-3.5 h-3.5" />
          </button>

          <button
            v-if="canRemoveMember(selectedMemberObj)"
            type="button"
            @click="handleRemoveMember(selectedMemberObj)"
            class="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            :title="`Supprimer ${selectedMemberObj.name} de la liste`"
            :aria-label="`Supprimer ${selectedMemberObj.name} de la liste`"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>Retirer de la liste</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Filters, Search & Stats Row -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 relative z-10">
      <!-- Status Filters -->
      <button
          v-if="!isOwner || (selectedMemberObj && selectedMemberObj.isChild)"
          @click="filterStatus = 'available'"
          type="button"
          class="py-1 px-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
          :class="filterStatus === 'available'
            ? (isChristmasList ? 'bg-gradient-to-r from-xmas-700 to-rose-700 text-amber-100 shadow-sm' : 'bg-rose-600 text-white shadow-sm')
            : (isChristmasList ? 'text-amber-950 dark:text-amber-200 hover:text-rose-600' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold')"
      >
        {{ isChristmasList ? 'Disponibles sous le sapin' : 'Disponibles' }} ({{ list.items.filter(i => !i.isPurchased).length }})
      </button>

      <button
          v-if="!isOwner || (selectedMemberObj && selectedMemberObj.isChild)"
          @click="filterStatus = 'purchased'"
          type="button"
          class="py-1 px-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
          :class="filterStatus === 'purchased'
            ? (isChristmasList ? 'bg-gradient-to-r from-xmas-700 to-rose-700 text-amber-100 shadow-sm' : 'bg-rose-600 text-white shadow-sm')
            : (isChristmasList ? 'text-amber-950 dark:text-amber-200 hover:text-rose-600' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold')"
      >
        {{ isChristmasList ? 'Réservés par les lutins 🎅' : 'Réservés' }} ({{ list.items.filter(i => i.isPurchased).length }})
      </button>

      <!-- Search & Budget Estimate -->
      <div class="flex items-center gap-3">
        <div class="relative flex-1 sm:w-56">
          <Search
            class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            :class="isChristmasList ? 'text-amber-500' : 'text-slate-400'"
          />
          <input
            v-model="itemSearch"
            type="search"
            :placeholder="isChristmasList ? 'Rechercher un cadeau de Noël...' : 'Filtrer les cadeaux...'"
            class="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs shadow-subtle focus:outline-none focus:ring-2"
            :class="isChristmasList
              ? 'border-amber-300/70 dark:border-amber-700/50 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white placeholder:text-amber-700/60 dark:placeholder:text-amber-400/50 focus:ring-amber-400'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-rose-500'"
          />
        </div>

        <div
          v-if="totalBudget > 0"
          class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border"
          :class="isChristmasList
            ? 'bg-amber-100/90 dark:bg-xmas-950/60 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200 shadow-sm'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold'"
        >
          <span>{{ isChristmasList ? '🎄 Budget de Noël :' : 'Budget estimé :' }}</span>
          <span
            class="font-extrabold font-mono"
            :class="isChristmasList ? 'text-amber-900 dark:text-amber-300' : 'text-slate-900 dark:text-white'"
          >
            ~{{ totalBudget.toFixed(2) }} €
          </span>
        </div>
      </div>
    </div>

    <!-- Gifts Grid -->
    <div
      v-if="filteredItems.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 relative z-10"
    >
      <!-- Prominent Add Gift Card inside the grid -->
      <button
        @click="openAddItem()"
        type="button"
        class="group rounded-3xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[260px] transition-all duration-200 hover:scale-[1.01] active:scale-98 cursor-pointer"
        :class="isChristmasList
          ? 'border-amber-400/80 dark:border-amber-500/60 bg-gradient-to-b from-amber-50/70 via-white/90 to-amber-100/50 dark:from-xmas-950/40 dark:via-slate-900/90 dark:to-xmas-950/40 hover:border-amber-500 hover:shadow-[0_12px_30px_rgba(234,179,8,0.22)]'
          : 'border-rose-300 dark:border-rose-800/80 bg-gradient-to-b from-rose-50/50 via-white to-rose-50/30 dark:from-rose-950/20 dark:via-slate-900 dark:to-rose-950/10 hover:border-rose-500 dark:hover:border-rose-500 hover:shadow-[0_12px_30px_rgba(225,29,72,0.15)]'"
      >
        <div
          class="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-110"
          :class="isChristmasList
            ? 'gold-gradient-btn text-amber-950'
            : 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-rose-500/30'"
        >
          <Plus class="w-8 h-8 stroke-[2.5]" />
        </div>
        <div class="space-y-1">
          <span
            class="block text-base font-extrabold font-display"
            :class="isChristmasList ? 'text-amber-950 dark:text-amber-100' : 'text-slate-900 dark:text-white'"
          >
            {{ selectedRecipient !== 'all' ? `Ajouter un cadeau pour ${selectedRecipient}` : 'Ajouter un nouveau cadeau' }}
          </span>
          <span
            class="block text-xs max-w-[220px] mx-auto leading-relaxed"
            :class="isChristmasList ? 'text-amber-800/80 dark:text-amber-300/80' : 'text-slate-500 dark:text-slate-400'"
          >
            Collez un lien web (Amazon, Fnac...) ou écrivez une idée libre
          </span>
        </div>
        <span
          class="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-colors"
          :class="isChristmasList
            ? 'bg-amber-950 text-amber-200 group-hover:bg-amber-900'
            : 'bg-rose-600 text-white group-hover:bg-rose-700'"
        >
          <Gift class="w-3.5 h-3.5" />
          <span>+ Ajouter maintenant</span>
        </span>
      </button>

      <GiftCard
        v-for="item in filteredItems"
        :key="item.id"
        :item="item"
        :is-owner="isOwner"
        :owner-name="list.ownerName"
        :is-christmas="isChristmasList"
        :can-manage="canManageItem(item)"
        :child-info="getChildInfo(item.recipientName)"
        @edit="handleEditItem"
        @delete="handleDeleteItem"
      />
    </div>

    <!-- Empty Gifts State -->
    <div
      v-else
      class="rounded-3xl border p-8 sm:p-12 text-center max-w-md mx-auto space-y-4 relative z-10"
      :class="isChristmasList
        ? 'border-2 border-amber-300/80 dark:border-amber-600/50 bg-gradient-to-b from-white via-amber-50/40 to-amber-100/30 dark:from-slate-900 dark:via-xmas-950/40 dark:to-slate-900 shadow-[0_10px_30px_rgba(234,179,8,0.15)]'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card'"
    >
      <div
        class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm"
        :class="isChristmasList
          ? 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-xmas-900 dark:to-amber-950/60 border border-amber-300 text-amber-950'
          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'"
      >
        {{ selectedMemberObj?.isChild ? '👶' : (isChristmasList ? '🎄' : '🎁') }}
      </div>
      <div>
        <h3
          class="text-lg font-extrabold font-display"
          :class="isChristmasList ? 'text-amber-950 dark:text-amber-100' : 'text-slate-900 dark:text-white'"
        >
          {{ selectedRecipient !== 'all'
            ? `Aucun cadeau pour ${selectedRecipient} pour le moment`
            : (isChristmasList
                ? (isOwner ? 'Votre hotte de Noël est encore vide 🎅' : 'Aucun cadeau de Noël trouvé sous le sapin')
                : (isOwner ? 'Votre liste est encore vide' : 'Aucun cadeau dans cette liste'))
          }}
        </h3>
        <p
          class="text-xs mt-1.5 max-w-xs mx-auto leading-relaxed"
          :class="isChristmasList ? 'text-amber-900/80 dark:text-amber-300/80 font-medium' : 'text-slate-500 dark:text-slate-400'"
        >
          {{ selectedMemberObj?.isChild
            ? `Ajoutez les envies de cadeaux de ${selectedMemberObj.name} (rattaché à ${selectedMemberObj.parentName || list.ownerName}) !`
            : (selectedRecipient !== 'all'
                ? `Ajoutez une première idée de cadeau pour ${selectedRecipient} en 1 clic !`
                : 'Ajoutez vos premières envies de cadeaux en collant des liens ou en écrivant vos idées !')
          }}
        </p>
      </div>

      <button
        @click="openAddItem()"
        type="button"
        class="py-3.5 px-6 rounded-2xl text-sm font-extrabold shadow-lg transition-all hover:scale-[1.02] active:scale-98 inline-flex items-center gap-2.5 cursor-pointer"
        :class="isChristmasList
          ? 'gold-gradient-btn shadow-[0_6px_20px_rgba(250,204,21,0.45)]'
          : 'bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-[0_6px_20px_rgba(225,29,72,0.35)]'"
      >
        <Plus class="w-5 h-5 stroke-[2.5]" />
        <span>
          {{ selectedRecipient !== 'all'
            ? `Ajouter un cadeau pour ${selectedRecipient} 🎁`
            : (isChristmasList ? 'Ajouter un cadeau sous le sapin ✨' : 'Ajouter une envie de cadeau 🎁')
          }}
        </span>
      </button>
    </div>

    <!-- Child Management Modal (Add / Edit Child attached to a Parent) -->
    <Transition name="modal">
      <div
        v-if="isChildModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="child-modal-title"
      >
        <div
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          @click="isChildModalOpen = false"
        />

        <div
          class="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-elevated p-5 sm:p-7 z-10 my-auto max-h-[92vh] flex flex-col"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xl">
                👶
              </div>
              <div>
                <h3 id="child-modal-title" class="text-lg font-bold font-display text-slate-900 dark:text-white">
                  {{ editingChildId ? 'Modifier le profil enfant' : 'Ajouter un enfant à la liste' }}
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Sans compte requis • Rattaché directement à un parent
                </p>
              </div>
            </div>

            <button
              @click="isChildModalOpen = false"
              type="button"
              aria-label="Fermer"
              class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="handleSaveChild" class="space-y-4 overflow-y-auto pr-1 flex-1">
            <!-- Child Name & Age -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Prénom de l'enfant *
                </label>
                <input
                  v-model="childForm.name"
                  type="text"
                  required
                  placeholder="Ex: Lucas, Emma, Léo..."
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Âge (optionnel)
                </label>
                <div class="relative">
                  <input
                    v-model.number="childForm.age"
                    type="number"
                    min="0"
                    max="18"
                    placeholder="Ex: 6"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 pr-10"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    ans
                  </span>
                </div>
              </div>
            </div>

            <!-- Attached Parent Selection -->
            <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <UserCheck class="w-3.5 h-3.5 text-sky-500" />
                  <span>Rattaché à quel parent ? *</span>
                </label>
                <button
                  type="button"
                  @click="showCustomParentInput = !showCustomParentInput"
                  class="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  {{ showCustomParentInput ? 'Choisir un membre' : '+ Autre parent' }}
                </button>
              </div>

              <!-- Adult Member Pills -->
              <div v-if="!showCustomParentInput" class="flex flex-wrap gap-1.5">
                <button
                  v-for="adult in adultMembers"
                  :key="adult.key"
                  type="button"
                  @click="selectParentForChild(adult)"
                  class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border"
                  :class="childForm.parentName.toLowerCase() === adult.name.toLowerCase()
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'"
                >
                  <img
                    v-if="adult.avatar"
                    :src="adult.avatar"
                    :alt="adult.name"
                    class="w-4 h-4 rounded-full object-cover"
                  />
                  <span>{{ adult.name }}</span>
                  <span v-if="currentUser?.name && adult.name.toLowerCase() === currentUser.name.toLowerCase()" class="text-[10px] opacity-80">
                    (Vous)
                  </span>
                </button>
              </div>

              <!-- Custom Parent Input -->
              <div v-else>
                <input
                  v-model="childForm.parentName"
                  type="text"
                  required
                  placeholder="Prénom du parent (ex: Sophie, Thomas...)"
                  class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Le parent rattaché peut ajouter, modifier et gérer les souhaits de l'enfant sans que l'enfant ait besoin de compte.
              </p>
            </div>

            <!-- Avatar Picker -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Avatar de l'enfant
              </label>
              <div class="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  v-for="seed in childAvatarSeeds"
                  :key="seed"
                  type="button"
                  @click="childForm.avatarSeed = seed"
                  class="p-1.5 rounded-2xl border transition-all shrink-0"
                  :class="childForm.avatarSeed === seed
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 ring-2 ring-sky-500/30 scale-105'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'"
                >
                  <img
                    :src="`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`"
                    :alt="seed"
                    class="w-9 h-9 rounded-xl object-cover"
                  />
                </button>
              </div>
            </div>

            <!-- Existing Children in List Summary -->
            <div v-if="childrenMembers.length > 0 && !editingChildId" class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Baby class="w-3.5 h-3.5 text-sky-500" />
                <span>Enfants déjà inscrits dans cette liste ({{ childrenMembers.length }})</span>
              </div>
              <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <div
                  v-for="child in childrenMembers"
                  :key="child.key"
                  class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 text-xs"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <img
                      :src="child.avatar"
                      :alt="child.name"
                      class="w-7 h-7 rounded-full object-cover bg-white shrink-0"
                    />
                    <div class="truncate">
                      <span class="font-bold text-slate-900 dark:text-white">{{ child.name }}</span>
                      <span v-if="child.age" class="text-slate-500 dark:text-slate-400 ml-1">({{ child.age }} ans)</span>
                      <span class="block text-[10px] text-slate-500 dark:text-slate-400">
                        Rattaché à {{ child.parentName || list.ownerName }} • {{ child.count }} cadeau(x)
                      </span>
                    </div>
                  </div>
                  <div v-if="canManageChild(child)" class="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      @click="openChildModal(child)"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700"
                      title="Modifier"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      @click="handleRemoveChild(child)"
                      class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Retirer"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="pt-2">
              <button
                type="submit"
                :disabled="!childForm.name.trim() || !childForm.parentName.trim() || isSavingChild"
                class="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-colors active:scale-98"
              >
                <Baby class="w-4 h-4" />
                <span>
                  {{ isSavingChild
                    ? 'Enregistrement...'
                    : (editingChildId ? 'Enregistrer les modifications' : `Ajouter ${childForm.name.trim() || 'l\'enfant'} à la liste`)
                  }}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Modals -->
    <AddItemModal
      :is-open="isAddItemOpen"
      :list-id="list.id"
      :editing-item="itemToEdit"
      :default-recipient-name="defaultAddRecipient"
      @close="isAddItemOpen = false"
    />

    <CreateListModal
      :is-open="isEditListOpen"
      :editing-list="list"
      @close="isEditListOpen = false"
    />

    <InviteMemberModal
      :is-open="isInviteModalOpen"
      :list="list"
      @close="isInviteModalOpen = false"
    />
  </div>

  <!-- Loading / Not Found State -->
  <div v-else class="max-w-md mx-auto py-20 text-center px-4 space-y-3">
    <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl mx-auto">
      🔍
    </div>
    <h3 class="text-base font-bold text-slate-900 dark:text-white">Chargement de la liste...</h3>
    <p class="text-xs text-slate-500">Si la liste ne s'affiche pas, vérifiez le code d'invitation.</p>
    <NuxtLink to="/" class="inline-block py-2 px-4 rounded-xl bg-rose-600 text-white text-xs font-semibold">
      Retour à l'accueil
    </NuxtLink>
  </div>
</template>
