<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import {
  Sparkles,
  Plus,
  QrCode,
  Search,
  Gift,
  Heart,
  Lock,
  Calendar,
  Share2,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import type { Wishlist, WishlistCategory } from '~/types'

const {
  lists,
  myLists,
  familyLists,
  isLoading,
  searchQuery,
  selectedCategory
} = useWishlists()

const { currentUser, openAuthModal } = useAuth()

const openShareModal = inject<(list: Wishlist) => void>('openShareModal')
const openCreateListModal = inject<() => void>('openCreateListModal')
const openScannerModal = inject<() => void>('openScannerModal')

const activeTab = ref<'all' | 'my' | 'family'>('all')

const categories: { key: WishlistCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'Toutes les occasions', emoji: '🌟' },
  { key: 'christmas', label: 'Noël 2026', emoji: '🎄' },
  { key: 'birthday', label: 'Anniversaires', emoji: '🎂' },
  { key: 'birth', label: 'Naissances', emoji: '🍼' },
  { key: 'wedding', label: 'Mariages', emoji: '💍' },
  { key: 'housewarming', label: 'Crémaillères', emoji: '🏡' },
]

const displayedLists = computed(() => {
  if (!currentUser.value) return []

  let source = lists.value

  if (activeTab.value === 'my') {
    source = myLists.value
  } else if (activeTab.value === 'family') {
    source = familyLists.value
  }

  if (selectedCategory.value !== 'all') {
    source = source.filter(l => l.category === selectedCategory.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    source = source.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.ownerName.toLowerCase().includes(q) ||
      l.items.some(i => i.title.toLowerCase().includes(q))
    )
  }

  return source
})

const totalGiftsCount = computed(() => {
  return lists.value.reduce((acc, l) => acc + l.items.length, 0)
})

const totalReservedCount = computed(() => {
  return lists.value.reduce((acc, l) => acc + l.items.filter(i => i.isPurchased).length, 0)
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-8">
    <!-- Hero Festive Banner -->
    <div class="relative rounded-3xl sm:rounded-4xl bg-gradient-to-br from-rose-600 via-brand-600 to-pine-900 text-white p-6 sm:p-10 shadow-glow overflow-hidden">
      <!-- Glow ambient shapes -->
      <div class="absolute -top-12 -right-12 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute -bottom-12 -left-12 w-64 h-64 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />

      <div class="relative z-10 max-w-2xl space-y-4">
        <!-- Floating Pill -->
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-amber-200">
          <Sparkles class="w-4 h-4 text-amber-300 animate-spin" style="animation-duration: 8s" />
          <span>Partage de listes de cadeaux pour Noël & fêtes de famille</span>
        </div>

        <h1 class="text-3xl sm:text-5xl font-black font-display tracking-tight leading-[1.15]">
          Les souhaits de Noël de toute la famille au même endroit ! 🎄
        </h1>

        <p class="text-sm sm:text-base text-rose-100/90 leading-relaxed font-medium">
          Retrouvez les envies de cadeaux de chacun (Papa, Maman, enfants, proches). Consultez les souhaits, réservez
          secrètement pour les autres et préservez la surprise de Noël pour tous ! 🎁
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button
            @click="openCreateListModal?.()"
            class="flex items-center gap-2 py-3 px-5 sm:py-3.5 sm:px-6 rounded-2xl bg-white text-rose-600 hover:bg-rose-50 font-bold text-xs sm:text-sm shadow-xl transition-all active:scale-95"
          >
            <Plus class="w-4 h-4 stroke-[3]" />
            <span>Créer une liste de souhaits</span>
          </button>

          <NuxtLink
            to="/join"
            class="flex items-center gap-2 py-3 px-5 sm:py-3.5 sm:px-6 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white border border-white/30 font-bold text-xs sm:text-sm transition-all active:scale-95"
          >
            <QrCode class="w-4 h-4 text-amber-200" />
            <span>Rejoindre avec un code / QR</span>
          </NuxtLink>

          <button
            v-if="!currentUser"
            @click="openAuthModal?.()"
            class="flex items-center gap-2 py-3 px-4 rounded-2xl bg-black/20 hover:bg-black/30 backdrop-blur-md text-rose-100 border border-white/20 font-bold text-xs sm:text-sm transition-all"
          >
            <span>Se connecter</span>
          </button>
        </div>

        <!-- Quick Trust Badges -->
        <div class="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 border-t border-white/15 text-xs text-rose-100/80 font-medium">
          <div class="flex items-center gap-1.5">
            <Lock class="w-3.5 h-3.5 text-amber-300" />
            <span>Listes 100% privées & réservations secrètes</span>
          </div>
          <div class="flex items-center gap-1.5">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-300" />
            <span>Connexion Google & PWA hors-ligne</span>
          </div>
          <div v-if="currentUser" class="flex items-center gap-1.5">
            <Gift class="w-3.5 h-3.5 text-rose-300" />
            <span>{{ totalReservedCount }} cadeaux réservés</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Logged out View: Access Gate Cards -->
    <div v-if="!currentUser" class="space-y-6">
      <div class="p-8 sm:p-10 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
        <div class="max-w-2xl space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
            <Lock class="w-3.5 h-3.5" />
            <span>Espace Privé & Sécurisé</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white">
            Vos listes de famille sont protégées
          </h2>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Pour préserver l'intimité et la surprise de Noël, chaque famille ne voit que ses propres listes et celles qu'elle a rejointes via un lien d'invitation ou QR code.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Card 1: Create List without login -->
          <div
            @click="openCreateListModal?.()"
            class="group p-6 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-rose-200/60 dark:border-slate-700/80 hover:border-rose-400 dark:hover:border-rose-500 cursor-pointer transition-all shadow-sm hover:shadow-md space-y-3"
          >
            <div class="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-xl shadow-glow group-hover:scale-105 transition-transform">
              ✨
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-base">
              Créer une liste
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Commencez immédiatement sans mot de passe : indiquez votre prénom et préparez vos souhaits de Noël.
            </p>
            <div class="pt-2 flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition-transform">
              <span>Créer ma première liste</span>
              <ArrowRight class="w-4 h-4" />
            </div>
          </div>

          <!-- Card 2: Join List via code / link -->
          <NuxtLink
            to="/join"
            class="group p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-amber-200/60 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer transition-all shadow-sm hover:shadow-md space-y-3 block"
          >
            <div class="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-glow group-hover:scale-105 transition-transform">
              💌
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-base">
              Rejoindre une liste
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Un proche vous a envoyé un code ou un QR Code ? Saisissez-le pour consulter ses idées cadeaux.
            </p>
            <div class="pt-2 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Entrer le code ou scanner</span>
              <ArrowRight class="w-4 h-4" />
            </div>
          </NuxtLink>

          <!-- Card 3: Connect -->
          <div
            @click="openAuthModal?.()"
            class="group p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700/80 hover:border-sky-400 dark:hover:border-sky-500 cursor-pointer transition-all shadow-sm hover:shadow-md space-y-3"
          >
            <div class="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xl shadow-glow group-hover:scale-105 transition-transform">
              🔐
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-base">
              Se connecter
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connectez-vous avec Google ou votre profil pour retrouver toutes vos listes créées et rejointes.
            </p>
            <div class="pt-2 flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:translate-x-1 transition-transform">
              <span>Connexion en 1 clic</span>
              <ArrowRight class="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Logged in View: Lists Dashboard -->
    <div v-else class="space-y-6">
      <!-- Filter Bar & Search -->
      <div class="space-y-4">
        <!-- Top Filters: Tabs (Toutes / Mes listes / Famille) + Search -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <!-- Tabs Switcher -->
          <div class="flex p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm shrink-0">
            <button
              @click="activeTab = 'all'"
              class="py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              :class="activeTab === 'all'
                ? 'bg-rose-500 text-white shadow-glow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            >
              <span>Toutes mes listes</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeTab === 'all' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'">
                {{ lists.length }}
              </span>
            </button>

            <button
              @click="activeTab = 'my'"
              class="py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              :class="activeTab === 'my'
                ? 'bg-rose-500 text-white shadow-glow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            >
              <span>Mes Listes</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeTab === 'my' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'">
                {{ myLists.length }}
              </span>
            </button>

            <button
              @click="activeTab = 'family'"
              class="py-2 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              :class="activeTab === 'family'
                ? 'bg-rose-500 text-white shadow-glow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            >
              <span>Famille & Amis</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeTab === 'family' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'">
                {{ familyLists.length }}
              </span>
            </button>
          </div>

          <!-- Search input box -->
          <div class="relative flex-1 max-w-md">
            <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher une liste, un membre, un cadeau..."
              class="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <!-- Categories Pills Horizontal scroll -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            v-for="cat in categories"
            :key="cat.key"
            @click="selectedCategory = cat.key"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0"
            :class="selectedCategory === cat.key
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'"
          >
            <span>{{ cat.emoji }}</span>
            <span>{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Wishlists Grid -->
      <div v-if="displayedLists.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ListCard
          v-for="list in displayedLists"
          :key="list.id"
          :list="list"
          @share="openShareModal?.(list)"
        />
      </div>

      <!-- Empty State for logged in user -->
      <div
        v-else
        class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-10 sm:p-16 text-center max-w-lg mx-auto space-y-4"
      >
        <div class="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center text-3xl mx-auto shadow-inner">
          🎁
        </div>
        <div>
          <h3 class="text-lg font-bold font-display text-slate-900 dark:text-white">
            {{ searchQuery ? 'Aucune liste correspondante' : 'Aucune liste pour le moment' }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {{ searchQuery ? `Aucun résultat pour "${searchQuery}". Essayez un autre terme.` : 'Créez votre première liste de souhaits de Noël ou rejoignez la liste partagée par un proche !' }}
          </p>
        </div>

        <div class="flex items-center justify-center gap-3 pt-2">
          <button
            @click="openCreateListModal?.()"
            class="py-2.5 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-glow transition-all"
          >
            + Créer une liste
          </button>

          <NuxtLink
            to="/join"
            class="py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            Rejoindre avec un code
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- App Highlights / Features Info Section -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
      <!-- Feature 1 -->
      <div class="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 space-y-2">
        <div class="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <Lock class="w-5 h-5" />
        </div>
        <h4 class="font-bold text-slate-900 dark:text-white text-sm">Cochage Anonyme Anti-Spoiler</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Quand vous cochez un cadeau pour un proche, votre réservation reste secrète pour le destinataire afin de préserver la magie de Noël.
        </p>
      </div>

      <!-- Feature 2 -->
      <div class="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 space-y-2">
        <div class="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Sparkles class="w-5 h-5" />
        </div>
        <h4 class="font-bold text-slate-900 dark:text-white text-sm">Extraction Automatique de Liens</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Collez le lien de n'importe quel site (Amazon, Fnac, Zara, Lego...) et l'app extrait directement la photo, le titre et le prix.
        </p>
      </div>

      <!-- Feature 3 -->
      <div class="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 space-y-2">
        <div class="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <QrCode class="w-5 h-5" />
        </div>
        <h4 class="font-bold text-slate-900 dark:text-white text-sm">Partage Instantané en Famille</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Générez un QR Code pour la table du réveillon ou partagez votre lien sur le groupe WhatsApp de la famille en 1 clic.
        </p>
      </div>
    </div>
  </div>
</template>
