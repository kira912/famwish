<script setup lang="ts">
import {
  Plus,
  QrCode,
  Download,
  User,
  Sun,
  Moon,
  Gift,
  WifiOff
} from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'
import { usePwa } from '~/composables/usePwa'
import { useTheme } from '~/composables/useTheme'

const emit = defineEmits<{
  (e: 'openCreateList'): void
  (e: 'openScanner'): void
}>()

const { currentUser, openAuthModal } = useAuth()
const { isInstallable, promptInstall, isOnline } = usePwa()
const { isDark, toggleDark } = useTheme()
</script>

<template>
  <header class="sticky top-0 z-40 w-full glass-panel">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
      <!-- Left: Logo & Brand -->
      <NuxtLink to="/" class="flex items-center gap-3 group focus-visible:rounded-2xl" aria-label="Accueil FamWish">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
          <Gift class="w-5 h-5 text-white" />
        </div>
        <div class="flex flex-col">
          <span class="text-xl sm:text-2xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">
            Fam<span class="text-rose-600 dark:text-rose-500">Wish</span>
          </span>
          <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline -mt-1">
            Listes de souhaits de famille & Noël
          </span>
        </div>
      </NuxtLink>

      <!-- Center: Offline Status badge if offline -->
      <div
        v-if="!isOnline"
        role="status"
        class="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-xs font-semibold border border-amber-200 dark:border-amber-900/60"
      >
        <WifiOff class="w-3.5 h-3.5" />
        <span>Mode Hors-Ligne (PWA active)</span>
      </div>

      <!-- Right: Action Buttons & Profile -->
      <div class="flex items-center gap-2 sm:gap-2.5">
        <!-- PWA Install Prompt Button if browser supports it -->
        <button
          v-if="isInstallable"
          @click="promptInstall"
          type="button"
          class="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
        >
          <Download class="w-3.5 h-3.5 text-slate-500" />
          <span>Installer l'app</span>
        </button>

        <!-- Join with QR Code button -->
        <button
          @click="emit('openScanner')"
          type="button"
          class="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-subtle"
          title="Rejoindre une liste via QR code"
          aria-label="Rejoindre ou scanner un code de liste"
        >
          <QrCode class="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span class="hidden md:inline">Rejoindre / Scanner</span>
        </button>

        <!-- Create List Primary CTA -->
        <button
          @click="emit('openCreateList')"
          type="button"
          class="flex items-center gap-1.5 py-2 px-3.5 sm:py-2 sm:px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors active:scale-98"
        >
          <Plus class="w-4 h-4" />
          <span class="hidden sm:inline">Créer une liste</span>
          <span class="sm:hidden">Créer</span>
        </button>

        <!-- Dark mode toggle -->
        <button
          @click="toggleDark"
          type="button"
          class="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          :title="isDark ? 'Passer en mode clair' : 'Passer en mode sombre'"
          :aria-label="isDark ? 'Passer en mode clair' : 'Passer en mode sombre'"
        >
          <Sun v-if="isDark" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4 text-slate-600" />
        </button>

        <!-- User Profile Avatar / Login Button -->
        <button
          @click="openAuthModal"
          type="button"
          class="flex items-center gap-2 p-1 pr-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition-colors shadow-subtle group"
          :aria-label="currentUser ? `Profil de ${currentUser.name}` : 'Se connecter'"
        >
          <img
            v-if="currentUser"
            :src="currentUser.avatar"
            :alt="currentUser.name"
            class="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
          <div
            v-else
            class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400"
          >
            <User class="w-3.5 h-3.5" />
          </div>

          <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[90px] truncate hidden sm:inline">
            {{ currentUser ? currentUser.name.split(' ')[0] : 'Connexion' }}
          </span>
        </button>
      </div>
    </div>
  </header>
</template>
