<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ExternalLink,
  Heart,
  CheckCircle2,
  MoreVertical,
  Edit2,
  Trash2,
  Sparkles,
  ShoppingBag,
  MessageSquare,
  Palette,
  Check,
  User,
  Baby,
  X
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import type { WishlistItem } from '~/types'

const props = withDefaults(
  defineProps<{
    item: WishlistItem
    isOwner: boolean
    ownerName: string
    isChristmas?: boolean
    canManage?: boolean
    childInfo?: {
      name: string
      parentName?: string
      age?: number
    } | null
  }>(),
  {
    isChristmas: false,
    canManage: undefined,
    childInfo: null
  }
)

const emit = defineEmits<{
  (e: 'edit', item: WishlistItem): void
  (e: 'delete', itemId: string): void
}>()

const { togglePurchase } = useWishlists()
const { currentUser } = useAuth()

const isMenuOpen = ref(false)
const showReserveDialog = ref(false)
const isAnonymousChoice = ref(true)
const guestName = ref('')
const isToggling = ref(false)

const domainName = computed(() => {
  if (!props.item.url) return null
  try {
    const url = props.item.url.startsWith('http') ? props.item.url : `https://${props.item.url}`
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Boutique'
  }
})

// Check if this gift is intended for the logged-in adult user (note: a child has no account, so isItemForMe is false for children)
const isItemForMe = computed(() => {
  if (props.childInfo) return false
  const currentName = currentUser.value?.name ? String(currentUser.value.name).trim().toLowerCase() : ''
  const itemRec = typeof props.item.recipientName === 'string' ? props.item.recipientName.trim() : ''
  const owner = typeof props.ownerName === 'string' ? props.ownerName.trim() : ''
  const recName = (itemRec || owner).toLowerCase()

  if (currentName && recName && (currentName === recName || recName === 'moi')) {
    return true
  }

  if (props.isOwner && (!itemRec || itemRec.toLowerCase() === owner.toLowerCase())) {
    return true
  }

  return false
})

const canEditOrDelete = computed(() => {
  if (props.canManage !== undefined) return props.canManage
  return props.isOwner || isItemForMe.value
})

const isPurchasedByMe = computed(() => {
  if (!props.item.isPurchased) return false
  return props.item.purchasedBy?.userId === currentUser.value?.id
})

async function handleConfirmReservation(anonymous: boolean) {
  isToggling.value = true
  try {
    if (!anonymous && !currentUser.value && guestName.value.trim()) {
      useAuth().createCustomUser(guestName.value.trim())
    }
    await togglePurchase(props.item.listId, props.item.id, true, anonymous)
    showReserveDialog.value = false
  } finally {
    isToggling.value = false
  }
}

async function handleCancelReservation() {
  isToggling.value = true
  try {
    await togglePurchase(props.item.listId, props.item.id, false)
  } finally {
    isToggling.value = false
  }
}
</script>

<template>
  <div
    class="group relative rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between"
    :class="[
      item.isPurchased && !isItemForMe
        ? (isChristmas
            ? 'bg-slate-50/80 dark:bg-slate-900/40 border-amber-300/30 dark:border-amber-600/20 opacity-85'
            : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-85')
        : (isChristmas
            ? 'bg-white dark:bg-slate-900 border-amber-300/70 dark:border-amber-500/40 shadow-[0_4px_18px_-4px_rgba(185,28,28,0.08),0_2px_8px_rgba(234,179,8,0.06)] hover:shadow-[0_12px_32px_-6px_rgba(185,28,28,0.2),0_0_20px_rgba(234,179,8,0.2)] hover:border-amber-400 dark:hover:border-amber-400'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-card hover:shadow-card-hover')
    ]"
  >
    <!-- Top Image Container -->
    <div>
      <div
        class="relative w-full aspect-[16/10] overflow-hidden"
        :class="isChristmas ? 'bg-amber-50/40 dark:bg-xmas-950/20' : 'bg-slate-100 dark:bg-slate-800'"
      >
        <img
          v-if="item.imageUrl"
          :src="item.imageUrl"
          :alt="item.title"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          loading="lazy"
        />
        <div
          v-else
          class="w-full h-full flex flex-col items-center justify-center text-slate-400"
          :class="isChristmas ? 'bg-gradient-to-br from-xmas-950/5 via-amber-50/30 to-xmas-900/10 dark:from-xmas-950/40 dark:to-slate-900' : 'bg-slate-50 dark:bg-slate-800/60'"
        >
          <span v-if="isChristmas" class="text-3xl mb-1 filter drop-shadow">🎁</span>
          <Sparkles v-else class="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
          <span
            class="text-xs font-semibold"
            :class="isChristmas ? 'text-amber-800 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'"
          >
            {{ isChristmas ? 'Idée pour la hotte de Noël ✨' : 'Idée cadeau' }}
          </span>
        </div>

        <!-- Subtle gradient for badge legibility -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

        <!-- Top Badges Row -->
        <div class="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
          <div class="flex items-center gap-1.5 flex-wrap">
            <!-- Recipient Badge (Pour X) -->
            <div
              v-if="item.recipientName"
              class="pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm"
              :class="childInfo
                ? 'bg-sky-50/95 dark:bg-sky-950/95 text-sky-900 dark:text-sky-200 border border-sky-300/80 dark:border-sky-600/50'
                : (isChristmas
                    ? 'bg-amber-50/95 dark:bg-slate-900/95 text-amber-950 dark:text-amber-200 border border-amber-300/80 dark:border-amber-500/50'
                    : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60')"
              :title="childInfo?.parentName ? `Enfant rattaché à ${childInfo.parentName}` : undefined"
            >
              <span v-if="childInfo" class="text-[11px]">👶</span>
              <span v-else-if="isChristmas" class="text-[11px]">🎅</span>
              <User v-else class="w-3 h-3 text-rose-500" />
              <span>Pour {{ item.recipientName }}</span>
              <span v-if="childInfo?.age" class="opacity-75 text-[10px]">({{ childInfo.age }} ans)</span>
            </div>

            <!-- Favorite Badge -->
            <div
              v-if="item.isFavorite"
              class="pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm"
              :class="isChristmas
                ? 'bg-gradient-to-r from-xmas-700 via-rose-700 to-xmas-800 text-amber-200 border border-amber-300/60'
                : 'bg-rose-600 text-white'"
            >
              <Heart class="w-3 h-3 fill-current text-amber-200" />
              <span>{{ isChristmas ? 'Coup de Cœur de Noël ⭐' : 'Coup de Cœur' }}</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Non-Recipient Reservation Status Tag -->
            <div
              v-if="item.isPurchased && !isItemForMe"
              class="pointer-events-auto px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm flex items-center gap-1.5"
              :class="isChristmas
                ? 'bg-emerald-700 text-amber-100 border border-amber-300/50'
                : 'bg-emerald-600 text-white'"
            >
              <CheckCircle2 class="w-3.5 h-3.5 text-amber-300" />
              <span>{{ isPurchasedByMe ? 'Réservé par vous 🎁' : 'Déjà réservé 🤫' }}</span>
            </div>

            <!-- Owner / Parent Actions Menu -->
            <div v-if="canEditOrDelete" class="pointer-events-auto relative">
              <button
                @click="isMenuOpen = !isMenuOpen"
                type="button"
                aria-label="Options du cadeau"
                class="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
                :class="isChristmas
                  ? 'bg-white/95 dark:bg-slate-900/95 hover:bg-amber-50 dark:hover:bg-slate-800 border border-amber-300/50'
                  : 'bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800'"
              >
                <MoreVertical class="w-4 h-4" />
              </button>

              <!-- Dropdown menu -->
              <div
                v-if="isMenuOpen"
                class="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-slate-800 rounded-2xl shadow-elevated border p-1.5 z-20 space-y-0.5"
                :class="isChristmas ? 'border-amber-300/60 dark:border-amber-600/40' : 'border-slate-200 dark:border-slate-700'"
              >
                <button
                  @click="isMenuOpen = false; emit('edit', item)"
                  type="button"
                  class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
                <button
                  @click="isMenuOpen = false; emit('delete', item.id)"
                  type="button"
                  class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom overlay on image (Price & Quantity) -->
        <div class="absolute bottom-2.5 left-3 right-3 flex items-end justify-between pointer-events-none text-white">
          <div
            v-if="item.price !== undefined"
            class="px-2.5 py-1 rounded-lg backdrop-blur-md text-xs font-bold font-mono tracking-tight"
            :class="isChristmas
              ? 'bg-black/70 border border-amber-400/60 text-amber-200 shadow-sm'
              : 'bg-black/60'"
          >
            {{ item.price }} {{ item.currency || '€' }}
          </div>
          <div
            v-if="item.quantity && item.quantity > 1"
            class="px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-[11px] font-medium"
            :class="isChristmas ? 'border border-white/20' : ''"
          >
            Qté : {{ item.quantity }}
          </div>
        </div>
      </div>

      <!-- Content Card Body -->
      <div class="p-4 sm:p-5 space-y-3">
        <!-- Child Parent Subtitle if applicable -->
        <div
          v-if="childInfo?.parentName"
          class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200/70 dark:border-sky-800/50 text-[11px] font-medium text-sky-800 dark:text-sky-300"
        >
          <Baby class="w-3 h-3 text-sky-500 shrink-0" />
          <span>Enfant de <strong>{{ childInfo.parentName }}</strong></span>
        </div>

        <!-- Title -->
        <h4 class="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2">
          {{ item.title }}
        </h4>

        <!-- Description -->
        <p v-if="item.description" class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {{ item.description }}
        </p>

        <!-- Color / Variant Tag -->
        <div
          v-if="item.colorOrVariant"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
          :class="isChristmas
            ? 'bg-amber-50 dark:bg-xmas-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/40'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
        >
          <Palette class="w-3 h-3 text-rose-500" />
          <span>{{ item.colorOrVariant }}</span>
        </div>

        <!-- Note / Comment Frame -->
        <div
          v-if="item.comment"
          class="p-2.5 rounded-xl border text-xs flex items-start gap-2"
          :class="isChristmas
            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'"
        >
          <MessageSquare class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p class="leading-relaxed text-[11px]">
            <span class="font-semibold">{{ isChristmas ? 'Note pour le Père Noël :' : 'Note :' }}</span> {{ item.comment }}
          </p>
        </div>
      </div>
    </div>

    <!-- Action & Store Link Buttons Footer -->
    <div class="p-4 sm:p-5 pt-0 space-y-2.5">
      <!-- Store Link if available -->
      <a
        v-if="item.url"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors group/link"
        :class="isChristmas
          ? 'text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
          : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'"
      >
        <span class="flex items-center gap-1.5">
          <ShoppingBag class="w-3.5 h-3.5" />
          <span>Voir sur {{ domainName }}</span>
        </span>
        <ExternalLink class="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
      </a>

      <!-- Reservation Section for Guests / Relatives / Parents of a child -->
      <div v-if="!isItemForMe">
        <!-- Item Not Purchased Yet -->
        <div v-if="!item.isPurchased">
          <button
            v-if="!showReserveDialog"
            @click="showReserveDialog = true"
            type="button"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-colors shadow-sm active:scale-98"
            :class="isChristmas
              ? 'bg-gradient-to-r from-xmas-700 via-rose-700 to-xmas-800 hover:from-xmas-800 hover:to-rose-900 text-amber-100 border border-amber-400/50 shadow-[0_4px_14px_rgba(185,28,28,0.3)]'
              : 'bg-rose-600 hover:bg-rose-700 text-white'"
          >
            <Sparkles class="w-3.5 h-3.5" :class="isChristmas ? 'text-amber-300' : ''" />
            <span>{{ isChristmas ? '🎁 Mettre dans ma hotte pour Noël' : 'Réserver ce cadeau' }}</span>
          </button>

          <!-- Inline Secret Reservation Popup Card -->
          <div
            v-else
            class="p-3.5 rounded-2xl space-y-3 animate-fade-in border"
            :class="isChristmas
              ? 'bg-gradient-to-b from-amber-50/90 to-white dark:from-xmas-950/60 dark:to-slate-900 border-amber-300 dark:border-amber-600/40 shadow-card'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'"
          >
            <div class="text-xs font-bold flex items-center justify-between text-slate-900 dark:text-white">
              <span :class="isChristmas ? 'text-amber-900 dark:text-amber-200 font-extrabold' : ''">
                {{ isChristmas ? '🎄 Réservation secrète de Noël' : 'Réservation secrète' }}
              </span>
              <button
                @click="showReserveDialog = false"
                type="button"
                aria-label="Fermer le dialogue de réservation"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <label
                class="flex items-start gap-2 cursor-pointer p-2 rounded-xl border"
                :class="isChristmas
                  ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'"
              >
                <input
                  v-model="isAnonymousChoice"
                  :value="true"
                  type="radio"
                  class="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span class="font-semibold block text-slate-900 dark:text-white text-xs">
                    {{ isChristmas ? 'Cocher en Secret (Lutin de Noël 🎅)' : 'Cocher Anonymement (Secret)' }}
                  </span>
                  <span class="text-[11px] text-slate-500 dark:text-slate-400">
                    {{ isChristmas ? 'Personne ne saura qui l\'a déposé sous le sapin avant le 25 décembre ! 🤫' : 'Personne ne saura qui l\'a acheté avant le déballage ! 🤫' }}
                  </span>
                </div>
              </label>

              <label
                class="flex items-start gap-2 cursor-pointer p-2 rounded-xl border"
                :class="isChristmas
                  ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'"
              >
                <input
                  v-model="isAnonymousChoice"
                  :value="false"
                  type="radio"
                  class="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span class="font-semibold block text-slate-900 dark:text-white text-xs">
                    Avec mon prénom {{ currentUser?.name ? `(${currentUser.name})` : '' }}
                  </span>
                  <span class="text-[11px] text-slate-500 dark:text-slate-400">Visible uniquement par les autres invités</span>
                </div>
              </label>

              <!-- Guest name input if not logged in and not anonymous -->
              <div v-if="!isAnonymousChoice && !currentUser" class="pt-1">
                <input
                  v-model="guestName"
                  type="text"
                  placeholder="Votre prénom (ex: Tonton Marc)"
                  class="w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  :class="isChristmas ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'"
                />
              </div>
            </div>

            <button
              @click="handleConfirmReservation(isAnonymousChoice)"
              :disabled="isToggling"
              type="button"
              class="w-full py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
              :class="isChristmas
                ? 'gold-gradient-btn'
                : 'bg-rose-600 hover:bg-rose-700 text-white'"
            >
              <Check class="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{{ isChristmas ? 'Confirmer la réservation de Noël 🎁' : 'Confirmer la réservation' }}</span>
            </button>
          </div>
        </div>

        <!-- Item Already Purchased -->
        <div v-else class="space-y-1.5">
          <div
            class="p-2.5 rounded-xl border text-center"
            :class="isChristmas
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-amber-300/50 dark:border-amber-600/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'"
          >
            <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
              {{ item.purchasedBy?.isAnonymous ? '🎁 Déjà dans la hotte en secret !' : `🎁 Réservé par ${item.purchasedBy?.name || 'un proche'}` }}
            </span>
            <span class="text-[11px] text-emerald-600 dark:text-emerald-400">
              {{ isChristmas ? 'La surprise est sous le sapin ! 🎄' : 'La surprise est bien gardée !' }}
            </span>
          </div>

          <!-- Cancel Button if bought by me -->
          <button
            v-if="isPurchasedByMe"
            @click="handleCancelReservation"
            :disabled="isToggling"
            type="button"
            class="w-full py-1 text-center text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors font-medium"
          >
            Annuler ma réservation
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
