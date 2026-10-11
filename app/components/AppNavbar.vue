<script setup lang="ts">
import { Home, Users, Plus, QrCode, User } from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

const emit = defineEmits<{
  (e: 'openCreateList'): void
  (e: 'openScanner'): void
}>()

const { currentUser, openAuthModal } = useAuth()
</script>

<template>
  <nav class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 pb-safe">
    <div class="flex items-center justify-around max-w-md mx-auto">
      <!-- Tab 1: Mes listes -->
      <NuxtLink
        to="/"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-[10px] font-semibold text-slate-500 hover:text-rose-600 transition-colors"
        active-class="text-rose-600 dark:text-rose-400 font-bold"
      >
        <Home class="w-5 h-5 mb-0.5" />
        <span>Listes</span>
      </NuxtLink>

      <!-- Tab 2: Scanner / Rejoindre -->
      <button
        @click="emit('openScanner')"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-[10px] font-semibold text-slate-500 hover:text-rose-600 transition-colors"
      >
        <QrCode class="w-5 h-5 mb-0.5" />
        <span>Scanner</span>
      </button>

      <!-- Center Action Button: Plus -->
      <button
        @click="emit('openCreateList')"
        class="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 text-white flex items-center justify-center shadow-glow active:scale-90 transition-transform"
        title="Créer une liste"
      >
        <Plus class="w-6 h-6 stroke-[2.5]" />
      </button>

      <!-- Tab 4: Auth / Profil -->
      <button
        @click="openAuthModal"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-[10px] font-semibold text-slate-500 hover:text-rose-600 transition-colors"
      >
        <img
          v-if="currentUser"
          :src="currentUser.avatar"
          :alt="currentUser.name"
          class="w-5 h-5 rounded-full object-cover mb-0.5 ring-1 ring-rose-500"
        />
        <User v-else class="w-5 h-5 mb-0.5" />
        <span>{{ currentUser ? currentUser.name.split(' ')[0] : 'Profil' }}</span>
      </button>
    </div>
  </nav>
</template>
