<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import QRCode from 'qrcode'
import {
  X,
  Copy,
  Check,
  Share2,
  Download,
  MessageCircle,
  QrCode,
  Sparkles
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
  return `🎁 Rejoins notre liste de souhaits "${props.list.title}" sur FamWish !\nAjoute tes idées cadeaux et réserve ceux des autres en secret :\n👉 ${shareUrl.value}`
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
        dark: '#0f172a',
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
  <Transition name="modal">
    <div
      v-if="isOpen && list"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      />

      <div
        class="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-elevated overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl">
              💌
            </div>
            <div>
              <h3 id="invite-modal-title" class="text-lg font-bold font-display text-slate-900 dark:text-white">
                Inviter des proches
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                Partagez l'accès à "{{ list.title }}"
              </p>
            </div>
          </div>

          <button
            @click="emit('close')"
            type="button"
            aria-label="Fermer la boîte de dialogue"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4 overflow-y-auto">
          <!-- WhatsApp 1-Click button -->
          <button
            type="button"
            @click="shareViaWhatsApp"
            class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2.5 transition-colors"
          >
            <MessageCircle class="w-4 h-4 fill-white" />
            <span>Envoyer sur WhatsApp</span>
          </button>

          <!-- Direct Link with Copy -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Lien d'invitation direct
            </label>
            <div class="flex items-center gap-2">
              <div class="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-mono truncate select-all">
                {{ shareUrl }}
              </div>
              <button
                type="button"
                @click="copyLink"
                class="px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                :class="isCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'"
              >
                <Check v-if="isCopied" class="w-3.5 h-3.5" />
                <Copy v-else class="w-3.5 h-3.5" />
                <span>{{ isCopied ? 'Copié !' : 'Copier' }}</span>
              </button>
            </div>
          </div>

          <!-- Secondary Actions -->
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="handleNativeShare"
              class="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Share2 class="w-3.5 h-3.5 text-slate-500" />
              <span>Autre partage (SMS...)</span>
            </button>

            <button
              type="button"
              @click="showQrDetails = !showQrDetails"
              class="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode class="w-3.5 h-3.5 text-rose-500" />
              <span>{{ showQrDetails ? 'Masquer le QR' : 'Afficher le QR code' }}</span>
            </button>
          </div>

          <!-- QR Code Section -->
          <div v-if="showQrDetails" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-3 animate-fade-in">
            <div class="inline-block p-3 rounded-xl bg-white shadow-sm border border-slate-100">
              <img
                v-if="qrDataUrl"
                :src="qrDataUrl"
                alt="QR Code d'invitation"
                class="w-44 h-44 mx-auto rounded-lg object-contain"
              />
            </div>
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Scannable directement avec l'appareil photo d'un smartphone
              </p>
              <button
                type="button"
                @click="downloadQr"
                class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Download class="w-3.5 h-3.5" />
                <span>Télécharger le QR Code</span>
              </button>
            </div>
          </div>

          <!-- How it works guide -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div class="flex items-center gap-1.5 text-slate-900 dark:text-white text-xs font-bold">
              <Sparkles class="w-3.5 h-3.5 text-amber-500" />
              <span>Comment vos proches rejoignent la liste ?</span>
            </div>
            <ul class="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-1">
              <li class="flex items-start gap-1.5">
                <span class="text-rose-500 font-bold">1.</span>
                <span>Ils cliquent sur votre lien ou scannent le QR code.</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-rose-500 font-bold">2.</span>
                <span>Ils se connectent avec Google ou tapent simplement leur prénom.</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-rose-500 font-bold">3.</span>
                <span>Ils peuvent consulter les souhaits, ajouter leurs idées et réserver des cadeaux en secret !</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
