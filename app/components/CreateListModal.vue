<script setup lang="ts">
import { reactive, watch, ref } from 'vue'
import { X, Sparkles } from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import { useRouter } from 'vue-router'
import type { WishlistCategory, Wishlist } from '~/types'

const props = defineProps<{
  isOpen: boolean
  editingList?: Wishlist | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', list: Wishlist): void
}>()

const { createList, updateList } = useWishlists()
const { currentUser, createCustomUser, openAuthModal } = useAuth()
const router = useRouter()

const isSubmitting = ref(false)
const ownerName = ref('')

const categories: { key: WishlistCategory; label: string; emoji: string; gradient: string }[] = [
  { key: 'christmas', label: 'Noël & Fêtes', emoji: '🎄', gradient: 'from-xmas-700 to-rose-700' },
  { key: 'birthday', label: 'Anniversaire', emoji: '🎂', gradient: 'from-amber-500 to-rose-500' },
  { key: 'birth', label: 'Naissance', emoji: '🍼', gradient: 'from-rose-400 to-pink-500' },
  { key: 'wedding', label: 'Mariage', emoji: '💍', gradient: 'from-amber-400 to-rose-400' },
  { key: 'housewarming', label: 'Crémaillère', emoji: '🏡', gradient: 'from-emerald-600 to-teal-700' },
  { key: 'other', label: 'Autre', emoji: '✨', gradient: 'from-indigo-600 to-rose-600' }
]

const emojis = ['🎄', '🎁', '🎅', '⭐', '🎂', '🥳', '🍼', '💍', '🏡', '✨', '🎈', '🧸', '🎮', '📚']

const form = reactive({
  title: '',
  description: '',
  category: 'christmas' as WishlistCategory,
  eventDate: '',
  coverEmoji: '🎄',
  coverGradient: 'from-xmas-700 to-rose-700'
})

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.editingList) {
      form.title = props.editingList.title
      form.description = props.editingList.description || ''
      form.category = props.editingList.category
      form.eventDate = props.editingList.eventDate || ''
      form.coverEmoji = props.editingList.coverEmoji || '🎁'
      form.coverGradient = props.editingList.coverGradient || 'from-xmas-700 to-rose-700'
    } else {
      form.title = ''
      form.description = ''
      form.category = 'christmas'
      form.eventDate = '2026-12-24'
      form.coverEmoji = '🎄'
      form.coverGradient = 'from-xmas-700 to-rose-700'
    }
  }
})

function handleCategoryChange(cat: typeof categories[0]) {
  form.category = cat.key
  form.coverEmoji = cat.emoji
  form.coverGradient = cat.gradient
  if (cat.key === 'christmas' && !form.eventDate) {
    form.eventDate = '2026-12-24'
  }
}

async function handleSubmit() {
  if (!form.title.trim()) return
  if (!currentUser.value && !props.editingList && !ownerName.value.trim()) return

  isSubmitting.value = true

  try {
    if (!currentUser.value && !props.editingList) {
      createCustomUser(ownerName.value.trim())
    }

    if (props.editingList) {
      const updated = await updateList({
        ...props.editingList,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        eventDate: form.eventDate || undefined,
        coverEmoji: form.coverEmoji,
        coverGradient: form.coverGradient
      })
      if (updated) {
        emit('close')
      }
    } else {
      const created = await createList({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        eventDate: form.eventDate || undefined,
        coverEmoji: form.coverEmoji,
        coverGradient: form.coverGradient
      })
      if (created) {
        emit('created', created)
        emit('close')
        router.push(`/lists/${created.id}`)
      }
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-list-modal-title"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      />

      <!-- Dialog Card -->
      <div
        class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-elevated border border-slate-200 dark:border-slate-800 p-6 sm:p-8 z-10 my-auto"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl">
              {{ form.coverEmoji }}
            </div>
            <div>
              <h3 id="create-list-modal-title" class="text-xl font-bold font-display text-slate-900 dark:text-white">
                {{ editingList ? 'Modifier la liste' : 'Nouvelle liste de souhaits' }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Pour Noël, un anniversaire ou une occasion spéciale</p>
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

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Category selection pills -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Occasion
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="cat in categories"
                :key="cat.key"
                type="button"
                @click="handleCategoryChange(cat)"
                class="flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-colors"
                :class="form.category === cat.key
                  ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-1 ring-rose-600'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
              >
                <span>{{ cat.emoji }}</span>
                <span class="truncate">{{ cat.label.split(' ')[0] }}</span>
              </button>
            </div>
          </div>

          <!-- Title Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Titre de la liste *
            </label>
            <input
              v-model="form.title"
              type="text"
              required
              placeholder="Ex: Mes souhaits pour Noël, Anniversaire..."
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <!-- User Name input if not logged in -->
          <div v-if="!currentUser && !editingList" class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Votre prénom (créateur de la liste) *
              </label>
              <button
                type="button"
                @click="openAuthModal"
                class="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                Se connecter
              </button>
            </div>
            <input
              v-model="ownerName"
              type="text"
              required
              placeholder="Ex: Sophie, Papa, Julien..."
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description ou petit mot pour vos proches (optionnel)
            </label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Ex: N'hésitez pas à piocher dedans, hâte de vous retrouver !"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <!-- Date & Emoji selection row -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date de l'événement
              </label>
              <input
                v-model="form.eventDate"
                type="date"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Émoji principal
              </label>
              <div class="flex items-center gap-1 overflow-x-auto py-0.5">
                <button
                  v-for="em in emojis.slice(0, 7)"
                  :key="em"
                  type="button"
                  @click="form.coverEmoji = em"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-transform shrink-0"
                  :class="form.coverEmoji === em ? 'bg-rose-100 dark:bg-rose-950/60 ring-2 ring-rose-500 scale-105' : 'hover:bg-slate-100 dark:hover:bg-slate-800'"
                >
                  {{ em }}
                </button>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="!form.title.trim() || isSubmitting"
              class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors active:scale-98"
            >
              <Sparkles class="w-4 h-4" />
              <span>{{ isSubmitting ? 'Enregistrement...' : (editingList ? 'Mettre à jour' : 'Créer la liste') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>
