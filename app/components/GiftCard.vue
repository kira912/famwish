<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ExternalLink,
  Heart,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  MoreVertical,
  Edit2,
  Trash2,
  Sparkles,
  ShoppingBag,
  MessageSquare,
  Palette,
  Package,
  Check,
  User
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import type { WishlistItem } from '~/types'

const props = defineProps<{
  item: WishlistItem
  isOwner: boolean
  ownerName: string
}>()

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

// Check if this gift is intended for the logged-in user or list owner
const isItemForMe = computed(() => {
  const currentName = currentUser.value?.name?.trim().toLowerCase()
  const recName = (props.item.recipientName || props.ownerName || '').trim().toLowerCase()
  
  if (currentName && recName && (currentName === recName || recName === 'moi')) {
    return true
  }
  
  if (props.isOwner && (!props.item.recipientName || props.item.recipientName.trim().toLowerCase() === props.ownerName.trim().toLowerCase())) {
    return true
  }

  return false
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
    class="group relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col"
    :class="[
      item.isPurchased && !isItemForMe
        ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-rose-100 dark:hover:border-rose-950/50'
    ]"
  >
    <!-- Top Image Container -->
    <div class="relative w-full aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <img
        v-if="item.imageUrl"
        :src="item.imageUrl"
        :alt="item.title"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-slate-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-400">
        <Sparkles class="w-10 h-10 text-rose-300 dark:text-rose-500/40 mb-1 animate-pulse" />
        <span class="text-xs font-medium text-slate-400">Idée de cadeau</span>
      </div>

      <!-- Gradient overlay for readability -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      <!-- Top Badges Row -->
      <div class="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div class="flex items-center gap-1.5 flex-wrap">
          <!-- Recipient Badge (Pour X) -->
          <div
            v-if="item.recipientName"
            class="pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md backdrop-blur-md"
            :class="isItemForMe
              ? 'bg-indigo-600 text-white'
              : 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 border border-slate-200/50 dark:border-slate-700/50'"
          >
            <User class="w-3 h-3 text-amber-300" />
            <span>Pour {{ item.recipientName }}</span>
          </div>

          <!-- Favorite Badge -->
          <div v-if="item.isFavorite" class="pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/90 text-white text-[11px] font-bold shadow-glow backdrop-blur-md">
            <Heart class="w-3 h-3 fill-current" />
            <span>Coup de Cœur</span>
          </div>
        </div>

        <!-- Owner / Admin Actions Dropdown or Priority Badge -->
        <div v-if="isOwner" class="pointer-events-auto relative">
          <button
            @click="isMenuOpen = !isMenuOpen"
            class="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <MoreVertical class="w-4 h-4" />
          </button>

          <!-- Dropdown menu -->
          <div
            v-if="isMenuOpen"
            class="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-1.5 z-20 space-y-1"
          >
            <button
              @click="isMenuOpen = false; emit('edit', item)"
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Edit2 class="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>
            <button
              @click="isMenuOpen = false; emit('delete', item.id)"
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Supprimer</span>
            </button>
          </div>
        </div>

        <!-- Non-Recipient Reservation Status Tag -->
        <div v-else-if="item.isPurchased && !isItemForMe" class="pointer-events-auto px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-md flex items-center gap-1.5">
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>{{ isPurchasedByMe ? 'Réservé par vous' : 'Déjà réservé 🤫' }}</span>
        </div>
      </div>

      <!-- Bottom overlay on image (Price & Quantity) -->
      <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none text-white">
        <div v-if="item.price !== undefined" class="px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-xs font-bold font-mono tracking-tight">
          {{ item.price }} {{ item.currency || '€' }}
        </div>
        <div v-if="item.quantity && item.quantity > 1" class="px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-[11px] font-semibold">
          Qté : {{ item.quantity }}
        </div>
      </div>
    </div>

    <!-- Content Card Body -->
    <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
      <div>
        <!-- Title & Store -->
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <h4 class="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2">
            {{ item.title }}
          </h4>
        </div>

        <!-- Description if available -->
        <p v-if="item.description" class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed">
          {{ item.description }}
        </p>

        <!-- Custom Details: Color / Variant Tag -->
        <div v-if="item.colorOrVariant" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium mb-2">
          <Palette class="w-3 h-3 text-rose-500" />
          <span>{{ item.colorOrVariant }}</span>
        </div>

        <!-- Petit Cadre Commentaire / Note Personnelle dans sa propre liste -->
        <div
          v-if="item.comment"
          class="p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2"
        >
          <MessageSquare class="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p class="leading-relaxed text-[11px] italic">
            <span class="font-semibold not-italic">Note :</span> {{ item.comment }}
          </p>
        </div>
      </div>

      <!-- Action & Store Link Buttons -->
      <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <!-- Store Link if available -->
        <a
          v-if="item.url"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors group/link"
        >
          <span class="flex items-center gap-1.5">
            <ShoppingBag class="w-3.5 h-3.5" />
            <span>Voir sur {{ domainName }}</span>
          </span>
          <ExternalLink class="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
        </a>

        <!-- Anti-Spoiler Box: Secret préservé si le cadeau est pour moi -->
        <div
          v-if="isItemForMe"
          class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] flex items-center justify-between"
        >
          <div class="flex items-center gap-1.5">
            <Lock class="w-3.5 h-3.5 text-rose-400" />
            <span>Secret des réservations protégé 🤫</span>
          </div>
          <span class="text-[10px] text-slate-400">Surprise garantie</span>
        </div>

        <!-- Non-Recipient: Secret Purchase & Reservation Buttons -->
        <div v-else class="pt-1">
          <!-- Item Not Purchased Yet -->
          <div v-if="!item.isPurchased">
            <button
              v-if="!showReserveDialog"
              @click="showReserveDialog = true"
              class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold text-xs shadow-glow transition-all active:scale-[0.98]"
            >
              <Sparkles class="w-4 h-4 text-amber-200" />
              <span>Cocher / Réserver ce cadeau</span>
            </button>

            <!-- Inline Secret Reservation Popup Card -->
            <div
              v-else
              class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3 animate-in fade-in"
            >
              <div class="text-xs font-bold text-rose-950 dark:text-rose-100 flex items-center justify-between">
                <span>Réservation secrète</span>
                <button @click="showReserveDialog = false" class="text-rose-400 hover:text-rose-600">✕</button>
              </div>

              <div class="space-y-1.5 text-[11px] text-rose-900/80 dark:text-rose-200/80">
                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-rose-100 dark:border-rose-900/40">
                  <input
                    v-model="isAnonymousChoice"
                    :value="true"
                    type="radio"
                    class="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span class="font-semibold block text-slate-900 dark:text-white">Cocher Anonymement (Recommandé)</span>
                    <span class="text-[10px] text-slate-400">Personne ne saura qui l'a acheté avant Noël !</span>
                  </div>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-rose-100 dark:border-rose-900/40">
                  <input
                    v-model="isAnonymousChoice"
                    :value="false"
                    type="radio"
                    class="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span class="font-semibold block text-slate-900 dark:text-white">Avec mon prénom {{ currentUser?.name ? `(${currentUser.name})` : '' }}</span>
                    <span class="text-[10px] text-slate-400">Visible uniquement par les autres invités</span>
                  </div>
                </label>

                <!-- Guest name input if not logged in and not anonymous -->
                <div v-if="!isAnonymousChoice && !currentUser" class="pt-1">
                  <input
                    v-model="guestName"
                    type="text"
                    placeholder="Votre prénom (ex: Tonton Marc)"
                    class="w-full px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <button
                @click="handleConfirmReservation(isAnonymousChoice)"
                :disabled="isToggling"
                class="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check class="w-3.5 h-3.5" />
                <span>Confirmer l'achat secret 🎁</span>
              </button>
            </div>
          </div>

          <!-- Item Already Purchased -->
          <div v-else class="space-y-1.5">
            <div class="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center">
              <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                {{ item.purchasedBy?.isAnonymous ? '🎁 Déjà pris en charge en secret' : `🎁 Réservé par ${item.purchasedBy?.name || 'un proche'}` }}
              </span>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400">
                La surprise de {{ ownerName }} est bien gardée !
              </span>
            </div>

            <!-- Cancel Button if bought by me -->
            <button
              v-if="isPurchasedByMe"
              @click="handleCancelReservation"
              :disabled="isToggling"
              class="w-full py-1 text-center text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
            >
              Annuler ma réservation (libérer le cadeau)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
