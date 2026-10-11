<script setup lang="ts">
import {
  X,
  Download,
  Sparkles,
  Zap,
  Gift,
  WifiOff,
  Share2,
  PlusSquare,
  CheckCircle2,
  Smartphone,
  MoreVertical,
  Laptop
} from 'lucide-vue-next'
import { usePwa } from '~/composables/usePwa'

const {
  showInstallModal,
  isInstalled,
  isInstallable,
  isIos,
  isSafari,
  promptInstall,
  dismissInstall
} = usePwa()

async function handleInstall() {
  if (isInstallable.value) {
    const installed = await promptInstall()
    if (installed) {
      dismissInstall()
    }
  } else {
    dismissInstall()
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
    enter-to-class="opacity-100 translate-y-0 sm:scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 sm:scale-100"
    leave-to-class="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
  >
    <div
      v-if="showInstallModal && !isInstalled"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
      @click.self="dismissInstall"
    >
      <div
        class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-100 dark:border-slate-800 overflow-hidden relative animate-in"
      >
        <!-- Top decorative banner -->
        <div class="relative bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 p-6 text-white text-center overflow-hidden">
          <div class="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div class="absolute -left-8 -bottom-8 w-28 h-28 bg-amber-400/20 rounded-full blur-xl pointer-events-none"></div>

          <!-- Close button -->
          <button
            @click="dismissInstall"
            class="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white/90 hover:text-white transition-colors"
            title="Fermer"
          >
            <X class="w-5 h-5" />
          </button>

          <!-- App Icon with glow -->
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl p-1 mb-3 ring-4 ring-white/30">
            <div class="w-full h-full bg-slate-900 rounded-[12px] flex items-center justify-center">
              <Gift class="w-8 h-8 text-rose-400" />
            </div>
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white mb-1.5">
            <Sparkles class="w-3.5 h-3.5 text-amber-300" />
            <span>Application Gratuite & Sans Téléchargement</span>
          </div>

          <h3 class="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
            Installez FamWish
          </h3>
          <p class="text-xs sm:text-sm text-rose-100 mt-1 max-w-sm mx-auto">
            Accédez à vos listes de Noël et d'anniversaires en 1 clic directement depuis votre écran d'accueil.
          </p>
        </div>

        <!-- Content & Benefits -->
        <div class="p-5 sm:p-6 space-y-4">
          <div class="grid grid-cols-1 gap-2.5">
            <!-- Benefit 1 -->
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Zap class="w-4 h-4" />
              </div>
              <div>
                <p class="text-xs font-bold text-slate-800 dark:text-slate-100">Accès instantané & fluide</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Lancez l'app sans passer par la barre d'adresse de votre navigateur.</p>
              </div>
            </div>

            <!-- Benefit 2 -->
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Gift class="w-4 h-4" />
              </div>
              <div>
                <p class="text-xs font-bold text-slate-800 dark:text-slate-100">Réservations secrètes en direct</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Cochez discrètement les cadeaux achetés pour surprendre vos proches.</p>
              </div>
            </div>

            <!-- Benefit 3 -->
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <WifiOff class="w-4 h-4" />
              </div>
              <div>
                <p class="text-xs font-bold text-slate-800 dark:text-slate-100">Pratique dans les magasins</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Consultez vos listes même quand le réseau mobile est faible.</p>
              </div>
            </div>
          </div>

          <!-- iOS specific instructions -->
          <div v-if="isIos" class="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
            <div class="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
              <Smartphone class="w-4 h-4 text-amber-600" />
              <span>Comment installer sur iPhone / iPad :</span>
            </div>
            <ol class="text-xs text-amber-900/80 dark:text-amber-300/80 space-y-1.5 pl-1">
              <li class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Touchez l'icône <strong>Partager</strong> <Share2 class="inline w-3.5 h-3.5 text-blue-600" /> en bas de Safari</span>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Sélectionnez <strong>Sur l'écran d'accueil</strong> <PlusSquare class="inline w-3.5 h-3.5 text-slate-700 dark:text-slate-300" /></span>
              </li>
              <li class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Touchez <strong>Ajouter</strong> en haut à droite 🎉</span>
              </li>
            </ol>
          </div>

          <!-- Android / Desktop browser instructions when beforeinstallprompt is not direct -->
          <div v-else-if="!isInstallable" class="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
            <div class="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
              <MoreVertical class="w-4 h-4 text-amber-600" />
              <span>Installation rapide :</span>
            </div>
            <p class="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
              Dans le menu de votre navigateur (<strong>⋮</strong> en haut à droite sur Chrome/Android ou l'icône d'installation dans la barre d'adresse sur PC), choisissez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>.
            </p>
          </div>

          <!-- Actions -->
          <div class="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <!-- If installable via native prompt event -->
            <button
              v-if="isInstallable"
              @click="handleInstall"
              class="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Download class="w-4 h-4" />
              <span>Installer l'application en 1 clic</span>
            </button>

            <!-- For iOS or manual guide: Got it button -->
            <button
              v-else
              @click="dismissInstall"
              class="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>J'ai compris !</span>
            </button>

            <!-- Dismiss button -->
            <button
              @click="dismissInstall"
              class="w-full sm:w-auto py-2.5 px-4 rounded-2xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
