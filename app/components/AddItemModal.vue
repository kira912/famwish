<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import {
  X,
  Link,
  Gift,
  Sparkles,
  Loader2,
  Palette,
  Heart,
  Image as ImageIcon,
  User,
  Users,
  Baby
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

function ensureString(val: unknown): string {
  if (typeof val === 'string') return val
  return ''
}

interface RecipientOption {
  name: string
  isChild?: boolean
  parentName?: string
  age?: number
  avatar?: string
}

// Existing recipients in this list (owner + joined members + children + item recipients)
const existingRecipientOptions = computed<RecipientOption[]>(() => {
  const map = new Map<string, RecipientOption>()
  const addOption = (raw?: unknown, meta?: Partial<RecipientOption>) => {
    if (typeof raw !== 'string') return
    const clean = raw.trim()
    if (!clean || clean.startsWith('user-') || clean.startsWith('google-') || clean.startsWith('child-')) return
    const key = clean.toLowerCase()
    if (!map.has(key)) {
      map.set(key, {
        name: clean,
        isChild: meta?.isChild,
        parentName: meta?.parentName,
        age: meta?.age,
        avatar: meta?.avatar
      })
    } else if (meta) {
      const existing = map.get(key)!
      if (meta.isChild) existing.isChild = true
      if (meta.parentName) existing.parentName = meta.parentName
      if (meta.age !== undefined) existing.age = meta.age
      if (meta.avatar) existing.avatar = meta.avatar
    }
  }

  addOption(currentUser.value?.name, { avatar: currentUser.value?.avatar })
  addOption(currentList.value?.ownerName, { avatar: currentList.value?.ownerAvatar })

  if (Array.isArray(currentList.value?.members)) {
    currentList.value!.members.forEach((m: any) => {
      if (typeof m === 'object' && m !== null && m.name) {
        addOption(m.name, {
          isChild: Boolean(m.isChild || m.role === 'child'),
          parentName: m.parentName,
          age: m.age,
          avatar: m.avatar
        })
      } else if (typeof m === 'string') {
        addOption(m)
      }
    })
  }

  currentList.value?.items.forEach(i => {
    addOption(i.recipientName, { avatar: i.recipientAvatar })
  })

  return Array.from(map.values())
})

const existingRecipients = computed(() => existingRecipientOptions.value.map(o => o.name))

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
      showCustomRecipient.value = !existingRecipients.value.some(r => r.toLowerCase() === form.recipientName.toLowerCase())
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
  } catch {
    form.url = url
    if (!form.title) {
      try {
        form.title = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      } catch {
        form.title = 'Lien produit'
      }
    }
    toast.error('Impossible d\'extraire les infos automatiquement. Vous pouvez les renseigner manuellement.')
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

  const matchedOption = existingRecipientOptions.value.find(o => o.name.toLowerCase() === recipient.toLowerCase())
  const isCurrentLoggedIn = currentUser.value?.name && recipient.toLowerCase() === currentUser.value.name.toLowerCase()

  const payload: Partial<WishlistItem> = {
    title,
    recipientName: recipient,
    recipientId: isCurrentLoggedIn ? currentUser.value?.id : undefined,
    recipientAvatar: matchedOption?.avatar || (isCurrentLoggedIn ? currentUser.value?.avatar : undefined),
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
  } catch {
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-modal-title"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      />

      <!-- Dialog Card -->
      <div
        class="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-elevated border border-slate-200 dark:border-slate-800 p-5 sm:p-7 z-10 my-auto max-h-[92vh] flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Gift class="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-item-modal-title" class="text-lg font-bold font-display text-slate-900 dark:text-white">
                {{ editingItem ? 'Modifier le cadeau' : 'Ajouter une envie de cadeau' }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">À partir d'un lien ou d'une idée libre</p>
            </div>
          </div>

          <button
            @click="emit('close')"
            type="button"
            aria-label="Fermer la boîte de dialogue"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Mode Toggle Tabs -->
        <div class="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4 shrink-0">
          <button
            type="button"
            @click="activeTab = 'link'"
            class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all"
            :class="activeTab === 'link'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          >
            <Link class="w-3.5 h-3.5" />
            <span>Lien produit web</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'manual'"
            class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all"
            :class="activeTab === 'manual'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>Idée sans lien</span>
          </button>
        </div>

        <!-- Form Scrollable Body -->
        <form @submit.prevent="handleSubmit" class="space-y-4 overflow-y-auto pr-1 flex-1">
          <!-- URL Auto Scraper box if Tab = Link -->
          <div v-if="activeTab === 'link'" class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Lien de la fiche produit (Amazon, Fnac, Zara, Lego...)
            </label>
            <div class="flex gap-2">
              <input
                v-model="rawUrlInput"
                type="url"
                placeholder="https://..."
                class="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                @keydown.enter.prevent="fetchLinkMetadata"
              />
              <button
                type="button"
                @click="fetchLinkMetadata"
                :disabled="!rawUrlInput.trim() || isFetchingPreview"
                class="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Loader2 v-if="isFetchingPreview" class="w-3.5 h-3.5 animate-spin" />
                <span v-else>Extraire</span>
              </button>
            </div>
          </div>

          <!-- Product Title -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nom du cadeau *
            </label>
            <input
              v-model="form.title"
              type="text"
              required
              placeholder="Ex: Lego Star Wars, Pull en cachemire, Livre..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <!-- Beneficiary -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Users class="w-3.5 h-3.5 text-rose-500" />
                <span>Pour qui est ce cadeau ?</span>
              </label>
              <button
                type="button"
                @click="showCustomRecipient = !showCustomRecipient"
                class="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                {{ showCustomRecipient ? 'Choisir existant' : '+ Nouveau prénom' }}
              </button>
            </div>

            <!-- Existing Recipients Pills -->
            <div v-if="!showCustomRecipient" class="flex flex-wrap gap-1.5">
              <button
                v-for="rec in existingRecipientOptions"
                :key="rec.name"
                type="button"
                @click="selectRecipient(rec.name)"
                class="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border"
                :class="form.recipientName.toLowerCase() === rec.name.toLowerCase()
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'"
              >
                <Baby v-if="rec.isChild" class="w-3.5 h-3.5 shrink-0" :class="form.recipientName.toLowerCase() === rec.name.toLowerCase() ? 'text-white' : 'text-sky-500'" />
                <User v-else class="w-3 h-3 opacity-70 shrink-0" />
                <span>Pour {{ rec.name }}</span>
                <span
                  v-if="rec.isChild && rec.parentName"
                  class="text-[10px] opacity-80"
                >
                  (👶 {{ rec.parentName }})
                </span>
              </button>
            </div>

            <!-- Custom Recipient Input -->
            <div v-else class="flex gap-2">
              <input
                v-model="customRecipientInput"
                type="text"
                placeholder="Ex: Papy André, Manon..."
                class="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                @keydown.enter.prevent="handleCustomRecipientSubmit"
              />
              <button
                type="button"
                @click="handleCustomRecipientSubmit"
                :disabled="!customRecipientInput.trim()"
                class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                OK
              </button>
            </div>
          </div>

          <!-- Image Preview & URL -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            <div class="sm:col-span-1 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl h-20 overflow-hidden border border-slate-200 dark:border-slate-700 relative">
              <img
                v-if="form.imageUrl"
                :src="form.imageUrl"
                alt="Aperçu du cadeau"
                class="w-full h-full object-cover"
                @error="form.imageUrl = ''"
              />
              <div v-else class="text-center p-2 text-slate-400">
                <ImageIcon class="w-5 h-5 mx-auto mb-0.5 opacity-50" />
                <span class="text-[10px] block">Aperçu</span>
              </div>
            </div>

            <div class="sm:col-span-3 space-y-1">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Lien image ou photo (optionnel)
              </label>
              <input
                v-model="form.imageUrl"
                type="url"
                placeholder="https://..."
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <!-- Price & Quantity Row -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Prix estimé (€)
              </label>
              <input
                v-model.number="form.price"
                type="number"
                step="0.01"
                placeholder="Ex: 49.99"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantité
              </label>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="form.quantity = Math.max(1, form.quantity - 1)"
                  class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 text-xs"
                >
                  -
                </button>
                <input
                  v-model.number="form.quantity"
                  type="number"
                  min="1"
                  class="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  @click="form.quantity = form.quantity + 1"
                  class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <!-- Color / Note Frame -->
          <div class="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2.5">
            <div class="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-xs">
              <Palette class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Précisions & Détails utiles</span>
            </div>

            <div>
              <label class="block text-[11px] font-medium text-amber-900 dark:text-amber-200 mb-1">
                Coloris, taille ou référence
              </label>
              <input
                v-model="form.colorOrVariant"
                type="text"
                placeholder="Ex: Taille M, Bleu marine..."
                class="w-full px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label class="block text-[11px] font-medium text-amber-900 dark:text-amber-200 mb-1">
                Commentaire ou mot explicatif
              </label>
              <textarea
                v-model="form.comment"
                rows="2"
                placeholder="Ex: Possibilité de participer à plusieurs pour une cagnotte..."
                class="w-full px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>

          <!-- Coup de coeur & Priority -->
          <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="form.isFavorite = !form.isFavorite"
                class="p-2 rounded-xl transition-colors"
                :class="form.isFavorite ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'"
                aria-label="Marquer comme coup de cœur"
              >
                <Heart class="w-4 h-4" :class="{ 'fill-current': form.isFavorite }" />
              </button>
              <div>
                <span class="text-xs font-semibold text-slate-900 dark:text-white block">Coup de Cœur ❤️</span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400">Met en avant cette envie</span>
              </div>
            </div>

            <select
              v-model="form.priority"
              class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="high">Priorité Haute 🔥</option>
              <option value="medium">Priorité Normale</option>
              <option value="low">Optionnel</option>
            </select>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="!form.title.trim() || isSubmitting"
              class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors active:scale-98"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <Sparkles v-else class="w-4 h-4" />
              <span>{{ isSubmitting ? 'Enregistrement...' : (editingItem ? 'Enregistrer les modifications' : 'Ajouter à la liste') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>
