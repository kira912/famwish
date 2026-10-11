<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import QRCode from 'qrcode'
import {
  X,
  Users,
  Copy,
  Check,
  Share2,
  Download,
  MessageCircle,
  Sparkles,
  QrCode,
  ShieldCheck,
  Gift,
  UserCheck
} from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'
import type { Wishlist } from '~/types'

const props = defineProps<{
  isOpen: boolean
  list: Wishlist | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const toast = useToast()
const qrDataUrl = ref<string>('')
const isCopied = ref(false)
const showQrDetails = ref(false)

const origin = computed(() => {
  return import.meta.client ? window.location.origin : 'https://famwish.app'
})

const shareUrl = computed(() => {
  if (!props.list) return ''
  return `${origin.value}/join?code=${encodeURIComponent(props.list.inviteCode)}`
})

const shareText = computed(() => {
  if (!props.list) return ''
  return `🎄 Rejoins notre liste de souhaits "${props.list.title}" sur FamWish !\nAjoute tes idées cadeaux et réserve ceux des autres en secret :\n👉 ${shareUrl.value}`
})

watch(() => props.isOpen, async (open) => {
  if (open && props.list) {
    await generateQr()
  }
})

watch(() => props.list, async (list) => {
  if (props.isOpen && list) {
    await generateQr()
  }
})

async function generateQr() {
  if (!props.list || !shareUrl.value) return
  try {
    qrDataUrl.value = await QRCode.toDataURL(shareUrl.value, {
      width: 280,
      margin: 2,
      color: {
        dark: '#4f46e5',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error('Failed to generate QR code', err)
  }
}

async function copyLink() {
  if (!shareUrl.value) return
  if (import.meta.client && navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl.value)
    isCopied.value = true
    toast.success('Lien d\'invitation copié !')
    setTimeout(() => {
      isCopied.value = false
    }, 2500)
  }
}

function shareViaWhatsApp() {
  if (!shareText.value) return
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText.value)}`
  if (import.meta.client) {
    window.open(waUrl, '_blank')
  }
}

async function handleNativeShare() {
  if (!props.list || !shareUrl.value) return
  if (import.meta.client && navigator.share) {
    try {
      await navigator.share({
        title: `Invitation : ${props.list.title}`,
        text: shareText.value,
        url: shareUrl.value
      })
    } catch {
      copyLink()
    }
  } else {
    copyLink()
  }
}

function downloadQr() {
  if (!qrDataUrl.value || !props.list) return
  const a = document.createElement('a')
  a.href = qrDataUrl.value
  a.download = `Invitation-FamWish-${props.list.inviteCode}.png`
  a.click()
  toast.success('QR Code téléchargé !')
}
</script>

<template>
  <div
    v-if="isOpen && list"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    @click.self="emit('close')"
  >
    <div
      class="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up max-h-[92vh] flex flex-col"
    >
      <!-- Festive Header Banner -->
      <div class="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 p-6 text-white text-center shrink-0">
        <button
          @click="emit('close')"
          class="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-all"
        >
          <X class="w-5 h-5" />
        </button>

        <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
          💌
        </div>

        <h3 class="text-xl font-black font-display tracking-tight">
          Inviter des proches à rejoindre la liste
        </h3>
        <p class="text-xs text-white/90 mt-1 max-w-sm mx-auto font-medium">
          Partagez cette invitation pour réunir toute la famille sur "{{ list.title }}"
        </p>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-5 overflow-y-auto">
        <!-- 1-Click WhatsApp Direct Share Button -->
        <button
          type="button"
          @click="shareViaWhatsApp"
          class="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all"
        >
          <MessageCircle class="w-5 h-5 fill-current" />
          <span>Envoyer sur le groupe WhatsApp de la famille</span>
        </button>

        <!-- Share Link Bar with Copy -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Lien d'invitation direct
          </label>
          <div class="flex items-center gap-2">
            <div class="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-mono truncate select-all">
              {{ shareUrl }}
            </div>
            <button
              type="button"
              @click="copyLink"
              class="px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
              :class="isCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'"
            >
              <Check v-if="isCopied" class="w-4 h-4" />
              <Copy v-else class="w-4 h-4" />
              <span>{{ isCopied ? 'Copié !' : 'Copier' }}</span>
            </button>
          </div>
        </div>

        <!-- Additional Action Buttons (Native Share & Toggle QR Code) -->
        <div class="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            @click="handleNativeShare"
            class="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Share2 class="w-4 h-4 text-indigo-500" />
            <span>Partager (SMS/Email...)</span>
          </button>

          <button
            type="button"
            @click="showQrDetails = !showQrDetails"
            class="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <QrCode class="w-4 h-4 text-rose-500" />
            <span>{{ showQrDetails ? 'Masquer le QR' : 'Afficher le QR Code' }}</span>
          </button>
        </div>

        <!-- QR Code Section -->
        <div v-if="showQrDetails" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-3 animate-fade-in">
          <div class="inline-block p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
            <img
              v-if="qrDataUrl"
              :src="qrDataUrl"
              alt="QR Code FamWish"
              class="w-48 h-48 mx-auto"
            />
          </div>
          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Scannable directement avec l'appareil photo d'un smartphone
            </p>
            <button
              type="button"
              @click="downloadQr"
              class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Télécharger l'image QR</span>
            </button>
          </div>
        </div>

        <!-- How it works banner for invited members -->
        <div class="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
          <div class="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 text-xs font-bold">
            <Sparkles class="w-4 h-4 text-indigo-500" />
            <span>Comment votre proche rejoint la liste ?</span>
          </div>
          <ul class="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 pl-1">
            <li class="flex items-start gap-1.5">
              <span class="text-indigo-500 font-bold">1.</span>
              <span>Il clique sur votre lien ou scanne le QR code.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <span class="text-indigo-500 font-bold">2.</span>
              <span>Il rejoint en 1 clic <strong>avec Google</strong> ou en <strong>tapant simplement son prénom</strong>.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <span class="text-indigo-500 font-bold">3.</span>
              <span>Il peut aussitôt consulter les idées, ajouter ses souhaits et réserver des cadeaux secrètement !</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
