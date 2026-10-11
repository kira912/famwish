<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { X, Sparkles, User, LogOut, Check, ArrowRight, ShieldCheck } from 'lucide-vue-next'

const {
  currentUser,
  isAuthModalOpen,
  closeAuthModal,
  loginAsDemoUser,
  createCustomUser,
  triggerGoogleLogin,
  isGoogleLoading,
  DEMO_PROFILES,
  logout
} = useAuth()

const customName = ref('')
const isCreating = ref(false)

function handleCustomCreate() {
  if (!customName.value.trim()) return
  createCustomUser(customName.value)
  customName.value = ''
  isCreating.value = false
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isAuthModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        @click="closeAuthModal"
      />

      <!-- Dialog Card -->
      <div
        class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 overflow-hidden z-10 my-auto"
      >
        <!-- Top decorative glow -->
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-gold-400/15 rounded-full blur-3xl pointer-events-none" />

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-glow text-white">
              <Sparkles class="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 class="text-xl font-bold font-display text-slate-900 dark:text-white">Connexion & Profil</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Partagez et cochez des cadeaux en secret</p>
            </div>
          </div>

          <button
            @click="closeAuthModal"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Current User Info if logged in -->
        <div
          v-if="currentUser"
          class="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <img
              :src="currentUser.avatar"
              :alt="currentUser.name"
              class="w-12 h-12 rounded-full object-cover ring-2 ring-rose-500/30"
            />
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-semibold text-slate-900 dark:text-white">{{ currentUser.name }}</span>
                <span class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Connecté</span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ currentUser.email }}</p>
            </div>
          </div>

          <button
            @click="logout"
            title="Se déconnecter"
            class="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>

        <!-- Google Login Button -->
        <div class="space-y-4 mb-6">
          <button
            @click="triggerGoogleLogin"
            :disabled="isGoogleLoading"
            class="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-white font-medium text-sm transition-all shadow-sm hover:shadow active:scale-[0.99]"
          >
            <!-- Google SVG Icon -->
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{{ currentUser?.id.startsWith('google-') ? 'Reconnecter avec Google' : 'Continuer avec Google' }}</span>
          </button>

          <div class="flex items-center gap-2 text-xs text-slate-400 justify-center">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
            <span>Connexion sécurisée en 1 clic</span>
          </div>
        </div>

        <div class="relative flex items-center justify-center my-6">
          <div class="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span class="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 uppercase tracking-wider font-semibold absolute">
            Ou tester avec un profil famille
          </span>
        </div>

        <!-- Quick Switch Demo Family Profiles -->
        <div class="space-y-2 mb-6">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Passez d'un membre de la famille à l'autre pour tester le secret des réservations :
          </p>

          <div class="grid grid-cols-2 gap-2.5">
            <button
              v-for="profile in DEMO_PROFILES"
              :key="profile.id"
              @click="loginAsDemoUser(profile.id)"
              class="flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all"
              :class="currentUser?.id === profile.id
                ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-slate-900 dark:text-white ring-2 ring-rose-500/20'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'"
            >
              <img
                :src="profile.avatar"
                :alt="profile.name"
                class="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div class="min-w-0 flex-1">
                <div class="text-xs font-semibold truncate">{{ profile.name }}</div>
                <div class="text-[10px] text-slate-400 truncate">{{ profile.id === 'user-lea' ? 'Créateur liste Noël' : 'Membre famille' }}</div>
              </div>
              <Check v-if="currentUser?.id === profile.id" class="w-4 h-4 text-rose-600 shrink-0" />
            </button>
          </div>
        </div>

        <!-- Custom Name Creator -->
        <div v-if="!isCreating" class="pt-2 text-center">
          <button
            @click="isCreating = true"
            class="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>+ Créer un profil avec un prénom personnalisé</span>
          </button>
        </div>

        <form v-else @submit.prevent="handleCustomCreate" class="pt-2 space-y-2">
          <div class="flex gap-2">
            <input
              v-model="customName"
              type="text"
              placeholder="Votre prénom (ex: Mamie Odette)"
              class="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              autofocus
            />
            <button
              type="submit"
              :disabled="!customName.trim()"
              class="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>
