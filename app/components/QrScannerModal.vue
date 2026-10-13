<script setup lang="ts">
import { ref } from 'vue'
import { X, QrCode, ArrowRight } from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useRouter } from 'vue-router'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { joinListByCode, lists } = useWishlists()
const router = useRouter()

const inviteCode = ref('')
const isSubmitting = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  if (!inviteCode.value.trim()) return
  isSubmitting.value = true
  errorMsg.value = ''

  try {
    const list = await joinListByCode(inviteCode.value.trim())
    if (list) {
      inviteCode.value = ''
      emit('close')
      router.push(`/lists/${list.id}`)
    } else {
      errorMsg.value = 'Code introuvable. Vérifiez le code partagé par votre proche.'
    }
  } catch (err: any) {
    errorMsg.value = err?.message || 'Erreur lors de la recherche de la liste.'
  } finally {
    isSubmitting.value = false
  }
}

function selectQuickCode(code: string) {
  inviteCode.value = code
  handleSubmit()
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-modal-title"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      />

      <!-- Dialog Card -->
      <div
        class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-elevated border border-slate-200 dark:border-slate-800 p-6 sm:p-8 z-10 my-auto"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <QrCode class="w-5 h-5" />
            </div>
            <div>
              <h3 id="qr-scanner-modal-title" class="text-lg font-bold font-display text-slate-900 dark:text-white">
                Rejoindre une liste
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Via code d'invitation ou QR code</p>
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

        <!-- Form for invite code -->
        <form @submit.prevent="handleSubmit" class="space-y-4 mb-5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Code de la liste
            </label>
            <input
              v-model="inviteCode"
              type="text"
              placeholder="Ex: NOEL-2026-FAM"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs uppercase placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              autofocus
            />
            <p v-if="errorMsg" class="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">{{ errorMsg }}</p>
          </div>

          <button
            type="submit"
            :disabled="!inviteCode.trim() || isSubmitting"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors active:scale-98"
          >
            <span>{{ isSubmitting ? 'Connexion...' : 'Accéder à la liste' }}</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </form>

        <!-- Suggested family lists -->
        <div v-if="lists && lists.length > 0" class="pt-4 border-t border-slate-100 dark:border-slate-800">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            Vos listes actives :
          </p>
          <div class="space-y-1.5 max-h-48 overflow-y-auto">
            <button
              v-for="l in lists"
              :key="l.id"
              type="button"
              @click="selectQuickCode(l.inviteCode)"
              class="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-base">{{ l.coverEmoji || '🎁' }}</span>
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400">{{ l.title }}</div>
                  <div class="text-[10px] text-slate-400 truncate">Par {{ l.ownerName }} • Code: {{ l.inviteCode }}</div>
                </div>
              </div>
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">Ouvrir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
