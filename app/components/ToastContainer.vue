<script setup lang="ts">
import { useToast } from '~/composables/useToast'
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-vue-next'

const { toasts, remove } = useToast()
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col space-y-3 pointer-events-none max-w-sm w-full px-4 sm:px-0">
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4 scale-95"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90 translate-y-1"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-xl transition-all flex items-start gap-3 relative overflow-hidden"
        :class="{
          'bg-rose-500/95 text-white border-rose-400 shadow-glow': toast.type === 'festive',
          'bg-emerald-600/95 text-white border-emerald-500': toast.type === 'success',
          'bg-red-600/95 text-white border-red-500': toast.type === 'error',
          'bg-slate-900/95 text-white border-slate-700': toast.type === 'info'
        }"
      >
        <!-- Icon -->
        <div class="p-1 rounded-xl bg-white/20 shrink-0">
          <Sparkles v-if="toast.type === 'festive'" class="w-5 h-5 text-amber-200 animate-pulse" />
          <CheckCircle2 v-else-if="toast.type === 'success'" class="w-5 h-5 text-emerald-200" />
          <AlertCircle v-else-if="toast.type === 'error'" class="w-5 h-5 text-red-200" />
          <Info v-else class="w-5 h-5 text-slate-300" />
        </div>

        <div class="flex-1 pr-2">
          <h4 class="font-semibold text-sm leading-tight text-white">{{ toast.title }}</h4>
          <p v-if="toast.message" class="text-xs text-white/85 mt-1 leading-snug">{{ toast.message }}</p>
        </div>

        <button
          @click="remove(toast.id)"
          class="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
