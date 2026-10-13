<script setup lang="ts">
import { useToast } from '~/composables/useToast'
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-vue-next'

const { toasts, remove } = useToast()
</script>

<template>
  <div
    class="fixed top-4 right-4 z-50 flex flex-col space-y-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    role="region"
    aria-label="Notifications"
  >
    <TransitionGroup
      enter-active-class="transform ease-out duration-250 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-3 scale-95"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95 translate-y-1"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        role="status"
        aria-live="polite"
        class="pointer-events-auto rounded-2xl p-3.5 shadow-card border backdrop-blur-md transition-all flex items-start gap-3 relative overflow-hidden"
        :class="{
          'bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border-rose-200 dark:border-rose-900/60': toast.type === 'festive',
          'bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border-emerald-200 dark:border-emerald-900/60': toast.type === 'success',
          'bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border-red-200 dark:border-red-900/60': toast.type === 'error',
          'bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800': toast.type === 'info'
        }"
      >
        <!-- Icon container -->
        <div
          class="p-2 rounded-xl shrink-0"
          :class="{
            'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400': toast.type === 'festive',
            'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400': toast.type === 'success',
            'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400': toast.type === 'error',
            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300': toast.type === 'info'
          }"
        >
          <Sparkles v-if="toast.type === 'festive'" class="w-4 h-4" />
          <CheckCircle2 v-else-if="toast.type === 'success'" class="w-4 h-4" />
          <AlertCircle v-else-if="toast.type === 'error'" class="w-4 h-4" />
          <Info v-else class="w-4 h-4" />
        </div>

        <div class="flex-1 pr-1 pt-0.5">
          <h4 class="font-semibold text-xs text-slate-900 dark:text-white leading-tight">
            {{ toast.title }}
          </h4>
          <p v-if="toast.message" class="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
            {{ toast.message }}
          </p>
        </div>

        <button
          @click="remove(toast.id)"
          aria-label="Fermer la notification"
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
