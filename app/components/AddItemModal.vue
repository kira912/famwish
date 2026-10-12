<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import {
  X,
  Link,
  Gift,
  Sparkles,
  Loader2,
  DollarSign,
  Palette,
  Hash,
  MessageSquare,
  Heart,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  User,
  Users
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import type { WishlistItem, LinkMetadata } from '~/types'

const props = defineProps<{
  isOpen: boolean
  listId: string
  editingItem?: WishlistItem | null
  defaultRecipientName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', item: WishlistItem): void
}>()

const { getList, addItem, updateItem } = useWishlists()
const { currentUser } = useAuth()
const toast = useToast()

const currentList = computed(() => getList(props.listId))

// Helper to get string safely
function ensureString(val: unknown): string {
  if (typeof val === 'string') return val
  if (val === null || val === undefined) return ''
  return ''
}

// Existing recipients in this list
const existingRecipients = computed(() => {
  const set = new Set<string>()
  if (currentUser.value?.name) {
    set.add(String(currentUser.value.name).trim())
  }
  if (currentList.value?.ownerName) {
    set.add(String(currentList.value.ownerName).trim())
  }
  currentList.value?.items.forEach(i => {
    if (typeof i.recipientName === 'string' && i.recipientName.trim()) {
      set.add(i.recipientName.trim())
    }
  })
  return Array.from(set).filter(Boolean)
})

const activeTab = ref<'link' | 'manual'>('link')
const isFetchingPreview = ref(false)
const isSubmitting = ref(false)
const rawUrlInput = ref('')
const customRecipientInput = ref('')
const showCustomRecipient = ref(false)

watch(rawUrlInput, (newVal) => {
  if (newVal) {
    const match = newVal.match(/https?:\/\/[^\s"'<>]+/i)
    if (match && match[0] !== newVal) {
      rawUrlInput.value = match[0]
    }
  }
})

const form = reactive({
  title: '',
  recipientName: '',
  description: '',
  url: '',
  imageUrl: '',
  price: undefined as number | undefined,
  currency: '€',
  quantity: 1,
  colorOrVariant: '',
  comment: '',
  isFavorite: false,
  priority: 'medium' as 'low' | 'medium' | 'high'
})

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.editingItem) {
      activeTab.value = props.editingItem.url ? 'link' : 'manual'
      rawUrlInput.value = props.editingItem.url || ''
      form.title = ensureString(props.editingItem.title)
      form.recipientName = ensureString(props.editingItem.recipientName) || ensureString(currentList.value?.ownerName) || ensureString(currentUser.value?.name) || ''
      form.description = ensureString(props.editingItem.description)
      form.url = ensureString(props.editingItem.url)
      form.imageUrl = ensureString(props.editingItem.imageUrl)
      form.price = props.editingItem.price
      form.currency = ensureString(props.editingItem.currency) || '€'
      form.quantity = props.editingItem.quantity || 1
      form.colorOrVariant = ensureString(props.editingItem.colorOrVariant)
      form.comment = ensureString(props.editingItem.comment)
      form.isFavorite = Boolean(props.editingItem.isFavorite)
      form.priority = props.editingItem.priority || 'medium'
      showCustomRecipient.value = !existingRecipients.value.includes(form.recipientName)
    } else {
      activeTab.value = 'link'
      rawUrlInput.value = ''
      form.title = ''
      form.recipientName = ensureString(props.defaultRecipientName) || ensureString(currentUser.value?.name) || ensureString(currentList.value?.ownerName) || ''
      form.description = ''
      form.url = ''
      form.imageUrl = ''
      form.price = undefined
      form.currency = '€'
      form.quantity = 1
      form.colorOrVariant = ''
      form.comment = ''
      form.isFavorite = false
      form.priority = 'medium'
      showCustomRecipient.value = false
      customRecipientInput.value = ''
    }
  }
})

function selectRecipient(name: string) {
  form.recipientName = ensureString(name)
  showCustomRecipient.value = false
}

function handleCustomRecipientSubmit() {
  const custom = ensureString(customRecipientInput.value).trim()
  if (custom) {
    form.recipientName = custom
    showCustomRecipient.value = false
  }
}

async function fetchLinkMetadata() {
  const url = ensureString(rawUrlInput.value).trim()
  if (!url) return

  isFetchingPreview.value = true
  try {
    const data = await $fetch<LinkMetadata>('/api/preview', {
      method: 'POST',
      body: { url }
    })

    form.url = data.url || url
    if (data.title) {
      form.title = data.title
    }
    if (data.description && !form.description) {
      form.description = data.description
    }
    if (data.imageUrl) {
      form.imageUrl = data.imageUrl
    }
    if (data.price !== undefined) {
      form.price = data.price
    }
    if (data.currency) {
      form.currency = data.currency
    }

    toast.success('Informations du produit récupérées !')
  } catch (err) {
    form.url = url
    if (!form.title) {
      try {
        form.title = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      } catch {
        form.title = 'Lien produit'
      }
    }
    toast.error('Impossible d\'extraire les infos automatiquement, vous pouvez les saisir manuellement.')
  } finally {
    isFetchingPreview.value = false
  }
}

async function handleSubmit() {
  const title = ensureString(form.title).trim()
  if (!title) return
  isSubmitting.value = true

  const customRec = ensureString(customRecipientInput.value).trim()
  const formRec = ensureString(form.recipientName).trim()
  const recipient = (showCustomRecipient.value && customRec)
    ? customRec
    : formRec || ensureString(currentUser.value?.name) || ensureString(currentList.value?.ownerName) || 'Moi'

  const finalUrl = ensureString(form.url).trim() || (activeTab.value === 'link' ? ensureString(rawUrlInput.value).trim() : '') || undefined

  const isCurrentLoggedIn = currentUser.value?.name && recipient.toLowerCase() === currentUser.value.name.toLowerCase()

  const payload: Partial<WishlistItem> = {
    title,
    recipientName: recipient,
    recipientId: isCurrentLoggedIn ? currentUser.value?.id : undefined,
    recipientAvatar: isCurrentLoggedIn ? currentUser.value?.avatar : undefined,
    description: ensureString(form.description).trim() || undefined,
    url: finalUrl,
    imageUrl: ensureString(form.imageUrl).trim() || undefined,
    price: (form.price !== undefined && form.price !== null && !isNaN(Number(form.price))) ? Number(form.price) : undefined,
    currency: ensureString(form.currency) || '€',
    quantity: form.quantity > 0 ? form.quantity : 1,
    colorOrVariant: ensureString(form.colorOrVariant).trim() || undefined,
    comment: ensureString(form.comment).trim() || undefined,
    isFavorite: form.isFavorite,
    priority: form.priority
  }

  try {
    if (props.editingItem) {
      const updated = await updateItem(props.listId, {
        ...props.editingItem,
        ...payload
      } as WishlistItem)
      if (updated) {
        emit('saved', updated)
        emit('close')
      } else {
        toast.error('Erreur lors de la modification du cadeau')
      }
    } else {
      const created = await addItem(props.listId, payload)
      if (created) {
        emit('saved', created)
        emit('close')
      } else {
        toast.error('Erreur lors de l\'ajout du cadeau')
      }
    }
  } catch (err) {
    toast.error('Une erreur est survenue lors de l\'enregistrement')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        @click="emit('close')"
      />

      <!-- Dialog Card -->
      <div
        class="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-5 sm:p-7 overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-4 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-glow text-white">
              <Gift class="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 class="text-xl font-bold font-display text-slate-900 dark:text-white">
                {{ editingItem ? 'Modifier le cadeau' : 'Ajouter une envie de cadeau' }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Lien e-commerce ou idée spontanée</p>
            </div>
          </div>

          <button
            @click="emit('close')"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Mode Toggle Tabs (Lien fiche produit vs Idée sans lien) -->
        <div class="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 shrink-0">
          <button
            type="button"
            @click="activeTab = 'link'"
            class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all"
            :class="activeTab === 'link'
              ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
          >
            <Link class="w-3.5 h-3.5" />
            <span>Lien produit web</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'manual'"
            class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all"
            :class="activeTab === 'manual'
              ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>Idée libre sans lien</span>
          </button>
        </div>

        <!-- Form Scrollable Body -->
        <form @submit.prevent="handleSubmit" class="space-y-4 overflow-y-auto pr-1 flex-1">
          <!-- URL Auto Scraper box if Tab = Link -->
          <div v-if="activeTab === 'link'" class="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-2">
            <label class="block text-xs font-semibold text-rose-950 dark:text-rose-200">
              Collez le lien de la fiche produit (Amazon, Fnac, Zara, Lego...)
            </label>
            <div class="flex gap-2">
              <input
                v-model="rawUrlInput"
                type="url"
                placeholder="https://www.exemple.com/article..."
                class="flex-1 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                @keydown.enter.prevent="fetchLinkMetadata"
              />
              <button
                type="button"
                @click="fetchLinkMetadata"
                :disabled="!rawUrlInput.trim() || isFetchingPreview"
                class="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Loader2 v-if="isFetchingPreview" class="w-3.5 h-3.5 animate-spin" />
                <span v-else>Extraire</span>
              </button>
            </div>
            <p class="text-[11px] text-rose-700/80 dark:text-rose-300/80 leading-tight">
              ✨ FamWish va automatiquement récupérer le titre, la photo et le prix !
            </p>
          </div>

          <!-- Product Title -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Nom du cadeau *
            </label>
            <input
              v-model="form.title"
              type="text"
              required
              placeholder="Ex: Lego Star Wars, Pull en cachemire, Jeu Switch..."
              class="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <!-- Beneficiary / For whom is this gift? (Multi-person family list support) -->
          <div class="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-1.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                <Users class="w-3.5 h-3.5 text-indigo-500" />
                <span>Pour qui est ce cadeau de Noël ?</span>
              </label>
              <button
                type="button"
                @click="showCustomRecipient = !showCustomRecipient"
                class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {{ showCustomRecipient ? 'Choisir existant' : '+ Nouveau membre' }}
              </button>
            </div>

            <!-- Existing Recipients Pills -->
            <div v-if="!showCustomRecipient" class="flex flex-wrap gap-1.5">
              <button
                v-for="rec in existingRecipients"
                :key="rec"
                type="button"
                @click="selectRecipient(rec)"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                :class="form.recipientName === rec
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700'"
              >
                <User class="w-3 h-3 opacity-70" />
                <span>Pour {{ rec }}</span>
              </button>
            </div>

            <!-- Custom Recipient Input -->
            <div v-else class="flex gap-2">
              <input
                v-model="customRecipientInput"
                type="text"
                placeholder="Ex: Papy André, Manon (7 ans), Cousin Julien..."
                class="flex-1 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @keydown.enter.prevent="handleCustomRecipientSubmit"
              />
              <button
                type="button"
                @click="handleCustomRecipientSubmit"
                :disabled="!customRecipientInput.trim()"
                class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all"
              >
                OK
              </button>
            </div>
          </div>

          <!-- Image Preview & URL -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            <div class="sm:col-span-1 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl h-24 overflow-hidden border border-slate-200 dark:border-slate-700 relative">
              <img
                v-if="form.imageUrl"
                :src="form.imageUrl"
                alt="Aperçu"
                class="w-full h-full object-cover"
                @error="form.imageUrl = ''"
              />
              <div v-else class="text-center p-2 text-slate-400">
                <ImageIcon class="w-6 h-6 mx-auto mb-1 opacity-50" />
                <span class="text-[10px] block">Aperçu</span>
              </div>
            </div>

            <div class="sm:col-span-3 space-y-2">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Lien image ou photo (optionnel)
              </label>
              <input
                v-model="form.imageUrl"
                type="url"
                placeholder="https://... image.jpg"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <!-- Price & Quantity Row -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Prix estimé (€)
              </label>
              <div class="relative">
                <input
                  v-model.number="form.price"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 49.99"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Quantité souhaitée
              </label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="form.quantity = Math.max(1, form.quantity - 1)"
                  class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 text-base"
                >
                  -
                </button>
                <input
                  v-model.number="form.quantity"
                  type="number"
                  min="1"
                  class="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  @click="form.quantity = form.quantity + 1"
                  class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 text-base"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <!-- Cadre Personnalisé : Coloris / Taille / Référence & Note Personnelle -->
          <div class="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
            <div class="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
              <Palette class="w-4 h-4 text-amber-600" />
              <span>Détails & Précisions pour vos proches</span>
            </div>

            <!-- Color / Variant / Size field -->
            <div>
              <label class="block text-[11px] font-semibold text-amber-950 dark:text-amber-200 mb-1">
                Coloris, Taille ou Référence exacte
              </label>
              <input
                v-model="form.colorOrVariant"
                type="text"
                placeholder="Ex: Taille M • Coloris Bleu Marine • Réf #75301"
                class="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <!-- Comment / Note Box -->
            <div>
              <label class="block text-[11px] font-semibold text-amber-950 dark:text-amber-200 mb-1">
                Cadre commentaire / Petit mot explicatif
              </label>
              <textarea
                v-model="form.comment"
                rows="2"
                placeholder="Ex: Attention à bien prendre l'édition reliée ! / Si trop cher, on peut faire une cagnotte commune 🎁"
                class="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>

          <!-- Coup de coeur & Priority -->
          <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="form.isFavorite = !form.isFavorite"
                class="p-2 rounded-xl transition-all"
                :class="form.isFavorite ? 'bg-rose-500 text-white shadow-glow' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'"
              >
                <Heart class="w-4 h-4" :class="{ 'fill-current': form.isFavorite }" />
              </button>
              <div>
                <span class="text-xs font-semibold text-slate-900 dark:text-white block">Marquer comme Coup de Cœur ❤️</span>
                <span class="text-[10px] text-slate-400">Met ce cadeau en avant pour votre famille</span>
              </div>
            </div>

            <select
              v-model="form.priority"
              class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="high">Priorité Haute 🔥</option>
              <option value="medium">Priorité Normale</option>
              <option value="low">Optionnel / Bonus</option>
            </select>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="!form.title.trim() || isSubmitting"
              class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 text-white font-semibold text-sm shadow-glow transition-all active:scale-[0.99]"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <Sparkles v-else class="w-4 h-4 text-amber-200" />
              <span>{{ isSubmitting ? 'Enregistrement...' : (editingItem ? 'Enregistrer les modifications' : 'Ajouter à ma liste 🎁') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>
