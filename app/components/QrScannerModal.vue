<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { X, QrCode, Camera, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-vue-next'
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
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        @click="emit('close')"
      />

      <!-- Dialog Card -->
      <div
        class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 overflow-hidden z-10 my-auto"
      >
        <!-- Top decorative glow -->
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-gold-400/15 rounded-full blur-3xl pointer-events-none" />

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-glow text-white">
              <QrCode class="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 class="text-xl font-bold font-display text-slate-900 dark:text-white">Rejoindre une liste</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Via QR Code ou code d'invitation</p>
            </div>
          </div>

          <button
            @click="emit('close')"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form for invite code -->
        <form @submit.prevent="handleSubmit" class="space-y-4 mb-6">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Code de la liste ou lien
            </label>
            <div class="relative">
              <input
                v-model="inviteCode"
                type="text"
                placeholder="Ex: NOEL-2026-FAM ou LUCAS-10ANS"
                class="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-mono text-sm tracking-wider uppercase placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                autofocus
              />
            </div>
            <p v-if="errorMsg" class="text-xs text-rose-500 mt-1.5 font-medium">{{ errorMsg }}</p>
          </div>

          <button
            type="submit"
            :disabled="!inviteCode.trim() || isSubmitting"
            class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 text-white font-semibold text-sm shadow-glow transition-all active:scale-[0.99]"
          >
            <span>{{ isSubmitting ? 'Connexion à la liste...' : 'Accéder à la liste' }}</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </form>

        <!-- Suggested public family lists for fast preview -->
        <div v-if="lists && lists.length > 0" class="pt-4 border-t border-slate-100 dark:border-slate-800">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Listes actives disponibles dans votre cercle :
          </p>
          <div class="space-y-2">
            <button
              v-for="l in lists"
              :key="l.id"
              @click="selectQuickCode(l.inviteCode)"
              class="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900 bg-slate-50/40 dark:bg-slate-800/40 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-left transition-all group"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-lg">{{ l.coverEmoji || '🎁' }}</span>
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-rose-600">{{ l.title }}</div>
                  <div class="text-[10px] text-slate-400 truncate">Par {{ l.ownerName }} • Code: {{ l.inviteCode }}</div>
                </div>
              </div>
              <span class="text-[11px] font-semibold text-rose-500 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-md shrink-0">Rejoindre</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
