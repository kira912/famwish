<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
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
  Check
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import type { Wishlist, WishlistItem } from '~/types'

const route = useRoute()
const router = useRouter()
const { getList, fetchListById, deleteList, deleteItem } = useWishlists()
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
const isCodeCopied = ref(false)

// Item filters
const filterStatus = ref<'all' | 'favorites' | 'available' | 'purchased'>('all')
const selectedRecipient = ref<string>('all')
const itemSearch = ref('')

const recipientsList = computed(() => {
  if (!list.value) return []
  const map = new Map<string, { name: string; count: number; availableCount: number }>()

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
  } else if (currentUser.value?.name) {
    defaultAddRecipient.value = currentUser.value.name
  } else if (typeof selectedRecipient.value === 'string' && selectedRecipient.value !== 'all') {
    defaultAddRecipient.value = selectedRecipient.value
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

      <!-- Action buttons: Share & Edit -->
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

          <!-- Invite Code pill -->
          <div class="pt-1 flex items-center gap-2 text-xs text-white/95">
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

        <!-- Right Side CTA: Add Gift if Owner -->
        <div class="shrink-0 flex flex-col items-start md:items-end gap-3 relative z-10">
          <button
            v-if="isOwner"
            @click="openAddItem()"
            type="button"
            class="flex items-center gap-2 font-extrabold text-xs sm:text-sm shadow-sm transition-all active:scale-98"
            :class="isChristmasList
              ? 'gold-gradient-btn py-3 px-5 sm:py-3.5 sm:px-7 rounded-2xl shadow-[0_4px_20px_rgba(250,204,21,0.4)]'
              : 'py-3 px-5 sm:py-3.5 sm:px-6 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 font-bold'"
          >
            <Plus class="w-4 h-4 stroke-[2.5]" />
            <span>{{ isChristmasList ? 'Ajouter un cadeau sous le sapin 🎁' : 'Ajouter une envie de cadeau' }}</span>
          </button>

          <!-- Non-owner Secret Notice -->
          <div
            v-else
            class="p-4 rounded-2xl backdrop-blur-md text-xs max-w-xs space-y-1.5 shadow-lg border"
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

    <!-- Anti-Spoiler Notice for Owner -->
    <div
      v-if="isOwner"
      role="note"
      class="p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-sm transition-colors"
      :class="isChristmasList
        ? 'bg-gradient-to-r from-amber-50/90 via-xmas-50/60 to-amber-50/90 dark:from-xmas-950/70 dark:via-slate-900/90 dark:to-xmas-950/70 border-amber-300/70 dark:border-amber-600/40'
        : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'"
    >
      <div
        class="flex items-center gap-2.5"
        :class="isChristmasList ? 'text-amber-950 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'"
      >
        <span v-if="isChristmasList" class="text-base shrink-0">🤫</span>
        <Lock v-else class="w-4 h-4 text-rose-500 shrink-0" />
        <span class="leading-relaxed">
          <strong :class="isChristmasList ? 'text-amber-900 dark:text-amber-100' : ''">
            {{ isChristmasList ? 'Secret du Père Noël activé :' : 'Mode Anti-Spoiler actif :' }}
          </strong>
          {{ isChristmasList
            ? 'Pour préserver toute la magie au déballage sous le sapin le 25 décembre, vous ne voyez pas quels cadeaux ont été réservés en secret par vos proches ! 🎅🎁'
            : 'Pour préserver la surprise lors du déballage, vous ne voyez pas quels cadeaux ont été réservés en secret par vos proches ! 🤫'
          }}
        </span>
      </div>
    </div>

    <!-- Multi-person Family Members Tabs Navigation -->
    <section aria-labelledby="members-section-title" class="space-y-2.5 relative z-10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span v-if="isChristmasList" class="text-base">🎅</span>
          <Users v-else class="w-4 h-4 text-rose-500" />
          <h2
            id="members-section-title"
            class="text-xs font-bold uppercase tracking-wider"
            :class="isChristmasList ? 'text-amber-950 dark:text-amber-200 font-extrabold' : 'text-slate-800 dark:text-slate-200'"
          >
            {{ isChristmasList ? 'Hotte de Noël par membre de la famille' : 'Cadeaux par membre de la famille' }}
          </h2>
        </div>
        <button
          @click="openAddItem()"
          type="button"
          class="inline-flex items-center gap-1 text-xs font-bold hover:underline transition-colors"
          :class="isChristmasList ? 'text-amber-800 dark:text-amber-300' : 'text-rose-600 dark:text-rose-400 font-semibold'"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>{{ isChristmasList ? 'Ajouter une idée pour la hotte' : 'Ajouter une idée pour un proche' }}</span>
        </button>
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
          <span>{{ isChristmasList ? '👨‍👩‍👧‍👦 Toute la famille' : '👨‍👩‍👧‍👦 Toute la famille' }}</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
            :class="selectedRecipient === 'all'
              ? (isChristmasList ? 'bg-amber-300/30 text-amber-200' : 'bg-white/20 text-white')
              : (isChristmasList ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')"
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
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border shadow-sm active:scale-98"
          :class="[
            selectedRecipient === member.name
              ? (isChristmasList
                  ? 'gold-gradient-btn border-amber-400 font-extrabold'
                  : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white')
              : (isChristmasList
                  ? 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 border-amber-300/60 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-slate-800'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800')
          ]"
        >
          <span>{{ isChristmasList ? `🎁 ${member.name}` : `🎁 ${member.name}` }}</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
            :class="selectedRecipient === member.name
              ? (isChristmasList ? 'bg-amber-950/20 text-amber-950' : 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900')
              : (isChristmasList ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')"
          >
            {{ member.count }}
          </span>
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
    </section>

    <!-- Filters, Search & Stats Row -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 relative z-10">
      <!-- Status Filters -->
      <div
        class="flex p-1 rounded-xl border shadow-subtle overflow-x-auto"
        :class="isChristmasList
          ? 'bg-white/95 dark:bg-slate-900/95 border-amber-300/70 dark:border-amber-700/50'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'"
      >
        <button
          @click="filterStatus = 'all'"
          type="button"
          class="py-1 px-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
          :class="filterStatus === 'all'
            ? (isChristmasList ? 'bg-gradient-to-r from-xmas-700 to-rose-700 text-amber-100 shadow-sm' : 'bg-rose-600 text-white shadow-sm')
            : (isChristmasList ? 'text-amber-950 dark:text-amber-200 hover:text-rose-600' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold')"
        >
          Tous ({{ list.items.length }})
        </button>

        <button
          @click="filterStatus = 'favorites'"
          type="button"
          class="py-1 px-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1"
          :class="filterStatus === 'favorites'
            ? (isChristmasList ? 'bg-gradient-to-r from-xmas-700 to-rose-700 text-amber-100 shadow-sm' : 'bg-rose-600 text-white shadow-sm')
            : (isChristmasList ? 'text-amber-950 dark:text-amber-200 hover:text-rose-600' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold')"
        >
          <Heart class="w-3 h-3 fill-current" :class="isChristmasList && filterStatus === 'favorites' ? 'text-amber-300' : ''" />
          <span>{{ isChristmasList ? 'Coups de cœur ⭐' : 'Coups de cœur' }}</span>
        </button>

        <button
          v-if="!isOwner"
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
          v-if="!isOwner"
          @click="filterStatus = 'purchased'"
          type="button"
          class="py-1 px-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
          :class="filterStatus === 'purchased'
            ? (isChristmasList ? 'bg-gradient-to-r from-xmas-700 to-rose-700 text-amber-100 shadow-sm' : 'bg-rose-600 text-white shadow-sm')
            : (isChristmasList ? 'text-amber-950 dark:text-amber-200 hover:text-rose-600' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold')"
        >
          {{ isChristmasList ? 'Réservés par les lutins 🎅' : 'Réservés' }} ({{ list.items.filter(i => i.isPurchased).length }})
        </button>
      </div>

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
      class="rounded-3xl border p-8 sm:p-12 text-center max-w-md mx-auto space-y-3 relative z-10"
      :class="isChristmasList
        ? 'border-2 border-amber-300/80 dark:border-amber-600/50 bg-gradient-to-b from-white via-amber-50/40 to-amber-100/30 dark:from-slate-900 dark:via-xmas-950/40 dark:to-slate-900 shadow-[0_10px_30px_rgba(234,179,8,0.15)]'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'"
    >
      <div
        class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm"
        :class="isChristmasList
          ? 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-xmas-900 dark:to-amber-950/60 border border-amber-300 text-amber-950'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'"
      >
        {{ isChristmasList ? '🎄' : '✨' }}
      </div>
      <div>
        <h3
          class="text-base font-extrabold font-display"
          :class="isChristmasList ? 'text-amber-950 dark:text-amber-100' : 'text-slate-900 dark:text-white'"
        >
          {{ isChristmasList
            ? (isOwner ? 'Votre hotte de Noël est encore vide 🎅' : 'Aucun cadeau de Noël trouvé sous le sapin')
            : (isOwner ? 'Votre liste est encore vide' : 'Aucun cadeau trouvé')
          }}
        </h3>
        <p
          class="text-xs mt-1.5 max-w-xs mx-auto leading-relaxed"
          :class="isChristmasList ? 'text-amber-900/80 dark:text-amber-300/80 font-medium' : 'text-slate-500 dark:text-slate-400'"
        >
          {{ isOwner
            ? (isChristmasList
                ? 'Remplissez votre liste au Père Noël en ajoutant vos premiers souhaits et liens vers vos cadeaux rêvés !'
                : 'Ajoutez vos premières envies de cadeaux en collant des liens ou en écrivant vos idées !')
            : 'Aucun cadeau ne correspond aux filtres actuels.'
          }}
        </p>
      </div>

      <button
        v-if="isOwner"
        @click="openAddItem()"
        type="button"
        class="py-2.5 px-5 rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-98 inline-flex items-center gap-2"
        :class="isChristmasList
          ? 'gold-gradient-btn shadow-[0_4px_16px_rgba(250,204,21,0.4)]'
          : 'bg-rose-600 hover:bg-rose-700 text-white font-semibold'"
      >
        <Plus class="w-4 h-4 stroke-[2.5]" />
        <span>{{ isChristmasList ? 'Ajouter un cadeau sous le sapin ✨' : 'Ajouter une envie de cadeau' }}</span>
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
