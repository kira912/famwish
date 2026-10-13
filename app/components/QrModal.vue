<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import { X, QrCode, Copy, Check, Share2, Download, MessageCircle } from 'lucide-vue-next'
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
  if (!props.list) return
  const origin = import.meta.client ? window.location.origin : 'https://famwish.app'
  const shareUrl = `${origin}/join?code=${encodeURIComponent(props.list.inviteCode)}`
  try {
    qrDataUrl.value = await QRCode.toDataURL(shareUrl, {
      width: 320,
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

function getShareUrl(): string {
  if (!props.list) return ''
  const origin = import.meta.client ? window.location.origin : 'https://famwish.app'
  return `${origin}/join?code=${encodeURIComponent(props.list.inviteCode)}`
}

function getShareText(): string {
  if (!props.list) return ''
  const url = getShareUrl()
  return `🎁 Découvre ma liste de souhaits "${props.list.title}" sur FamWish !\nRéserve des cadeaux en secret pour garder la surprise : ${url}`
}

async function copyLink() {
  const url = getShareUrl()
  if (!url) return
  if (import.meta.client && navigator.clipboard) {
    await navigator.clipboard.writeText(url)
    isCopied.value = true
    toast.success('Lien copié dans le presse-papiers !')
    setTimeout(() => {
      isCopied.value = false
    }, 2500)
  }
}

function shareViaWhatsApp() {
  if (!props.list) return
  const text = getShareText()
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
  if (import.meta.client) {
    window.open(waUrl, '_blank')
  }
}

async function handleShare() {
  if (!props.list) return
  const url = getShareUrl()
  if (import.meta.client && navigator.share) {
    try {
      await navigator.share({
        title: `Liste de souhaits : ${props.list.title}`,
        text: `Découvre ma liste de souhaits "${props.list.title}" sur FamWish !`,
        url
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
  a.download = `QR-FamWish-${props.list.inviteCode}.png`
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
      aria-labelledby="qr-modal-title"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      />

      <!-- Dialog Card -->
      <div
        class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-elevated border border-slate-200 dark:border-slate-800 p-6 sm:p-8 z-10 my-auto text-center"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <QrCode class="w-4 h-4" />
            </div>
            <h3 id="qr-modal-title" class="text-lg font-bold font-display text-slate-900 dark:text-white">Partager la liste</h3>
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

        <div class="mb-4">
          <span class="text-3xl mb-1 block">{{ list.coverEmoji || '🎁' }}</span>
          <h4 class="text-base font-bold text-slate-900 dark:text-white leading-snug">{{ list.title }}</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Par {{ list.ownerName }}</p>
        </div>

        <!-- QR Code Canvas Display -->
        <div class="p-3 bg-white rounded-2xl shadow-subtle border border-slate-100 inline-block mb-3">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            alt="QR Code d'invitation"
            class="w-44 h-44 sm:w-52 sm:h-52 mx-auto rounded-lg object-contain"
          />
          <div v-else class="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center text-slate-400">
            <span class="text-xs">Génération du code...</span>
          </div>
        </div>

        <!-- Invite Code Pill -->
        <div class="mb-4">
          <span class="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Code direct</span>
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span class="font-mono font-bold text-sm tracking-wider text-slate-900 dark:text-white">{{ list.inviteCode }}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2 mb-2">
          <!-- WhatsApp Button -->
          <button
            @click="shareViaWhatsApp"
            type="button"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
          >
            <MessageCircle class="w-4 h-4 fill-white" />
            <span>Envoyer sur WhatsApp</span>
          </button>

          <div class="grid grid-cols-2 gap-2">
            <button
              @click="copyLink"
              type="button"
              class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors"
            >
              <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-500" />
              <Copy v-else class="w-3.5 h-3.5 text-slate-500" />
              <span>{{ isCopied ? 'Copié !' : 'Copier lien' }}</span>
            </button>

            <button
              @click="handleShare"
              type="button"
              class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors"
            >
              <Share2 class="w-3.5 h-3.5" />
              <span>Autre partage</span>
            </button>
          </div>
        </div>

        <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            @click="downloadQr"
            type="button"
            class="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium inline-flex items-center gap-1.5"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Télécharger l'image du QR code</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
