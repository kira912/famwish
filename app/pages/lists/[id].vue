<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  QrCode,
  Share2,
  Plus,
  Lock,
  Heart,
  Calendar,
  Gift,
  Search,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  DollarSign
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import type { Wishlist, WishlistItem } from '~/types'

const route = useRoute()
const router = useRouter()
const { getList, fetchLists, fetchListById, deleteList, deleteItem } = useWishlists()
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

// Item filters
const filterStatus = ref<'all' | 'favorites' | 'available' | 'purchased'>('all')
const selectedRecipient = ref<string>('all')
const itemSearch = ref('')

// Compute distinct family members/recipients represented in this list
const recipientsList = computed(() => {
  if (!list.value) return []
  const map = new Map<string, { name: string; count: number; availableCount: number }>()

  // Always ensure list owner is represented
  const owner = list.value.ownerName || 'Moi'
  map.set(owner, { name: owner, count: 0, availableCount: 0 })

  list.value.items.forEach(i => {
    const rawRec = typeof i.recipientName === 'string' ? i.recipientName.trim() : ''
    const recName = rawRec || owner
    if (!map.has(recName)) {
      map.set(recName, { name: recName, count: 0, availableCount: 0 })
    }
    const rec = map.get(recName)!
    rec.count += 1
    if (!i.isPurchased) {
      rec.availableCount += 1
    }
  })

  return Array.from(map.values())
})

if (import.meta.server || !list.value) {
  await fetchListById(listId.value)
}

onMounted(async () => {
  if (!list.value) {
    await fetchListById(listId.value)
  }
  if (list.value && currentUser.value) {
    joinListId(list.value.id)
    joinListId(list.value.inviteCode)
  }
})

const filteredItems = computed(() => {
  if (!list.value) return []
  let items = list.value.items

  // Filter by family member / recipient
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

function openAddItem(recipientName?: string) {
  itemToEdit.value = null
  if (typeof recipientName === 'string' && recipientName && recipientName !== 'all') {
    defaultAddRecipient.value = recipientName
  } else if (currentUser.value?.name) {
    defaultAddRecipient.value = currentUser.value.name
  } else if (typeof selectedRecipient.value === 'string' && selectedRecipient.value !== 'all') {
    defaultAddRecipient.value = selectedRecipient.value
  } else {
    defaultAddRecipient.value = list.value?.ownerName || ''
  }
  isAddItemOpen.value = true
}

const defaultAddRecipient = ref('')

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
</script>

<template>
  <div v-if="list" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">
    <!-- Top Back button & Breadcrumb -->
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Toutes les listes</span>
      </NuxtLink>

      <!-- Action buttons: Share & Edit -->
      <div class="flex items-center gap-2">
        <button
          @click="handleShare"
          class="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-xs font-bold transition-colors shadow-sm"
        >
          <Users class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Inviter la famille 💌</span>
        </button>

        <button
          v-if="isOwner"
          @click="isEditListOpen = true"
          class="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 hover:text-slate-900 text-xs transition-colors"
          title="Modifier la liste"
        >
          <Edit2 class="w-3.5 h-3.5" />
        </button>

        <button
          v-if="isOwner"
          @click="handleDeleteList"
          class="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition-colors"
          title="Supprimer la liste"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Header Banner Card -->
    <div
      class="relative rounded-3xl p-6 sm:p-8 text-white overflow-hidden transition-all"
      :class="isChristmasList
        ? 'bg-christmas-pattern gold-border-glow shadow-glow-gold'
        : (list.coverGradient ? `bg-gradient-to-r ${list.coverGradient} shadow-glow` : 'bg-gradient-to-r from-rose-600 via-brand-600 to-pine-800 shadow-glow')"
    >
      <!-- Gentle Falling Snow for Christmas lists -->
      <SnowEffect v-if="isChristmasList" :count="22" />

      <!-- Background subtle elements -->
      <div class="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div v-if="isChristmasList" class="absolute -left-12 -bottom-12 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-3 max-w-2xl">
          <!-- Emoji & Tag -->
          <div class="flex items-center gap-3">
            <span class="text-4xl sm:text-5xl filter drop-shadow animate-float">{{ list.coverEmoji || (isChristmasList ? '🎄' : '🎁') }}</span>
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="isChristmasList"
                class="px-2.5 py-1 rounded-full gold-badge text-xs font-black flex items-center gap-1 uppercase tracking-wider"
              >
                <Sparkles class="w-3 h-3 text-amber-900" />
                <span>Magie de Noël</span>
              </span>

              <span
                v-if="isOwner"
                class="px-2.5 py-1 rounded-full bg-white/90 text-rose-800 text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                Votre Liste
              </span>
              <span
                v-else
                class="px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md text-white text-xs font-semibold border border-white/10"
              >
                Liste de {{ list.ownerName }}
              </span>

              <div
                v-if="daysLeft !== null"
                class="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm"
                :class="isChristmasList
                  ? 'bg-black/35 text-amber-300 border border-amber-400/40 backdrop-blur-md'
                  : 'bg-white/20 text-amber-200 backdrop-blur-md'"
              >
                <Calendar class="w-3 h-3 text-amber-300" />
                <span v-if="daysLeft > 0">J-{{ daysLeft }} {{ isChristmasList ? 'avant Noël 🎅' : '' }}</span>
                <span v-else-if="daysLeft === 0">C'est le grand jour ! 🎉</span>
                <span v-else>Terminé</span>
              </div>
            </div>
          </div>

          <h1 class="text-2xl sm:text-4xl font-extrabold font-display leading-tight drop-shadow-sm flex items-center gap-2 flex-wrap">
            <span>{{ list.title }}</span>
            <span v-if="isChristmasList" class="text-xl sm:text-2xl">✨</span>
          </h1>

          <p v-if="list.description" class="text-xs sm:text-sm text-white/90 leading-relaxed max-w-xl font-medium">
            {{ list.description }}
          </p>

          <!-- Invite Code pill -->
          <div class="pt-1 flex items-center gap-2 text-xs text-white/80">
            <span>Code d'invitation :</span>
            <span
              class="px-2.5 py-0.5 rounded-lg font-mono font-bold tracking-wider text-amber-200 border"
              :class="isChristmasList ? 'bg-black/35 border-amber-400/30' : 'bg-black/25 border-transparent'"
            >
              {{ list.inviteCode }}
            </span>
          </div>
        </div>

        <!-- Right Side CTA: Add Gift if Owner -->
        <div class="shrink-0 flex flex-col items-start md:items-end gap-3 relative z-10">
          <button
            v-if="isOwner"
            @click="openAddItem()"
            class="flex items-center gap-2 py-3 px-5 sm:py-3.5 sm:px-6 rounded-2xl font-black text-xs sm:text-sm shadow-2xl transition-all active:scale-95"
            :class="isChristmasList
              ? 'bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-amber-950 hover:from-white hover:to-amber-300 border border-amber-200 shadow-glow-gold'
              : 'bg-white text-rose-600 hover:bg-rose-50 shadow-xl'"
          >
            <Plus class="w-4 h-4 stroke-[3]" />
            <span>{{ isChristmasList ? 'Ajouter un cadeau de Noël 🎁' : 'Ajouter une envie de cadeau' }}</span>
          </button>

          <!-- Non-owner Secret Notice -->
          <div
            v-else
            class="p-3.5 rounded-2xl backdrop-blur-md border text-xs max-w-xs space-y-1 shadow-lg"
            :class="isChristmasList
              ? 'bg-black/35 border-amber-400/30 text-amber-50'
              : 'bg-black/25 border-white/20 text-white/90'"
          >
            <div class="flex items-center gap-1.5 font-bold" :class="isChristmasList ? 'text-amber-300' : 'text-amber-200'">
              <Lock class="w-3.5 h-3.5" />
              <span>{{ isChristmasList ? 'Secret du Père Noël garanti !' : 'Surprise garantie !' }}</span>
            </div>
            <p class="text-[11px] leading-relaxed" :class="isChristmasList ? 'text-amber-100/80' : 'text-white/80'">
              Cochez un cadeau pour indiquer à la famille que vous vous en chargez. {{ list.ownerName }} ne verra pas vos réservations secrètes.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Anti-Spoiler Notice for Owner -->
    <div
      v-if="isOwner"
      class="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-300/40 dark:border-amber-700/40 flex items-center justify-between gap-3 text-xs"
    >
      <div class="flex items-center gap-2.5 text-amber-950 dark:text-amber-200">
        <Lock class="w-4 h-4 text-amber-600 shrink-0" />
        <span class="font-medium leading-relaxed">
          <strong class="font-bold">Mode Anti-Spoiler actif :</strong> Pour préserver la magie et la surprise totale lors du déballage, vous ne voyez pas quels cadeaux ont été réservés en secret par vos proches ! 🤫
        </span>
      </div>
    </div>

    <!-- Multi-person Family Members Tabs Navigation (Voir les cadeaux de toute la famille) -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Users class="w-4 h-4 text-rose-500" />
          <h2 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Cadeaux par membre de la famille
          </h2>
        </div>
        <button
          @click="openAddItem()"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Ajouter une idée pour un proche</span>
        </button>
      </div>

      <!-- Members Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <!-- All Family Button -->
        <button
          type="button"
          @click="selectedRecipient = 'all'"
          class="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border"
          :class="selectedRecipient === 'all'
            ? (isChristmasList ? 'ruby-button text-white shadow-glow border-transparent' : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-glow border-transparent')
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'"
        >
          <span>👨‍👩‍👧‍👦 Toute la famille</span>
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
            :class="selectedRecipient === 'all' ? (isChristmasList ? 'gold-badge' : 'bg-white/20 text-white') : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'"
          >
            {{ list.items.length }}
          </span>
        </button>

        <!-- Individual Family Member Buttons -->
        <button
          v-for="member in recipientsList"
          :key="member.name"
          type="button"
          @click="selectedRecipient = member.name"
          class="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border"
          :class="selectedRecipient === member.name
            ? (isChristmasList ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md border-transparent' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md border-transparent')
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'"
        >
          <span>🎁 {{ member.name }}</span>
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
            :class="selectedRecipient === member.name ? 'bg-white/20 text-white' : (isChristmasList ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400')"
          >
            {{ member.count }}
          </span>
        </button>

        <!-- Invite family member button -->
        <button
          type="button"
          @click="isInviteModalOpen = true"
          class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 shadow-sm border"
          :class="isChristmasList
            ? 'text-amber-800 dark:text-amber-300 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border-amber-200/80 dark:border-amber-800/80'
            : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border-indigo-200/80 dark:border-indigo-800/80'"
        >
          <Users class="w-3.5 h-3.5" />
          <span>+ Inviter un membre</span>
        </button>
      </div>
    </div>

    <!-- Filters, Search & Stats Row -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
      <!-- Status Filters -->
      <div class="flex p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
        <button
          @click="filterStatus = 'all'"
          class="py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
          :class="filterStatus === 'all' ? (isChristmasList ? 'ruby-button text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm') : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
        >
          Tous ({{ list.items.length }})
        </button>

        <button
          @click="filterStatus = 'favorites'"
          class="py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1"
          :class="filterStatus === 'favorites' ? (isChristmasList ? 'ruby-button text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm') : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
        >
          <Heart class="w-3 h-3 fill-current" />
          <span>Coups de cœur</span>
        </button>

        <button
          v-if="!isOwner"
          @click="filterStatus = 'available'"
          class="py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
          :class="filterStatus === 'available' ? (isChristmasList ? 'ruby-button text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm') : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
        >
          Disponibles ({{ list.items.filter(i => !i.isPurchased).length }})
        </button>

        <button
          v-if="!isOwner"
          @click="filterStatus = 'purchased'"
          class="py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
          :class="filterStatus === 'purchased' ? (isChristmasList ? 'ruby-button text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm') : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
        >
          Réservés ({{ list.items.filter(i => i.isPurchased).length }})
        </button>
      </div>

      <!-- Search & Budget Estimate -->
      <div class="flex items-center gap-3">
        <div class="relative flex-1 sm:w-64">
          <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="itemSearch"
            type="text"
            placeholder="Filtrer les cadeaux..."
            class="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div v-if="totalBudget > 0" class="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
          <span>Total :</span>
          <span :class="isChristmasList ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'">~{{ totalBudget.toFixed(2) }} €</span>
        </div>
      </div>
    </div>

    <!-- Gifts Grid -->
    <div v-if="filteredItems.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      <GiftCard
        v-for="item in filteredItems"
        :key="item.id"
        :item="item"
        :is-owner="isOwner"
        :owner-name="list.ownerName"
        :is-christmas="isChristmasList"
        @edit="handleEditItem"
        @delete="handleDeleteItem"
      />
    </div>

    <!-- Empty Gifts State -->
    <div
      v-else
      class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-10 sm:p-14 text-center max-w-md mx-auto space-y-4"
    >
      <div
        class="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-inner"
        :class="isChristmasList ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-500'"
      >
        {{ isChristmasList ? '🎄' : '✨' }}
      </div>
      <div>
        <h3 class="text-lg font-bold font-display text-slate-900 dark:text-white">
          {{ isChristmasList ? (isOwner ? 'Votre hotte de Noël est encore vide' : 'Aucun cadeau de Noël trouvé') : (isOwner ? 'Votre liste est encore vide' : 'Aucun cadeau trouvé') }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          {{ isOwner
            ? (isChristmasList ? 'Ajoutez vos premières envies de cadeaux pour que vos proches puissent les préparer pour Noël !' : 'Ajoutez vos premières envies de cadeaux en collant des liens ou en écrivant vos idées !')
            : 'Aucun cadeau ne correspond aux filtres actuels.'
          }}
        </p>
      </div>

      <button
        v-if="isOwner"
        @click="openAddItem()"
        class="py-2.5 px-5 text-white rounded-2xl text-xs font-bold shadow-glow transition-all active:scale-95 inline-flex items-center gap-1.5"
        :class="isChristmasList ? 'ruby-button' : 'bg-rose-500 hover:bg-rose-600'"
      >
        <Plus class="w-4 h-4" />
        <span>{{ isChristmasList ? 'Ajouter une envie de Noël 🎁' : '+ Ajouter mon premier cadeau' }}</span>
      </button>
    </div>

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
  <div v-else class="max-w-md mx-auto py-24 text-center px-4 space-y-4">
    <div class="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl mx-auto">
      🔍
    </div>
    <h3 class="text-lg font-bold text-slate-900 dark:text-white">Chargement de la liste...</h3>
    <p class="text-xs text-slate-500">Si la liste ne s'affiche pas, vérifiez le code d'invitation.</p>
    <NuxtLink to="/" class="inline-block py-2 px-4 rounded-xl bg-rose-500 text-white text-xs font-bold">
      Retour à l'accueil
    </NuxtLink>
  </div>
</template>
