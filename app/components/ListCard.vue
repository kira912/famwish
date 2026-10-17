<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  QrCode,
  Calendar,
  ArrowUpRight,
  Gift,
  Lock,
  Users,
  Copy,
  Check,
  Crown,
  UserCheck,
  Heart
} from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import type { Wishlist } from '~/types'

const props = defineProps<{
  list: Wishlist
}>()

const emit = defineEmits<{
  (e: 'share', list: Wishlist): void
}>()

const { currentUser } = useAuth()
const toast = useToast()
const isCodeCopied = ref(false)

const isOwner = computed(() => {
  return props.list.ownerId === currentUser.value?.id
})

const isChristmas = computed(() => {
  return props.list.category === 'christmas' ||
    props.list.title.toLowerCase().includes('noël') ||
    props.list.title.toLowerCase().includes('noel') ||
    props.list.title.toLowerCase().includes('christmas')
})

const categoryMeta = computed(() => {
  const map: Record<string, { label: string; emoji: string }> = {
    christmas: { label: 'Noël', emoji: '🎄' },
    birthday: { label: 'Anniversaire', emoji: '🎂' },
    birth: { label: 'Naissance', emoji: '🍼' },
    wedding: { label: 'Mariage', emoji: '💍' },
    housewarming: { label: 'Crémaillère', emoji: '🏡' },
    other: { label: 'Événement', emoji: '✨' }
  }
  return map[props.list.category] || map.other
})

export interface ParticipantChip {
  key: string
  name: string
  avatar: string
  isChild: boolean
  isOwner: boolean
}

const participants = computed<ParticipantChip[]>(() => {
  const map = new Map<string, ParticipantChip>()

  const addPerson = (rawName?: unknown, avatar?: string, isChild = false, ownerFlag = false) => {
    if (typeof rawName !== 'string') return
    const clean = rawName.trim()
    if (!clean || clean.startsWith('user-') || clean.startsWith('google-') || clean.startsWith('child-')) return
    const key = clean.toLowerCase()
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: clean,
        avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(clean)}`,
        isChild,
        isOwner: ownerFlag
      })
    } else {
      const existing = map.get(key)!
      if (avatar && existing.avatar.includes('dicebear')) existing.avatar = avatar
      if (isChild) existing.isChild = true
      if (ownerFlag) existing.isOwner = true
    }
  }

  addPerson(props.list.ownerName, props.list.ownerAvatar, false, true)

  if (Array.isArray(props.list.members)) {
    props.list.members.forEach((m: any) => {
      if (typeof m === 'object' && m !== null && m.name) {
        addPerson(m.name, m.avatar, Boolean(m.isChild || m.role === 'child'), m.role === 'owner')
      } else if (typeof m === 'string') {
        addPerson(m)
      }
    })
  }

  props.list.items.forEach(i => {
    addPerson(i.recipientName, i.recipientAvatar)
  })

  return Array.from(map.values())
})

const purchasedCount = computed(() => {
  return props.list.items.filter(i => i.isPurchased).length
})

const myReservedCount = computed(() => {
  if (!currentUser.value?.id) return 0
  return props.list.items.filter(i => i.isPurchased && i.purchasedBy?.userId === currentUser.value?.id).length
})

const myWishesCount = computed(() => {
  if (!currentUser.value?.name) return 0
  const myName = currentUser.value.name.trim().toLowerCase()
  return props.list.items.filter(i => {
    const rec = (i.recipientName || props.list.ownerName || '').trim().toLowerCase()
    return rec === myName
  }).length
})

const favoritesCount = computed(() => {
  return props.list.items.filter(i => i.isFavorite).length
})

const previewItems = computed(() => {
  return props.list.items.slice(0, 3)
})

const daysLeft = computed(() => {
  if (!props.list.eventDate) return null
  const target = new Date(props.list.eventDate)
  const now = new Date()
  const diffTime = target.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

const formattedEventDate = computed(() => {
  if (!props.list.eventDate) return null
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short'
    }).format(new Date(props.list.eventDate))
  } catch {
    return null
  }
})

const gradientClass = computed(() => {
  return props.list.coverGradient || 'from-rose-600 to-rose-800'
})

async function copyCode() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(props.list.inviteCode)
  isCodeCopied.value = true
  toast.success('Code copié !', `Code ${props.list.inviteCode} prêt à être partagé`)
  setTimeout(() => {
    isCodeCopied.value = false
  }, 2000)
}
</script>

<template>
  <article
    class="group relative rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-200 flex flex-col justify-between overflow-hidden"
    :class="[
      isOwner
        ? 'border-slate-200/90 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700/80 shadow-card hover:shadow-card-hover'
        : 'border-indigo-200/70 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700/80 shadow-card hover:shadow-card-hover'
    ]"
  >
    <!-- Top Folder / Event Accent Ribbon -->
    <div
      class="h-2.5 w-full transition-all duration-300"
      :class="isChristmas ? 'bg-gradient-to-r from-xmas-800 via-amber-400 to-xmas-700' : `bg-gradient-to-r ${gradientClass}`"
    />

    <!-- Main Folder Content -->
    <div class="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
      <!-- Top Row: Emblem + Role/Category Badges + Quick Actions -->
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <NuxtLink
            :to="`/lists/${list.id}`"
            class="flex items-start gap-3.5 group/title min-w-0 flex-1"
          >
            <!-- Tactile Folder Emblem -->
            <div
              class="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl sm:text-3xl shadow-sm border transition-transform duration-200 group-hover:scale-105 relative"
              :class="isChristmas
                ? 'bg-christmas-pattern border-amber-300/60 text-white'
                : `bg-gradient-to-br ${gradientClass} border-white/20 text-white`"
            >
              <span>{{ list.coverEmoji || (isChristmas ? '🎄' : '🎁') }}</span>
              <!-- Role Corner Indicator -->
              <span
                class="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] shadow-sm border-2 border-white dark:border-slate-900"
                :class="isOwner
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-indigo-600 text-white'"
                :title="isOwner ? 'Vous êtes le créateur de cette liste' : `Vous êtes membre de la liste de ${list.ownerName}`"
              >
                <Crown v-if="isOwner" class="w-3 h-3 stroke-[2.5]" />
                <UserCheck v-else class="w-3 h-3 stroke-[2.5]" />
              </span>
            </div>

            <!-- Title & Role Context -->
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <!-- Membership Role Pill -->
                <span
                  v-if="isOwner"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60"
                >
                  <span>Créée par moi</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60"
                >
                  <span>Tribu de {{ list.ownerName }}</span>
                </span>

                <!-- Category Chip -->
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  <span>{{ categoryMeta.emoji }}</span>
                  <span>{{ categoryMeta.label }}</span>
                </span>

                <!-- Countdown Pill -->
                <span
                  v-if="daysLeft !== null"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                  :class="daysLeft <= 14 && daysLeft >= 0
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'"
                >
                  <Calendar class="w-2.5 h-2.5 text-rose-500" />
                  <span v-if="daysLeft > 0">J-{{ daysLeft }}</span>
                  <span v-else-if="daysLeft === 0">Aujourd'hui !</span>
                  <span v-else>{{ formattedEventDate || 'Passé' }}</span>
                </span>
              </div>

              <h3 class="text-base sm:text-lg font-extrabold font-display text-slate-900 dark:text-white group-hover/title:text-rose-600 dark:group-hover/title:text-rose-400 transition-colors leading-snug line-clamp-1">
                {{ list.title }}
              </h3>

              <p v-if="list.description" class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {{ list.description }}
              </p>
            </div>
          </NuxtLink>

          <!-- QR Share Quick Button -->
          <button
            @click.stop="emit('share', list)"
            type="button"
            class="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0"
            title="Partager le QR Code ou inviter"
            aria-label="Partager la liste"
          >
            <QrCode class="w-4 h-4" />
          </button>
        </div>

        <!-- Family Circle / Avatar Stack & Member Chips -->
        <div class="space-y-2 pt-0.5">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <!-- Overlapping Avatars -->
              <div class="flex items-center -space-x-2 shrink-0">
                <div
                  v-for="person in participants.slice(0, 5)"
                  :key="person.key"
                  class="relative inline-block"
                  :title="person.isChild ? `${person.name} (Enfant)` : person.name"
                >
                  <img
                    :src="person.avatar"
                    :alt="person.name"
                    class="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800"
                  />
                  <span
                    v-if="person.isChild"
                    class="absolute -bottom-0.5 -right-0.5 text-[8px] leading-none bg-sky-100 dark:bg-sky-900 rounded-full px-0.5"
                  >
                    👶
                  </span>
                </div>
                <div
                  v-if="participants.length > 5"
                  class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300"
                >
                  +{{ participants.length - 5 }}
                </div>
              </div>

              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Users class="w-3.5 h-3.5 text-rose-500" />
                <span>{{ participants.length }} {{ participants.length > 1 ? 'membres' : 'membre' }}</span>
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-1 justify-end">
              <span
                v-for="person in participants.slice(0, 4)"
                :key="person.key"
                class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold inline-flex items-center gap-1"
              >
                <span v-if="person.isChild" class="text-[9px]">👶</span>
                <span v-else-if="person.isOwner" class="text-[9px]">👑</span>
                <span>{{ person.name }}</span>
              </span>
              <span
                v-if="participants.length > 4"
                class="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold"
              >
                +{{ participants.length - 4 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Inside Folder Mini-Preview (Gifts & Activity) -->
        <div class="rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/80 p-3 space-y-2.5">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
              <Gift class="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{{ list.items.length }} {{ list.items.length > 1 ? 'cadeaux' : 'cadeau' }}</span>
              <span
                v-if="favoritesCount > 0"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-rose-100/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold"
                title="Coups de cœur"
              >
                <Heart class="w-2.5 h-2.5 fill-current" />
                {{ favoritesCount }}
              </span>
            </div>

            <!-- Personal Participation Counter -->
            <span
              v-if="myWishesCount > 0"
              class="text-[11px] font-semibold text-rose-600 dark:text-rose-400"
            >
              Dont {{ myWishesCount }} pour vous
            </span>
            <span
              v-else-if="myReservedCount > 0"
              class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
            >
              {{ myReservedCount }} réservé{{ myReservedCount > 1 ? 's' : '' }} par vous 🎁
            </span>
          </div>

          <!-- Mini Gift Pills Preview (Distinct from GiftCard product view) -->
          <div v-if="previewItems.length > 0" class="flex flex-wrap items-center gap-1.5">
            <span
              v-for="item in previewItems"
              :key="item.id"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-700 dark:text-slate-300 max-w-[180px]"
            >
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.title"
                class="w-3.5 h-3.5 rounded object-cover shrink-0"
              />
              <span v-else class="text-[10px] shrink-0">🎁</span>
              <span class="truncate font-medium">{{ item.title }}</span>
            </span>
            <span
              v-if="list.items.length > 3"
              class="px-2 py-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400"
            >
              +{{ list.items.length - 3 }} autres
            </span>
          </div>
          <p v-else class="text-[11px] text-slate-400 dark:text-slate-500 italic">
            Aucun souhait ajouté pour l'instant — ouvrez la liste pour commencer !
          </p>

          <!-- Anti-Spoiler & Progress Row -->
          <div class="pt-1 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between gap-2 text-[11px]">
            <template v-if="!isOwner && list.items.length > 0">
              <div class="flex-1 flex items-center gap-2">
                <div class="w-full max-w-[120px] bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    class="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    :style="{ width: `${Math.round((purchasedCount / list.items.length) * 100)}%` }"
                  />
                </div>
                <span class="font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  {{ purchasedCount }} / {{ list.items.length }} réservés
                </span>
              </div>
              <span class="text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
                <Lock class="w-3 h-3 text-amber-500" />
                <span>Surprise gardée</span>
              </span>
            </template>
          </div>
        </div>
      </div>

      <!-- Folder Footer: Invite Code Ticket + Open Action -->
      <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <!-- Interactive Invite Code Pill -->
        <button
          @click.stop="copyCode"
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-mono font-bold tracking-wider transition-colors"
          title="Copier le code d'invitation de cette liste"
        >
          <span class="text-[10px] font-sans font-medium text-slate-400 dark:text-slate-500">CODE</span>
          <span>{{ list.inviteCode }}</span>
          <Check v-if="isCodeCopied" class="w-3 h-3 text-emerald-500" />
          <Copy v-else class="w-3 h-3 text-slate-400" />
        </button>

        <!-- Open List CTA -->
        <NuxtLink
          :to="`/lists/${list.id}`"
          class="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all active:scale-98"
          :class="isOwner
            ? 'bg-slate-900 hover:bg-rose-600 text-white dark:bg-white dark:hover:bg-rose-500 dark:text-slate-900 dark:hover:text-white shadow-subtle'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-subtle'"
        >
          <span>{{ isOwner ? 'Gérer les souhaits' : 'Consulter et réserver' }}</span>
          <ArrowUpRight class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
