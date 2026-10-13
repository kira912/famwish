<script setup lang="ts">
import { Home, Plus, QrCode, User } from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

const emit = defineEmits<{
  (e: 'openCreateList'): void
  (e: 'openScanner'): void
}>()

const { currentUser, openAuthModal } = useAuth()
</script>

<template>
  <nav
    class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 pb-safe"
    aria-label="Navigation principale mobile"
  >
    <div class="flex items-center justify-around max-w-md mx-auto">
      <!-- Tab 1: Mes listes -->
      <NuxtLink
        to="/"
        class="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-1 px-2 rounded-xl text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        active-class="text-rose-600 dark:text-rose-400 font-bold"
        aria-label="Voir toutes les listes"
      >
        <Home class="w-5 h-5 mb-0.5" />
        <span>Listes</span>
      </NuxtLink>

      <!-- Center Action Button: Plus -->
      <button
        @click="emit('openCreateList')"
        type="button"
        class="-mt-5 w-12 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-card active:scale-95 transition-transform"
        title="Créer une nouvelle liste"
        aria-label="Créer une nouvelle liste"
      >
        <Plus class="w-6 h-6" />
      </button>

      <!-- Tab 2: Scanner / Rejoindre -->
      <button
        @click="emit('openScanner')"
        type="button"
        class="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-1 px-2 rounded-xl text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        aria-label="Scanner un QR code ou entrer un code"
      >
        <QrCode class="w-5 h-5 mb-0.5" />
        <span>Scanner</span>
      </button>

      <!-- Tab 3: Auth / Profil -->
      <button
        @click="openAuthModal"
        type="button"
        class="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-1 px-2 rounded-xl text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        :aria-label="currentUser ? `Mon profil (${currentUser.name})` : 'Se connecter'"
      >
        <img
          v-if="currentUser"
          :src="currentUser.avatar"
          :alt="currentUser.name"
          class="w-5 h-5 rounded-full object-cover mb-0.5 ring-1 ring-slate-300 dark:ring-slate-700"
        />
        <User v-else class="w-5 h-5 mb-0.5" />
        <span class="max-w-[56px] truncate">{{ currentUser ? currentUser.name.split(' ')[0] : 'Profil' }}</span>
      </button>
    </div>
  </nav>
</template>
