<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { X, Sparkles, LogOut, ShieldCheck } from 'lucide-vue-next'

const {
  currentUser,
  isAuthModalOpen,
  closeAuthModal,
  createCustomUser,
  triggerGoogleLogin,
  isGoogleLoading,
  logout
} = useAuth()

const customName = ref('')
const isCreating = ref(false)

function handleCustomCreate() {
  if (!customName.value.trim()) return
  createCustomUser(customName.value.trim())
  customName.value = ''
  isCreating.value = false
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isAuthModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        @click="closeAuthModal"
      />

      <!-- Dialog Card -->
      <div
        class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-elevated border border-slate-200 dark:border-slate-800 p-6 sm:p-8 z-10 my-auto"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Sparkles class="w-5 h-5" />
            </div>
            <div>
              <h3 id="auth-modal-title" class="text-lg font-bold font-display text-slate-900 dark:text-white">
                Connexion & Profil
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Pour gérer vos listes et réserver des cadeaux</p>
            </div>
          </div>

          <button
            @click="closeAuthModal"
            type="button"
            aria-label="Fermer la boîte de dialogue"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Current User Info if logged in -->
        <div
          v-if="currentUser"
          class="mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <img
              :src="currentUser.avatar"
              :alt="currentUser.name"
              class="w-11 h-11 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">{{ currentUser.name }}</span>
                <span class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">Connecté</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ currentUser.email }}</p>
            </div>
          </div>

          <button
            @click="logout"
            type="button"
            title="Se déconnecter"
            aria-label="Se déconnecter"
            class="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>

        <!-- Google Login Button -->
        <div class="space-y-4 mb-5">
          <button
            @click="triggerGoogleLogin"
            :disabled="isGoogleLoading"
            type="button"
            class="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-white font-semibold text-xs sm:text-sm transition-colors shadow-subtle active:scale-98"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{{ currentUser?.id.startsWith('google-') ? 'Changer de compte Google' : 'Continuer avec Google' }}</span>
          </button>

          <div class="flex items-center gap-1.5 text-xs text-slate-500 justify-center">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
            <span>Connexion sécurisée en 1 clic</span>
          </div>
        </div>

        <div class="relative flex items-center justify-center my-4">
          <div class="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span class="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold absolute">
            OU AVEC UN PRÉNOM
          </span>
        </div>

        <!-- Custom Name Creator -->
        <div v-if="!isCreating" class="pt-1 text-center">
          <button
            @click="isCreating = true"
            type="button"
            class="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
          >
            + Utiliser un prénom invité sans compte
          </button>
        </div>

        <form v-else @submit.prevent="handleCustomCreate" class="pt-1 space-y-2">
          <div class="flex gap-2">
            <input
              v-model="customName"
              type="text"
              placeholder="Votre prénom (ex: Tante Claudine)"
              class="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              autofocus
            />
            <button
              type="submit"
              :disabled="!customName.trim()"
              class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>
