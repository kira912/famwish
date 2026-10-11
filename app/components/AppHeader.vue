<script setup lang="ts">
import { ref } from 'vue'
import {
  Sparkles,
  Plus,
  QrCode,
  Download,
  User,
  Sun,
  Moon,
  Gift,
  Heart,
  Search,
  WifiOff
} from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'
import { usePwa } from '~/composables/usePwa'

const emit = defineEmits<{
  (e: 'openCreateList'): void
  (e: 'openScanner'): void
}>()

const { currentUser, openAuthModal } = useAuth()
const { isInstallable, isInstalled, isIos, openInstallModal, isOnline } = usePwa()

const isDark = ref(false)

function toggleDarkMode() {
  isDark.value = !isDark.value
  if (import.meta.client) {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}
</script>

<template>
  <header class="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
      <!-- Left: Logo & Brand -->
      <NuxtLink to="/" class="flex items-center gap-2.5 group">
        <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 p-0.5 shadow-glow group-hover:scale-105 transition-transform">
          <div class="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
            <Gift class="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 group-hover:rotate-12 transition-transform" />
          </div>
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5">
            <span class="text-xl sm:text-2xl font-black font-display tracking-tight bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              FamWish
            </span>
            <span class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
              PWA
            </span>
          </div>
          <span class="text-[10px] text-slate-500 dark:text-slate-400 -mt-1 font-medium hidden sm:inline">
            Listes de souhaits secrètes & partagées
          </span>
        </div>
      </NuxtLink>

      <!-- Center: Offline Status badge if offline -->
      <div v-if="!isOnline" class="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
        <WifiOff class="w-3.5 h-3.5" />
        <span>Mode Hors-Ligne (PWA active)</span>
      </div>

      <!-- Right: Action Buttons & Profile -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- PWA Install Prompt Button if available -->
        <button
          v-if="(isInstallable || isIos) && !isInstalled"
          @click="openInstallModal"
          class="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all border border-amber-300/40"
        >
          <Download class="w-3.5 h-3.5" />
          <span>Installer l'App</span>
        </button>

        <!-- Join with QR Code button -->
        <button
          @click="emit('openScanner')"
          class="p-2 sm:px-3 sm:py-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          title="Rejoindre une liste via QR code"
        >
          <QrCode class="w-4 h-4 text-rose-500" />
          <span class="hidden md:inline">Rejoindre / Scanner</span>
        </button>

        <!-- Create List Primary CTA -->
        <button
          @click="emit('openCreateList')"
          class="flex items-center gap-1.5 py-2 px-3 sm:py-2.5 sm:px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white text-xs sm:text-sm font-bold shadow-glow transition-all active:scale-95"
        >
          <Plus class="w-4 h-4" />
          <span class="hidden sm:inline">Créer une liste</span>
          <span class="sm:hidden">Créer</span>
        </button>

        <!-- Dark mode toggle -->
        <button
          @click="toggleDarkMode"
          class="p-2.5 rounded-2xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Changer de thème"
        >
          <Sun v-if="isDark" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4" />
        </button>

        <!-- User Profile Avatar / Login Button -->
        <button
          @click="openAuthModal"
          class="flex items-center gap-2 p-1 pl-1 pr-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 bg-white/80 dark:bg-slate-800/80 transition-all shadow-sm group"
        >
          <img
            v-if="currentUser"
            :src="currentUser.avatar"
            :alt="currentUser.name"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover ring-2 ring-rose-500/20"
          />
          <div v-else class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
            <User class="w-4 h-4" />
          </div>

          <span class="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[80px] sm:max-w-[110px] truncate hidden sm:inline">
            {{ currentUser?.name.split(' ')[0] || 'Connexion' }}
          </span>
        </button>
      </div>
    </div>
  </header>
</template>
