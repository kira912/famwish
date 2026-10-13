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
  <div v-if="list" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">
    <!-- Top Back button & Breadcrumb -->
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors shadow-subtle"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Toutes les listes</span>
      </NuxtLink>

      <!-- Action buttons: Share & Edit -->
      <div class="flex items-center gap-2">
        <button
          @click="handleShare"
          type="button"
          class="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors shadow-subtle"
        >
          <Users class="w-3.5 h-3.5 text-rose-500" />
          <span>Inviter des proches</span>
        </button>

        <button
          v-if="isOwner"
          @click="isEditListOpen = true"
          type="button"
          class="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition-colors shadow-subtle"
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
        ? 'bg-christmas-pattern'
        : (list.coverGradient ? `bg-gradient-to-r ${list.coverGradient}` : 'bg-gradient-to-r from-xmas-800 to-rose-800')"
    >
      <!-- Gentle Falling Snow for Christmas lists -->
      <SnowEffect v-if="isChristmasList" :count="18" />

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-3 max-w-2xl">
          <!-- Emoji & Tag -->
          <div class="flex items-center gap-3">
            <span class="text-4xl sm:text-5xl filter drop-shadow-sm">{{ list.coverEmoji || (isChristmasList ? '🎄' : '🎁') }}</span>
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="isChristmasList"
                class="px-2.5 py-0.5 rounded-full gold-badge text-xs font-bold uppercase tracking-wider"
              >
                Noël ✨
              </span>

              <span
                v-if="isOwner"
                class="px-2.5 py-0.5 rounded-full bg-white text-slate-900 text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                Votre Liste
              </span>
              <span
                v-else
                class="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-medium"
              >
                Liste de {{ list.ownerName }}
              </span>

              <div
                v-if="daysLeft !== null"
                class="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-black/40 backdrop-blur-md text-white"
              >
                <Calendar class="w-3 h-3 text-amber-300" />
                <span v-if="daysLeft > 0">J-{{ daysLeft }}</span>
                <span v-else-if="daysLeft === 0">Aujourd'hui ! 🎉</span>
                <span v-else>Terminé</span>
              </div>
            </div>
          </div>

          <h1 id="list-detail-title" class="text-2xl sm:text-4xl font-extrabold font-display leading-tight">
            {{ list.title }}
          </h1>

          <p v-if="list.description" class="text-xs sm:text-sm text-white/90 leading-relaxed max-w-xl font-normal">
            {{ list.description }}
          </p>

          <!-- Invite Code pill -->
          <div class="pt-1 flex items-center gap-2 text-xs text-white/90">
            <span>Code d'invitation :</span>
            <button
              @click="copyInviteCode"
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold tracking-wider bg-black/30 hover:bg-black/40 text-amber-200 border border-white/10 transition-colors"
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
            class="flex items-center gap-2 py-3 px-5 sm:py-3.5 sm:px-6 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs sm:text-sm shadow-sm transition-colors active:scale-98"
          >
            <Plus class="w-4 h-4 stroke-[2.5]" />
            <span>{{ isChristmasList ? 'Ajouter un cadeau de Noël 🎁' : 'Ajouter une envie de cadeau' }}</span>
          </button>

          <!-- Non-owner Secret Notice -->
          <div
            v-else
            class="p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-xs max-w-xs space-y-1 shadow-sm"
          >
            <div class="flex items-center gap-1.5 font-bold text-amber-300">
              <Lock class="w-3.5 h-3.5" />
              <span>Surprise garantie !</span>
            </div>
            <p class="text-[11px] leading-relaxed text-white/80">
              Cochez un cadeau pour indiquer à la famille que vous vous en chargez. {{ list.ownerName }} ne verra pas vos réservations secrètes.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Anti-Spoiler Notice for Owner -->
    <div
      v-if="isOwner"
      role="note"
      class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
    >
      <div class="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
        <Lock class="w-4 h-4 text-rose-500 shrink-0" />
        <span class="leading-relaxed">
          <strong>Mode Anti-Spoiler actif :</strong> Pour préserver la surprise lors du déballage, vous ne voyez pas quels cadeaux ont été réservés en secret par vos proches ! 🤫
        </span>
      </div>
    </div>

    <!-- Multi-person Family Members Tabs Navigation -->
    <section aria-labelledby="members-section-title" class="space-y-2.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Users class="w-4 h-4 text-rose-500" />
          <h2 id="members-section-title" class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Cadeaux par membre de la famille
          </h2>
        </div>
        <button
          @click="openAddItem()"
          type="button"
          class="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Ajouter une idée pour un proche</span>
        </button>
      </div>

      <!-- Members Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <!-- All Family Button -->
        <button
          type="button"
          @click="selectedRecipient = 'all'"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 border"
          :class="selectedRecipient === 'all'
            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
        >
          <span>👨‍👩‍👧‍👦 Toute la famille</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
            :class="selectedRecipient === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'"
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
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 border"
          :class="selectedRecipient === member.name
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'"
        >
          <span>🎁 {{ member.name }}</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
            :class="selectedRecipient === member.name ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'"
          >
            {{ member.count }}
          </span>
        </button>

        <!-- Invite family member button -->
        <button
          type="button"
          @click="isInviteModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Users class="w-3.5 h-3.5 text-rose-500" />
          <span>+ Inviter un membre</span>
        </button>
      </div>
    </section>

    <!-- Filters, Search & Stats Row -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
      <!-- Status Filters -->
      <div class="flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-subtle overflow-x-auto">
        <button
          @click="filterStatus = 'all'"
          type="button"
          class="py-1 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
          :class="filterStatus === 'all' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
        >
          Tous ({{ list.items.length }})
        </button>

        <button
          @click="filterStatus = 'favorites'"
          type="button"
          class="py-1 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1"
          :class="filterStatus === 'favorites' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
        >
          <Heart class="w-3 h-3 fill-current" />
          <span>Coups de cœur</span>
        </button>

        <button
          v-if="!isOwner"
          @click="filterStatus = 'available'"
          type="button"
          class="py-1 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
          :class="filterStatus === 'available' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
        >
          Disponibles ({{ list.items.filter(i => !i.isPurchased).length }})
        </button>

        <button
          v-if="!isOwner"
          @click="filterStatus = 'purchased'"
          type="button"
          class="py-1 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
          :class="filterStatus === 'purchased' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
        >
          Réservés ({{ list.items.filter(i => i.isPurchased).length }})
        </button>
      </div>

      <!-- Search & Budget Estimate -->
      <div class="flex items-center gap-3">
        <div class="relative flex-1 sm:w-56">
          <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="itemSearch"
            type="search"
            placeholder="Filtrer les cadeaux..."
            class="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 shadow-subtle focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div v-if="totalBudget > 0" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
          <span>Budget estimé :</span>
          <span class="text-slate-900 dark:text-white font-bold font-mono">~{{ totalBudget.toFixed(2) }} €</span>
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
      class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-md mx-auto space-y-3"
    >
      <div
        class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
      >
        {{ isChristmasList ? '🎄' : '✨' }}
      </div>
      <div>
        <h3 class="text-base font-bold font-display text-slate-900 dark:text-white">
          {{ isChristmasList ? (isOwner ? 'Votre liste de Noël est encore vide' : 'Aucun cadeau de Noël trouvé') : (isOwner ? 'Votre liste est encore vide' : 'Aucun cadeau trouvé') }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          {{ isOwner
            ? 'Ajoutez vos premières envies de cadeaux en collant des liens ou en écrivant vos idées !'
            : 'Aucun cadeau ne correspond aux filtres actuels.'
          }}
        </p>
      </div>

      <button
        v-if="isOwner"
        @click="openAddItem()"
        type="button"
        class="py-2 px-4 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors active:scale-98 inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700"
      >
        <Plus class="w-4 h-4" />
        <span>Ajouter une envie de cadeau</span>
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
