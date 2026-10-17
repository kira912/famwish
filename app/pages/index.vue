<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import {
  Sparkles,
  Plus,
  QrCode,
  Search,
  Gift,
  Lock,
  ShieldCheck,
  ArrowRight,
  Crown,
  Users,
  FolderHeart,
  Camera,
  CheckCircle2,
  Compass
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import type { Wishlist, WishlistCategory } from '~/types'

const router = useRouter()

const {
  lists,
  myLists,
  familyLists,
  searchQuery,
  selectedCategory
} = useWishlists()

const { currentUser, openAuthModal } = useAuth()

const openShareModal = inject<(list: Wishlist) => void>('openShareModal')
const openCreateListModal = inject<() => void>('openCreateListModal')
const openScannerModal = inject<() => void>('openScannerModal', () => {})

const activeTab = ref<'all' | 'my' | 'family'>('all')
const quickJoinCode = ref('')

const categories: { key: WishlistCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'Toutes les occasions', emoji: '🌟' },
  { key: 'christmas', label: 'Noël', emoji: '🎄' },
  { key: 'birthday', label: 'Anniversaires', emoji: '🎂' },
  { key: 'birth', label: 'Naissances', emoji: '🍼' },
  { key: 'wedding', label: 'Mariages', emoji: '💍' },
  { key: 'housewarming', label: 'Crémaillères', emoji: '🏡' },
]

function matchesFilters(l: Wishlist): boolean {
  if (selectedCategory.value !== 'all' && l.category !== selectedCategory.value) {
    return false
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    const matchTitle = l.title.toLowerCase().includes(q)
    const matchOwner = l.ownerName.toLowerCase().includes(q)
    const matchItem = l.items.some(i => i.title.toLowerCase().includes(q))
    const matchMember = Array.isArray(l.members) && l.members.some((m: any) => {
      const mName = typeof m === 'object' && m?.name ? String(m.name) : (typeof m === 'string' ? m : '')
      return mName.toLowerCase().includes(q)
    })
    return matchTitle || matchOwner || matchItem || matchMember
  }
  return true
}

const filteredMyLists = computed(() => {
  return myLists.value.filter(matchesFilters)
})

const filteredFamilyLists = computed(() => {
  return familyLists.value.filter(matchesFilters)
})

const displayedLists = computed(() => {
  if (!currentUser.value) return []

  if (activeTab.value === 'my') {
    return filteredMyLists.value
  }
  if (activeTab.value === 'family') {
    return filteredFamilyLists.value
  }
  return lists.value.filter(matchesFilters)
})

const showSplitSections = computed(() => {
  return (
    activeTab.value === 'all' &&
    filteredMyLists.value.length > 0 &&
    filteredFamilyLists.value.length > 0
  )
})

const totalReservedCount = computed(() => {
  return lists.value.reduce((acc, l) => acc + l.items.filter(i => i.isPurchased).length, 0)
})

const totalWishesCount = computed(() => {
  return lists.value.reduce((acc, l) => acc + l.items.length, 0)
})

function handleQuickJoinSubmit() {
  const clean = quickJoinCode.value.trim().toUpperCase()
  if (!clean) {
    router.push('/join')
    return
  }
  router.push(`/join?code=${encodeURIComponent(clean)}`)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-8">
    <!-- ===================================================================== -->
    <!-- LOGGED-IN VIEW: PERSONAL FAMILY HUB & WORKSPACE (Distinct from Detail) -->
    <!-- ===================================================================== -->
    <template v-if="currentUser">
      <!-- Top Bento Hub Header (Light Editorial Card + Quick Join Ticket) -->
      <section aria-labelledby="hero-title" class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Left 8 Cols: Personal Hub Overview & KPIs -->
        <div class="lg:col-span-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-card relative overflow-hidden flex flex-col justify-between gap-6">
          <!-- Subtle Decorative Mesh Glow (No heavy dark cover like list detail) -->
          <div class="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-rose-500/8 dark:bg-rose-500/10 blur-3xl pointer-events-none" />
          <div class="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-amber-500/8 dark:bg-amber-500/10 blur-3xl pointer-events-none" />

          <div class="relative z-10 space-y-4">
            <!-- User Greeting Pill & Context -->
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="inline-flex items-center gap-2.5 pr-3.5 pl-1.5 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <img
                  :src="currentUser.avatar"
                  :alt="currentUser.name"
                  class="w-6 h-6 rounded-full object-cover ring-1 ring-white dark:ring-slate-700"
                />
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Espace de {{ currentUser.name.split(' ')[0] }}
                </span>
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Tableau de bord
                </span>
              </div>

              <button
                @click="openCreateListModal?.()"
                type="button"
                class="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                <Plus class="w-4 h-4 stroke-[2.5]" />
                <span>Créer une liste</span>
              </button>
            </div>

            <!-- Main Hub Heading -->
            <div class="space-y-1.5 max-w-2xl">
              <p class="text-[11px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <FolderHeart class="w-3.5 h-3.5" />
                <span>Mes cercles & événements partagés</span>
              </p>
              <h1 id="hero-title" class="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white leading-tight">
                Les souhaits de toute la famille réunis au même endroit.
              </h1>
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Naviguez entre les listes que vous avez créées et celles de vos proches dont vous faites partie. Ouvrez un dossier pour gérer les idées ou réserver en secret.
              </p>
            </div>
          </div>

          <!-- Interactive KPI Stat Tiles (Act as quick filters) -->
          <div class="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <!-- Tile 1: All Lists -->
            <button
              type="button"
              @click="activeTab = 'all'"
              class="text-left p-3.5 rounded-2xl border transition-all cursor-pointer"
              :class="activeTab === 'all'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 text-slate-900 dark:text-white'"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] font-semibold opacity-75">Total listes</span>
                <FolderHeart class="w-4 h-4 text-rose-500" />
              </div>
              <div class="text-xl sm:text-2xl font-extrabold font-display leading-none">
                {{ lists.length }}
              </div>
              <div class="text-[10px] opacity-70 mt-1 truncate">
                {{ totalWishesCount }} souhait{{ totalWishesCount > 1 ? 's' : '' }} au total
              </div>
            </button>

            <!-- Tile 2: Created by me -->
            <button
              type="button"
              @click="activeTab = 'my'"
              class="text-left p-3.5 rounded-2xl border transition-all cursor-pointer"
              :class="activeTab === 'my'
                ? 'bg-amber-500 text-amber-950 border-amber-500 shadow-sm'
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40 hover:border-amber-300 text-slate-900 dark:text-white'"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] font-semibold opacity-80">Créées par moi</span>
                <Crown class="w-4 h-4 text-amber-600 dark:text-amber-400" :class="activeTab === 'my' ? 'text-amber-950' : ''" />
              </div>
              <div class="text-xl sm:text-2xl font-extrabold font-display leading-none">
                {{ myLists.length }}
              </div>
              <div class="text-[10px] opacity-75 mt-1 truncate">
                Organisateur 👑
              </div>
            </button>

            <!-- Tile 3: Joined Family Lists -->
            <button
              type="button"
              @click="activeTab = 'family'"
              class="text-left p-3.5 rounded-2xl border transition-all cursor-pointer"
              :class="activeTab === 'family'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900/40 hover:border-indigo-300 text-slate-900 dark:text-white'"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] font-semibold opacity-80">Listes rejointes</span>
                <Users class="w-4 h-4 text-indigo-500" :class="activeTab === 'family' ? 'text-white' : ''" />
              </div>
              <div class="text-xl sm:text-2xl font-extrabold font-display leading-none">
                {{ familyLists.length }}
              </div>
              <div class="text-[10px] opacity-75 mt-1 truncate">
                Famille & Amis 🤝
              </div>
            </button>

            <!-- Tile 4: Reserved Surprises -->
            <div class="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 text-slate-900 dark:text-white">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Réservations</span>
                <CheckCircle2 class="w-4 h-4 text-emerald-500" />
              </div>
              <div class="text-xl sm:text-2xl font-extrabold font-display leading-none text-emerald-900 dark:text-emerald-200">
                {{ totalReservedCount }}
              </div>
              <div class="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 truncate">
                {{ totalReservedCount }} cadeaux réservés
              </div>
            </div>
          </div>
        </div>

        <!-- Right 4 Cols: Direct Join Ticket Card (Code / QR Scanner) -->
        <div class="lg:col-span-4 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 shadow-card border border-slate-800 flex flex-col justify-between gap-5 relative overflow-hidden">
          <div class="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

          <div class="space-y-3 relative z-10">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-amber-300">
              <QrCode class="w-3.5 h-3.5" />
              <span>Invitation Famille</span>
            </div>

            <h2 class="text-lg sm:text-xl font-extrabold font-display tracking-tight">
              Rejoindre la liste d'un proche
            </h2>
            <p class="text-xs text-slate-300 leading-relaxed">
              Vous avez reçu un code d'invitation sur WhatsApp ou un QR code à table ? Entrez-le ici pour l'ajouter à vos listes.
            </p>
          </div>

          <form @submit.prevent="handleQuickJoinSubmit" class="space-y-2.5 relative z-10">
            <div class="flex items-center gap-2">
              <input
                v-model="quickJoinCode"
                type="text"
                placeholder="Code (ex: NOEL26)"
                aria-label="Code d'invitation de la liste"
                class="w-full min-w-0 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 text-white placeholder:text-slate-400 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                class="shrink-0 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Rejoindre</span>
                <ArrowRight class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                @click="openScannerModal()"
                class="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Camera class="w-3.5 h-3.5 text-amber-300" />
                <span>Scanner un QR</span>
              </button>

              <NuxtLink
                to="/join"
                class="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 flex items-center justify-center gap-1 transition-colors"
              >
                <span>Rejoindre avec un code</span>
              </NuxtLink>
            </div>
          </form>
        </div>
      </section>

      <!-- Lists Directory & Filter Workspace -->
      <section aria-labelledby="dashboard-title" class="space-y-6">
        <h2 id="dashboard-title" class="sr-only">Tableau de bord des listes</h2>

        <!-- Unified Command Bar: Role Tabs + Occasion Pills + Search -->
        <div class="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-subtle space-y-3">
          <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <!-- Role Switcher Tabs -->
            <div class="flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl shrink-0 overflow-x-auto scrollbar-none">
              <button
                @click="activeTab = 'all'"
                type="button"
                class="py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                :class="activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              >
                <span>Toutes les listes</span>
                <span
                  class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                  :class="activeTab === 'all' ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'"
                >
                  {{ lists.length }}
                </span>
              </button>

              <button
                @click="activeTab = 'my'"
                type="button"
                class="py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                :class="activeTab === 'my'
                  ? 'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              >
                <Crown class="w-3.5 h-3.5 text-amber-500" />
                <span>Mes Listes</span>
                <span
                  class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                  :class="activeTab === 'my' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'"
                >
                  {{ myLists.length }}
                </span>
              </button>

              <button
                @click="activeTab = 'family'"
                type="button"
                class="py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                :class="activeTab === 'family'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              >
                <Users class="w-3.5 h-3.5 text-indigo-500" />
                <span>Famille & Amis</span>
                <span
                  class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                  :class="activeTab === 'family' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'"
                >
                  {{ familyLists.length }}
                </span>
              </button>
            </div>

            <!-- Search Input -->
            <div class="relative flex-1 max-w-md">
              <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Filtrer par nom de liste, participant ou idée cadeau..."
                class="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
          </div>

          <!-- Occasion / Category Filter Chips -->
          <div class="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800/80 scrollbar-none">
            <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1 shrink-0 flex items-center gap-1">
              <Compass class="w-3 h-3" />
              <span>Occasion :</span>
            </span>
            <button
              v-for="cat in categories"
              :key="cat.key"
              type="button"
              @click="selectedCategory = cat.key"
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer"
              :class="selectedCategory === cat.key
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
            >
              <span>{{ cat.emoji }}</span>
              <span>{{ cat.label }}</span>
            </button>
          </div>
        </div>

        <!-- CASE 1: Split Grouped Sections when user has BOTH own lists and joined family lists -->
        <div v-if="showSplitSections" class="space-y-10">
          <!-- Group A: Joined Family Lists ("Listes dont je fais partie") -->
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Users class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm sm:text-base font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Listes de mes proches dont je fais partie</span>
                    <span class="px-2 py-0.5 rounded-full text-[11px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                      {{ filteredFamilyLists.length }}
                    </span>
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    Listes partagées par votre famille ou vos amis • Réservez leurs cadeaux en secret ou ajoutez vos souhaits
                  </p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              <ListCard
                v-for="list in filteredFamilyLists"
                :key="list.id"
                :list="list"
                @share="openShareModal?.(list)"
              />
            </div>
          </div>

          <!-- Group B: Lists Created by Me ("Mes listes créées") -->
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Crown class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm sm:text-base font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Listes créées et organisées par moi</span>
                    <span class="px-2 py-0.5 rounded-full text-[11px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                      {{ filteredMyLists.length }}
                    </span>
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    Vos événements personnels et familiaux • Invitez vos proches avec le code ou le QR code
                  </p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              <ListCard
                v-for="list in filteredMyLists"
                :key="list.id"
                :list="list"
                @share="openShareModal?.(list)"
              />
            </div>
          </div>
        </div>

        <!-- CASE 2: Single Grid with Contextual Section Header + Quick Create/Join Card -->
        <div v-else-if="displayedLists.length > 0" class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="w-2.5 h-2.5 rounded-full"
                :class="activeTab === 'family' ? 'bg-indigo-500' : (activeTab === 'my' ? 'bg-amber-500' : 'bg-rose-500')"
              />
              <h3 class="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <template v-if="activeTab === 'family'">
                  Listes de la famille & des amis ({{ displayedLists.length }})
                </template>
                <template v-else-if="activeTab === 'my'">
                  Listes créées par moi ({{ displayedLists.length }})
                </template>
                <template v-else>
                  Vos listes actives ({{ displayedLists.length }})
                </template>
              </h3>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <ListCard
              v-for="list in displayedLists"
              :key="list.id"
              :list="list"
              @share="openShareModal?.(list)"
            />

            <!-- Dashed Action Card to Create or Join Another List (Reinforces Folder Hub Metaphor) -->
            <div
              class="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 bg-slate-50/50 dark:bg-slate-900/40 p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[240px] transition-colors"
            >
              <div class="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-rose-500 shadow-subtle">
                <Plus class="w-6 h-6" />
              </div>
              <div class="space-y-1 max-w-xs">
                <h4 class="text-sm font-bold text-slate-900 dark:text-white">
                  Une autre occasion en vue ?
                </h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Créez un nouveau dossier d'événement ou rejoignez la liste d'un autre membre de la famille.
                </p>
              </div>
              <div class="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  @click="openCreateListModal?.()"
                  type="button"
                  class="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-subtle transition-colors cursor-pointer"
                >
                  + Nouvelle liste
                </button>
                <NuxtLink
                  to="/join"
                  class="py-2 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold transition-colors"
                >
                  Entrer un code
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <!-- CASE 3: Empty State for logged-in user -->
        <div
          v-else
          class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 shadow-subtle"
        >
          <div class="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto">
            {{ activeTab === 'family' ? '🤝' : '🎁' }}
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white">
              <template v-if="searchQuery">
                Aucune liste correspondante
              </template>
              <template v-else-if="activeTab === 'family'">
                Vous n'avez pas encore rejoint la liste d'un proche
              </template>
              <template v-else>
                Aucune liste pour le moment
              </template>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              <template v-if="searchQuery">
                Aucun résultat pour "{{ searchQuery }}". Essayez un autre mot-clé ou réinitialisez les filtres.
              </template>
              <template v-else-if="activeTab === 'family'">
                Demandez le code d'invitation ou scannez le QR code d'un membre de votre famille pour voir sa liste apparaître ici.
              </template>
              <template v-else>
                Créez votre première liste de souhaits ou rejoignez celle d'un proche !
              </template>
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              @click="openCreateListModal?.()"
              type="button"
              class="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
            >
              + Créer une liste
            </button>

            <NuxtLink
              to="/join"
              class="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors hover:bg-slate-50"
            >
              Rejoindre avec un code
            </NuxtLink>
          </div>
        </div>
      </section>
    </template>

    <!-- ===================================================================== -->
    <!-- LOGGED-OUT VIEW: EDITORIAL WELCOME & ACCESS GATE                      -->
    <!-- ===================================================================== -->
    <template v-else>
      <section aria-labelledby="hero-title" class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <!-- Left 7 Cols: Editorial Welcome Card -->
        <div class="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-card flex flex-col justify-between gap-6 relative overflow-hidden">
          <div class="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

          <div class="space-y-4 relative z-10">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300">
              <Sparkles class="w-3.5 h-3.5 text-rose-500" />
              <span>Partage de listes de cadeaux pour Noël & la famille</span>
            </div>

            <h1 id="hero-title" class="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Les souhaits de toute la famille réunis au même endroit.
            </h1>

            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Partagez vos envies, découvrez celles de vos proches et réservez des cadeaux en secret pour préserver la magie et la surprise lors du déballage !
            </p>

            <!-- CTA Buttons -->
            <div class="flex flex-wrap items-center gap-3 pt-2">
              <button
                @click="openCreateListModal?.()"
                type="button"
                class="flex items-center gap-2 py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors active:scale-98 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Créer une liste</span>
              </button>

              <NuxtLink
                to="/join"
                class="flex items-center gap-2 py-3 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs sm:text-sm transition-colors active:scale-98"
              >
                <QrCode class="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Rejoindre avec un code</span>
              </NuxtLink>

              <button
                @click="openAuthModal?.()"
                type="button"
                class="flex items-center gap-2 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <span>Se connecter</span>
              </button>
            </div>
          </div>

          <!-- Reassurance Badges -->
          <div class="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 relative z-10">
            <div class="flex items-center gap-1.5">
              <Lock class="w-3.5 h-3.5 text-rose-500" />
              <span>Réservations 100% secrètes</span>
            </div>
            <div class="flex items-center gap-1.5">
              <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
              <span>Sans mot de passe requis</span>
            </div>
          </div>
        </div>

        <!-- Right 5 Cols: Quick Join Ticket & Private Space Access -->
        <div class="lg:col-span-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-card flex flex-col justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 text-xs font-semibold">
              <Lock class="w-3 h-3" />
              <span>Espace Privé</span>
            </div>
            <h2 id="public-access-title" class="text-xl sm:text-2xl font-bold font-display">
              Vos listes de famille sont protégées
            </h2>
            <p class="text-xs text-slate-300 leading-relaxed">
              Chaque famille accède à ses propres dossiers de souhaits par code d'invitation, QR code ou connexion en 1 clic.
            </p>
          </div>

          <!-- Quick Code Input Form -->
          <form @submit.prevent="handleQuickJoinSubmit" class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <label class="block text-xs font-semibold text-amber-200">
              Un proche vous a partagé un code ?
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model="quickJoinCode"
                type="text"
                placeholder="Ex: NOEL-2026"
                class="w-full min-w-0 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                class="shrink-0 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Entrer un code</span>
                <ArrowRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          <!-- 2 Quick Action Rows -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              @click="openCreateListModal?.()"
              class="group p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors space-y-1"
            >
              <div class="text-xs font-bold text-white flex items-center justify-between">
                <span>✨ Créer une liste</span>
                <ArrowRight class="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p class="text-[11px] text-slate-400">
                Démarrez avec votre prénom sans mot de passe.
              </p>
            </div>

            <div
              @click="openAuthModal?.()"
              class="group p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors space-y-1"
            >
              <div class="text-xs font-bold text-white flex items-center justify-between">
                <span>🔐 Se connecter</span>
                <ArrowRight class="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p class="text-[11px] text-slate-400">
                Retrouvez toutes vos listes en 1 clic.
              </p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- App Highlights / Features Info Section -->
    <section aria-labelledby="features-title" class="pt-8 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
      <h2 id="features-title" class="sr-only">Fonctionnalités FamWish</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <!-- Feature 1 -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-subtle space-y-2">
          <div class="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Lock class="w-4 h-4" />
          </div>
          <h3 class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Réservation Anti-Spoiler</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Quand vous cochez un cadeau, la réservation reste secrète pour le destinataire afin de préserver la magie du déballage.
          </p>
        </div>

        <!-- Feature 2 -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-subtle space-y-2">
          <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Sparkles class="w-4 h-4" />
          </div>
          <h3 class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Extraction de Liens Web</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Collez le lien de n'importe quel site e-commerce et l'application récupère automatiquement la photo, le titre et le prix.
          </p>
        </div>

        <!-- Feature 3 -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-subtle space-y-2">
          <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <QrCode class="w-4 h-4" />
          </div>
          <h3 class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Partage Instantané</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Générez un QR Code pour la table de fête ou partagez votre lien sur le groupe WhatsApp de la famille en 1 clic.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
