<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import {
  Sparkles,
  Plus,
  QrCode,
  Search,
  Gift,
  Lock,
  ShieldCheck,
  ArrowRight
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import type { Wishlist, WishlistCategory } from '~/types'

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

const activeTab = ref<'all' | 'my' | 'family'>('all')

const categories: { key: WishlistCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'Toutes les occasions', emoji: '🌟' },
  { key: 'christmas', label: 'Noël', emoji: '🎄' },
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

const totalReservedCount = computed(() => {
  return lists.value.reduce((acc, l) => acc + l.items.filter(i => i.isPurchased).length, 0)
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-8">
    <!-- Hero Banner -->
    <section aria-labelledby="hero-title" class="relative rounded-3xl bg-gradient-to-br from-xmas-800 via-rose-700 to-rose-900 text-white p-6 sm:p-10 shadow-card overflow-hidden">
      <div class="relative z-10 max-w-2xl space-y-4">
        <!-- Floating Pill -->
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-rose-100">
          <Sparkles class="w-3.5 h-3.5 text-amber-300" />
          <span>Partage de listes de cadeaux pour Noël & la famille</span>
        </div>

        <h1 id="hero-title" class="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight leading-[1.15]">
          Les souhaits de toute la famille réunis au même endroit.
        </h1>

        <p class="text-xs sm:text-sm text-rose-100/90 leading-relaxed font-normal">
          Partagez vos envies, découvrez celles de vos proches et réservez des cadeaux en secret pour préserver la magie et la surprise lors du déballage !
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button
            @click="openCreateListModal?.()"
            type="button"
            class="flex items-center gap-2 py-2.5 px-4 sm:py-3 sm:px-5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs sm:text-sm shadow-sm transition-colors active:scale-98"
          >
            <Plus class="w-4 h-4" />
            <span>Créer une liste</span>
          </button>

          <NuxtLink
            to="/join"
            class="flex items-center gap-2 py-2.5 px-4 sm:py-3 sm:px-5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white border border-white/25 font-semibold text-xs sm:text-sm transition-colors active:scale-98"
          >
            <QrCode class="w-4 h-4 text-amber-200" />
            <span>Rejoindre avec un code</span>
          </NuxtLink>

          <button
            v-if="!currentUser"
            @click="openAuthModal?.()"
            type="button"
            class="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-black/20 hover:bg-black/30 backdrop-blur-md text-white border border-white/20 font-semibold text-xs sm:text-sm transition-colors"
          >
            <span>Se connecter</span>
          </button>
        </div>

        <!-- Reassurance Badges -->
        <div class="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 border-t border-white/15 text-xs text-rose-100/80">
          <div class="flex items-center gap-1.5">
            <Lock class="w-3.5 h-3.5 text-amber-300" />
            <span>Réservations 100% secrètes</span>
          </div>
          <div class="flex items-center gap-1.5">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-300" />
            <span>Sans mot de passe requis</span>
          </div>
          <div v-if="currentUser" class="flex items-center gap-1.5">
            <Gift class="w-3.5 h-3.5 text-rose-200" />
            <span>{{ totalReservedCount }} cadeaux réservés</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Logged out View: Access Gate Cards -->
    <section v-if="!currentUser" aria-labelledby="public-access-title" class="space-y-6">
      <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-6">
        <div class="max-w-xl space-y-1.5">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
            <Lock class="w-3 h-3 text-rose-500" />
            <span>Espace Privé</span>
          </div>
          <h2 id="public-access-title" class="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white">
            Vos listes de famille sont protégées
          </h2>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Pour préserver l'intimité et la surprise, chaque famille accède à ses propres listes ou aux listes partagées par QR code et lien privé.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Card 1: Create List without login -->
          <div
            @click="openCreateListModal?.()"
            class="group p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-rose-400 dark:hover:border-rose-500 cursor-pointer transition-colors shadow-subtle space-y-2.5"
          >
            <div class="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg">
              ✨
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-sm">
              Créer une liste
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Commencez tout de suite : indiquez votre prénom et préparez vos souhaits sans mot de passe.
            </p>
            <div class="pt-1 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform">
              <span>Créer une liste</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </div>
          </div>

          <!-- Card 2: Join List via code / link -->
          <NuxtLink
            to="/join"
            class="group p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer transition-colors shadow-subtle space-y-2.5 block"
          >
            <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center text-lg">
              💌
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-sm">
              Rejoindre une liste
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Un proche vous a partagé un code ou un QR code ? Entrez-le pour consulter ses idées.
            </p>
            <div class="pt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
              <span>Entrer un code</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </div>
          </NuxtLink>

          <!-- Card 3: Connect -->
          <div
            @click="openAuthModal?.()"
            class="group p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-colors shadow-subtle space-y-2.5"
          >
            <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
              🔐
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-sm">
              Se connecter
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connectez-vous avec Google pour retrouver instantanément toutes vos listes.
            </p>
            <div class="pt-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
              <span>Connexion en 1 clic</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Logged in View: Lists Dashboard -->
    <section v-else aria-labelledby="dashboard-title" class="space-y-6">
      <h2 id="dashboard-title" class="sr-only">Tableau de bord des listes</h2>

      <!-- Filter Bar & Search -->
      <div class="space-y-3">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <!-- Tabs Switcher -->
          <div class="flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-subtle shrink-0">
            <button
              @click="activeTab = 'all'"
              type="button"
              class="py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              :class="activeTab === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            >
              <span>Toutes les listes</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeTab === 'all' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'">
                {{ lists.length }}
              </span>
            </button>

            <button
              @click="activeTab = 'my'"
              type="button"
              class="py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              :class="activeTab === 'my'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            >
              <span>Mes Listes</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeTab === 'my' ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'">
                {{ myLists.length }}
              </span>
            </button>

            <button
              @click="activeTab = 'family'"
              type="button"
              class="py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              :class="activeTab === 'family'
                ? 'bg-rose-600 text-white shadow-sm'
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
              type="search"
              placeholder="Rechercher une liste, un membre, un cadeau..."
              class="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 shadow-subtle focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <!-- Categories Horizontal scroll -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            v-for="cat in categories"
            :key="cat.key"
            type="button"
            @click="selectedCategory = cat.key"
            class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border shrink-0"
            :class="selectedCategory === cat.key
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'"
          >
            <span>{{ cat.emoji }}</span>
            <span>{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Wishlists Grid -->
      <div v-if="displayedLists.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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
        class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center max-w-md mx-auto space-y-3"
      >
        <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto">
          🎁
        </div>
        <div>
          <h3 class="text-base font-bold font-display text-slate-900 dark:text-white">
            {{ searchQuery ? 'Aucune liste correspondante' : 'Aucune liste pour le moment' }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {{ searchQuery ? `Aucun résultat pour "${searchQuery}".` : 'Créez votre première liste de souhaits ou rejoignez celle d\'un proche !' }}
          </p>
        </div>

        <div class="flex items-center justify-center gap-2.5 pt-2">
          <button
            @click="openCreateListModal?.()"
            type="button"
            class="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            + Créer une liste
          </button>

          <NuxtLink
            to="/join"
            class="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors hover:bg-slate-50"
          >
            Rejoindre avec un code
          </NuxtLink>
        </div>
      </div>
    </section>

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
