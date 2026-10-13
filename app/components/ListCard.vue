<script setup lang="ts">
import { computed } from 'vue'
import { QrCode, Calendar, ArrowRight, Gift, Lock, Users } from 'lucide-vue-next'
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

const distinctRecipients = computed(() => {
  const set = new Set<string>()
  if (props.list.ownerName) set.add(String(props.list.ownerName).trim())
  props.list.items.forEach(i => {
    if (typeof i.recipientName === 'string' && i.recipientName.trim()) {
      set.add(i.recipientName.trim())
    }
  })
  return Array.from(set).filter(Boolean)
})

const purchasedCount = computed(() => {
  return props.list.items.filter(i => i.isPurchased).length
})

const daysLeft = computed(() => {
  if (!props.list.eventDate) return null
  const target = new Date(props.list.eventDate)
  const now = new Date()
  const diffTime = target.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

const gradientClass = computed(() => {
  return props.list.coverGradient || 'from-rose-600 to-rose-800'
})
</script>

<template>
  <div
    class="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col justify-between"
  >
    <!-- Top banner with gradient or Christmas texture -->
    <div
      class="h-28 sm:h-32 p-4 relative flex items-start justify-between overflow-hidden"
      :class="isChristmas ? 'bg-christmas-pattern' : `bg-gradient-to-r ${gradientClass}`"
    >
      <div v-if="isChristmas" class="absolute inset-0 bg-christmas-gold-stars pointer-events-none opacity-30" />

      <!-- Left Badge & Emoji -->
      <div class="flex items-center gap-2.5 relative z-10">
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/25 text-white transition-transform group-hover:scale-105"
        >
          {{ list.coverEmoji || (isChristmas ? '🎄' : '🎁') }}
        </div>
        <div class="space-y-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span
              v-if="isChristmas"
              class="px-2 py-0.5 rounded-full gold-badge text-[10px] font-bold uppercase tracking-wider"
            >
              Noël ✨
            </span>
            <span
              v-if="isOwner"
              class="px-2.5 py-0.5 rounded-full bg-white text-slate-900 text-[10px] font-bold uppercase tracking-wider shadow-sm"
            >
              Ma liste
            </span>
            <span
              v-else
              class="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-medium"
            >
              {{ list.ownerName }}
            </span>
          </div>
        </div>
      </div>

      <!-- Quick QR Share button -->
      <button
        @click.stop="emit('share', list)"
        type="button"
        class="relative z-10 p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/25 transition-colors shadow-sm"
        title="Partager le QR Code"
        aria-label="Partager la liste"
      >
        <QrCode class="w-4 h-4" />
      </button>

      <!-- Countdown pill -->
      <div
        v-if="daysLeft !== null"
        class="absolute bottom-2.5 right-3 text-white text-xs font-semibold flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/10"
      >
        <Calendar class="w-3.5 h-3.5 text-amber-300" />
        <span v-if="daysLeft > 0">J-{{ daysLeft }}</span>
        <span v-else-if="daysLeft === 0">Aujourd'hui !</span>
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
            class="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {{ isOwner ? 'Créé par vous' : `Créé par ${list.ownerName}` }}
          </span>
        </div>

        <NuxtLink :to="`/lists/${list.id}`" class="block group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
          <h3 class="text-lg font-bold font-display text-slate-900 dark:text-white leading-snug line-clamp-2">
            {{ list.title }}
          </h3>
        </NuxtLink>

        <p v-if="list.description" class="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {{ list.description }}
        </p>

        <!-- Family members involved pills -->
        <div v-if="distinctRecipients.length > 0" class="mt-2.5 flex flex-wrap gap-1">
          <span
            v-for="rec in distinctRecipients"
            :key="rec"
            class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
          >
            🎁 {{ rec }}
          </span>
        </div>
      </div>

      <!-- Stats Bar & Progress -->
      <div class="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div class="flex items-center justify-between text-xs font-medium">
          <span class="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Gift class="w-3.5 h-3.5 text-rose-500" />
            <span>{{ list.items.length }} {{ list.items.length > 1 ? 'cadeaux' : 'cadeau' }}</span>
          </span>

          <span v-if="!isOwner" class="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            {{ purchasedCount }} / {{ list.items.length }} réservés
          </span>
          <span v-else class="text-slate-400 text-xs flex items-center gap-1">
            <Lock class="w-3 h-3 text-rose-500" />
            <span>Secret préservé</span>
          </span>
        </div>

        <!-- Progress bar for non-owner -->
        <div v-if="!isOwner && list.items.length > 0" class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            class="bg-emerald-500 h-full rounded-full transition-all duration-300"
            :style="{ width: `${Math.round((purchasedCount / list.items.length) * 100)}%` }"
          />
        </div>
      </div>

      <!-- Bottom action button -->
      <NuxtLink
        :to="`/lists/${list.id}`"
        class="w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 group/btn"
      >
        <span>{{ isOwner ? 'Gérer les souhaits' : 'Consulter et réserver' }}</span>
        <ArrowRight class="w-3.5 h-3.5 text-slate-400 group-hover/btn:translate-x-0.5 transition-transform" />
      </NuxtLink>
    </div>
  </div>
</template>
