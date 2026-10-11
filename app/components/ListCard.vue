<script setup lang="ts">
import { computed } from 'vue'
import { QrCode, Calendar, ArrowRight, Gift, Lock, Users, Sparkles } from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'
import type { Wishlist } from '~/types'

const props = defineProps<{
  list: Wishlist
}>()

const emit = defineEmits<{
  (e: 'share', list: Wishlist): void
}>()

const { currentUser } = useAuth()

const isOwner = computed(() => {
  return props.list.ownerId === currentUser.value?.id
})

const isChristmas = computed(() => {
  return props.list.category === 'christmas' ||
    props.list.title.toLowerCase().includes('noël') ||
    props.list.title.toLowerCase().includes('noel') ||
    props.list.title.toLowerCase().includes('christmas')
})

// Distinct family members in this list
const distinctRecipients = computed(() => {
  const set = new Set<string>()
  if (props.list.ownerName) set.add(props.list.ownerName)
  props.list.items.forEach(i => {
    if (i.recipientName && i.recipientName.trim()) {
      set.add(i.recipientName.trim())
    }
  })
  return Array.from(set)
})

const purchasedCount = computed(() => {
  return props.list.items.filter(i => i.isPurchased).length
})

const daysLeft = computed(() => {
  if (!props.list.eventDate) return null
  const target = new Date(props.list.eventDate)
  const now = new Date()
  const diffTime = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

const gradientClass = computed(() => {
  return props.list.coverGradient || 'from-rose-500 via-brand-600 to-pine-700'
})
</script>

<template>
  <div
    class="group relative rounded-3xl bg-white dark:bg-slate-900 border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between hover:-translate-y-1"
    :class="isChristmas
      ? 'border-amber-200/70 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-500/60'
      : 'border-slate-100 dark:border-slate-800'"
  >
    <!-- Top banner with gradient & emoji -->
    <div
      class="h-28 sm:h-32 p-4 relative flex items-start justify-between overflow-hidden"
      :class="isChristmas
        ? 'bg-christmas-pattern'
        : `bg-gradient-to-r ${gradientClass}`"
    >
      <!-- Background subtle shapes -->
      <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
      <div class="absolute -left-6 -top-6 w-24 h-24 bg-white/15 rounded-full blur-lg pointer-events-none" />
      <div v-if="isChristmas" class="absolute inset-0 bg-christmas-gold-stars pointer-events-none opacity-40" />

      <!-- Left Badge & Emoji -->
      <div class="flex items-center gap-2.5 relative z-10">
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border text-white transition-transform group-hover:scale-105"
          :class="isChristmas ? 'bg-amber-400/20 backdrop-blur-md border-amber-300/40' : 'bg-white/20 backdrop-blur-md border-white/30'"
        >
          {{ list.coverEmoji || (isChristmas ? '🎄' : '🎁') }}
        </div>
        <div class="space-y-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span
              v-if="isChristmas"
              class="px-2 py-0.5 rounded-full gold-badge text-[9px] font-black uppercase tracking-wider"
            >
              Noël ✨
            </span>
            <span
              v-if="isOwner"
              class="px-2.5 py-0.5 rounded-full bg-white/90 text-rose-800 text-[10px] font-bold uppercase tracking-wider shadow-sm"
            >
              Ma liste
            </span>
            <span
              v-else
              class="px-2.5 py-0.5 rounded-full bg-black/30 backdrop-blur-md text-white text-[10px] font-semibold"
            >
              Liste de {{ list.ownerName }}
            </span>
          </div>
        </div>
      </div>

      <!-- Quick QR Share button -->
      <button
        @click.stop="emit('share', list)"
        class="relative z-10 p-2.5 rounded-2xl bg-white/20 hover:bg-white/35 backdrop-blur-md text-white border border-white/30 transition-all shadow-sm active:scale-95"
        title="Partager le QR Code"
      >
        <QrCode class="w-4 h-4" />
      </button>

      <!-- Bottom overlay on banner with countdown -->
      <div
        v-if="daysLeft !== null"
        class="absolute bottom-2.5 right-3 text-white/90 text-xs font-semibold flex items-center gap-1 backdrop-blur-sm px-2 py-0.5 rounded-lg border"
        :class="isChristmas ? 'bg-black/40 border-amber-400/30 text-amber-200' : 'bg-black/20 border-white/10 text-white/90'"
      >
        <Calendar class="w-3.5 h-3.5 text-amber-300" />
        <span v-if="daysLeft > 0">J-{{ daysLeft }} {{ isChristmas ? 'avant Noël' : '' }}</span>
        <span v-else-if="daysLeft === 0">Joyeux Noël ! 🎄</span>
        <span v-else>Passé</span>
      </div>
    </div>

    <!-- Body -->
    <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <img
            v-if="list.ownerAvatar"
            :src="list.ownerAvatar"
            :alt="list.ownerName"
            class="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200"
          />
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {{ isOwner ? 'Créé par vous' : `Créé par ${list.ownerName}` }}
          </span>
        </div>

        <NuxtLink :to="`/lists/${list.id}`" class="block group-hover:text-rose-600 transition-colors">
          <h3 class="text-lg font-bold font-display text-slate-900 dark:text-white leading-snug line-clamp-2">
            {{ list.title }}
          </h3>
        </NuxtLink>

        <p v-if="list.description" class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {{ list.description }}
        </p>
        <!-- Family members involved pills -->
        <div v-if="distinctRecipients.length > 0" class="mt-2 flex flex-wrap gap-1">
          <span
            v-for="rec in distinctRecipients"
            :key="rec"
            class="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-100 dark:border-indigo-900/40"
          >
            🎁 {{ rec }}
          </span>
        </div>
      </div>

      <!-- Stats Bar & Progress -->
      <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div class="flex items-center justify-between text-xs font-semibold">
          <span class="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Gift class="w-3.5 h-3.5 text-rose-500" />
            <span>{{ list.items.length }} {{ list.items.length > 1 ? 'cadeaux' : 'cadeau' }}</span>
          </span>

          <span v-if="!isOwner" class="text-emerald-600 dark:text-emerald-400 text-[11px]">
            {{ purchasedCount }} / {{ list.items.length }} réservés
          </span>
          <span v-else class="text-slate-400 text-[11px] flex items-center gap-1">
            <Lock class="w-3 h-3 text-rose-400" />
            <span>Secret protégé</span>
          </span>
        </div>

        <!-- Progress bar for non-owner -->
        <div v-if="!isOwner && list.items.length > 0" class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            class="bg-gradient-to-r from-rose-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            :style="{ width: `${Math.round((purchasedCount / list.items.length) * 100)}%` }"
          />
        </div>
      </div>

      <!-- Bottom action button -->
      <NuxtLink
        :to="`/lists/${list.id}`"
        class="w-full py-2.5 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 group/btn shadow-sm"
        :class="isChristmas
          ? 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/40 hover:bg-gradient-to-r hover:from-red-600 hover:to-amber-600 hover:text-white hover:border-transparent'
          : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 text-slate-700 dark:text-slate-200'"
      >
        <span>{{ isOwner ? (isChristmas ? 'Gérer les cadeaux de Noël 🎄' : 'Gérer mes cadeaux') : (isChristmas ? 'Voir les souhaits de Noël 🎁' : 'Découvrir et réserver') }}</span>
        <ArrowRight class="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
      </NuxtLink>
    </div>
  </div>
</template>
