<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import {
  X,
  QrCode,
  Camera,
  Keyboard,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Zap,
  ZapOff,
  CheckCircle2,
  Loader2
} from 'lucide-vue-next'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import { useRouter } from 'vue-router'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { joinListByCode, lists } = useWishlists()
const { currentUser } = useAuth()
const router = useRouter()

// UI state
const activeTab = ref<'camera' | 'manual'>('camera')
const inviteCode = ref('')
const isSubmitting = ref(false)
const errorMsg = ref('')
const scannerError = ref('')
const isStartingScanner = ref(false)
const isCameraActive = ref(false)
const scannedSuccess = ref(false)
const hasTorch = ref(false)
const isTorchOn = ref(false)
const availableCameras = ref<{ id: string; label: string }[]>([])
const selectedCameraIndex = ref(0)

// Scanner instance reference
let html5QrCodeScanner: any = null
const scannerElementId = 'qr-camera-stream-reader'

// Clean up scanner instance
async function stopScanner() {
  if (html5QrCodeScanner) {
    try {
      if (html5QrCodeScanner.isScanning) {
        await html5QrCodeScanner.stop()
      }
      html5QrCodeScanner.clear()
    } catch (e) {
      console.warn('Error while stopping scanner:', e)
    } finally {
      html5QrCodeScanner = null
      isCameraActive.value = false
      isStartingScanner.value = false
      isTorchOn.value = false
    }
  }
}

// Start camera scanner
async function startScanner() {
  if (!import.meta.client || !props.isOpen || activeTab.value !== 'camera') return
  
  await stopScanner()
  scannerError.value = ''
  isStartingScanner.value = true

  await nextTick()

  const element = document.getElementById(scannerElementId)
  if (!element) {
    isStartingScanner.value = false
    return
  }

  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    
    // Check available video devices
    try {
      const devices = await Html5Qrcode.getCameras()
      if (devices && devices.length > 0) {
        availableCameras.value = devices
      }
    } catch {
      // Camera list may fail if permissions are not granted yet
    }

    html5QrCodeScanner = new Html5Qrcode(scannerElementId)

    const cameraConfig = availableCameras.value.length > 0
      ? { deviceId: { exact: availableCameras.value[selectedCameraIndex.value]?.id || availableCameras.value[0].id } }
      : { facingMode: 'environment' }

    await html5QrCodeScanner.start(
      cameraConfig,
      {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
          const edgeSize = Math.max(180, Math.floor(minEdge * 0.72))
          return { width: edgeSize, height: edgeSize }
        },
        aspectRatio: 1.0,
      },
      async (decodedText: string) => {
        await handleScannedResult(decodedText)
      },
      () => {
        // Frame parse error - ignore standard frame scan noise
      }
    )

    isCameraActive.value = true
    isStartingScanner.value = false

    // Check if torch/flashlight is supported
    try {
      const capabilities = html5QrCodeScanner.getRunningTrackCapabilities?.()
      if (capabilities && capabilities.torch) {
        hasTorch.value = true
      }
    } catch {
      hasTorch.value = false
    }

  } catch (err: any) {
    console.error('Camera QR scanner init error:', err)
    isStartingScanner.value = false
    isCameraActive.value = false
    
    const errString = String(err?.message || err).toLowerCase()
    if (errString.includes('permission') || errString.includes('notallowed')) {
      scannerError.value = "L'accès à la caméra a été refusé. Veuillez autoriser l'appareil photo dans les paramètres de votre navigateur pour scanner."
    } else if (errString.includes('notfound') || errString.includes('devicesnotfound')) {
      scannerError.value = "Aucune caméra n'a été détectée sur cet appareil."
    } else {
      scannerError.value = "Impossible d'accéder à la caméra. Vérifiez vos autorisations ou utilisez la saisie manuelle."
    }
  }
}

// Switch camera between front/back
async function switchCamera() {
  if (availableCameras.value.length < 2) return
  selectedCameraIndex.value = (selectedCameraIndex.value + 1) % availableCameras.value.length
  await startScanner()
}

// Toggle torch/flash
async function toggleTorch() {
  if (!html5QrCodeScanner || !hasTorch.value) return
  try {
    const nextTorch = !isTorchOn.value
    await html5QrCodeScanner.applyVideoConstraints({
      advanced: [{ torch: nextTorch }]
    })
    isTorchOn.value = nextTorch
  } catch (e) {
    console.warn('Torch toggle not supported:', e)
  }
}

// Extract code from QR text or URL
function extractCodeFromQr(text: string): string {
  const trimmed = text.trim()
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed)
      const codeParam = url.searchParams.get('code')
      if (codeParam) return codeParam.trim()
      
      // If URL is /lists/ID or /join/CODE
      const pathParts = url.pathname.split('/').filter(Boolean)
      if (pathParts.length >= 2 && (pathParts[0] === 'lists' || pathParts[0] === 'join')) {
        return pathParts[1].trim()
      }
    }
  } catch {
    // Not a valid URL, treat as raw code
  }
  return trimmed
}

// Process scanned QR code
async function handleScannedResult(decodedText: string) {
  if (!decodedText || isSubmitting.value || scannedSuccess.value) return
  
  // Haptic feedback
  if (import.meta.client && 'vibrate' in navigator) {
    try {
      navigator.vibrate([40, 30, 40])
    } catch {}
  }

  scannedSuccess.value = true
  const extracted = extractCodeFromQr(decodedText)
  inviteCode.value = extracted

  // Stop scanner before redirecting
  await stopScanner()

  if (!currentUser.value) {
    emit('close')
    router.push(`/join?code=${encodeURIComponent(extracted)}`)
    return
  }

  // Attempt joining list
  isSubmitting.value = true
  errorMsg.value = ''
  try {
    const list = await joinListByCode(extracted, currentUser.value)
    if (list) {
      emit('close')
      router.push(`/lists/${list.id}`)
    } else {
      // Fallback: navigate to join page with code
      emit('close')
      router.push(`/join?code=${encodeURIComponent(extracted)}`)
    }
  } catch {
    emit('close')
    router.push(`/join?code=${encodeURIComponent(extracted)}`)
  } finally {
    isSubmitting.value = false
  }
}

// Manual Form Submit
async function handleSubmit() {
  if (!inviteCode.value.trim()) return
  isSubmitting.value = true
  errorMsg.value = ''

  const extracted = extractCodeFromQr(inviteCode.value.trim())

  if (!currentUser.value) {
    inviteCode.value = ''
    isSubmitting.value = false
    emit('close')
    router.push(`/join?code=${encodeURIComponent(extracted)}`)
    return
  }

  try {
    const list = await joinListByCode(extracted, currentUser.value)
    if (list) {
      inviteCode.value = ''
      emit('close')
      router.push(`/lists/${list.id}`)
    } else {
      // Try to navigate to /join
      emit('close')
      router.push(`/join?code=${encodeURIComponent(extracted)}`)
    }
  } catch (err: any) {
    errorMsg.value = err?.message || 'Erreur lors de la recherche de la liste.'
  } finally {
    isSubmitting.value = false
  }
}

function selectQuickCode(code: string) {
  inviteCode.value = code
  handleSubmit()
}

// Watch modal state & tab
watch(() => props.isOpen, async (open) => {
  if (open) {
    scannedSuccess.value = false
    errorMsg.value = ''
    scannerError.value = ''
    if (activeTab.value === 'camera') {
      await nextTick()
      startScanner()
    }
  } else {
    await stopScanner()
  }
})

watch(activeTab, async (tab) => {
  if (tab === 'camera' && props.isOpen) {
    await startScanner()
  } else {
    await stopScanner()
  }
})

onBeforeUnmount(async () => {
  await stopScanner()
})
</script>

<template>
  <Transition name="modal">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-modal-title"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      />

      <!-- Dialog Card -->
      <div
        class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-elevated border border-slate-200 dark:border-slate-800 p-5 sm:p-7 z-10 my-auto overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <QrCode class="w-5 h-5" />
            </div>
            <div>
              <h3 id="qr-scanner-modal-title" class="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white">
                Rejoindre une liste
              </h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Par scan QR code ou code d'invitation</p>
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

        <!-- Mode Navigation Tabs -->
        <div class="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-4">
          <button
            type="button"
            @click="activeTab = 'camera'"
            class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            :class="activeTab === 'camera'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
          >
            <Camera class="w-4 h-4 text-rose-500" />
            <span>Caméra en direct</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'manual'"
            class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            :class="activeTab === 'manual'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
          >
            <Keyboard class="w-4 h-4 text-slate-500" />
            <span>Saisie manuelle</span>
          </button>
        </div>

        <!-- TAB 1: Camera Scanner -->
        <div v-show="activeTab === 'camera'" class="space-y-3">
          <!-- Viewfinder & Video Box -->
          <div class="relative w-full aspect-square max-h-72 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
            
            <!-- Video Reader Container for html5-qrcode -->
            <div
              :id="scannerElementId"
              class="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            <!-- Loading overlay -->
            <div
              v-if="isStartingScanner && !scannerError"
              class="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white p-4 text-center z-10"
            >
              <Loader2 class="w-8 h-8 text-rose-500 animate-spin" />
              <p class="text-xs font-medium text-slate-200">Ouverture de la caméra...</p>
              <p class="text-[10px] text-slate-400">Veuillez autoriser l'accès à la caméra</p>
            </div>

            <!-- Error overlay -->
            <div
              v-if="scannerError"
              class="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 text-white p-5 text-center z-10"
            >
              <div class="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle class="w-6 h-6" />
              </div>
              <p class="text-xs text-rose-200 leading-relaxed font-medium">{{ scannerError }}</p>
              <div class="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  @click="startScanner"
                  class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors text-white"
                >
                  <RefreshCw class="w-3.5 h-3.5" />
                  <span>Réessayer</span>
                </button>
                <button
                  type="button"
                  @click="activeTab = 'manual'"
                  class="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors"
                >
                  Code manuel
                </button>
              </div>
            </div>

            <!-- Success Overlay -->
            <div
              v-if="scannedSuccess"
              class="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center gap-2 text-white p-4 text-center z-20"
            >
              <CheckCircle2 class="w-12 h-12 text-emerald-400 animate-bounce" />
              <p class="text-sm font-bold text-emerald-200">QR Code détecté !</p>
              <p class="text-xs text-slate-300">Connexion à la liste en cours...</p>
            </div>

            <!-- Viewfinder Target Frame Overlay (shown when camera is active) -->
            <div
              v-if="isCameraActive && !scannedSuccess"
              class="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              <div class="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl border-2 border-white/40">
                <!-- Glowing Corners -->
                <div class="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-rose-500 rounded-tl-lg" />
                <div class="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-rose-500 rounded-tr-lg" />
                <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-rose-500 rounded-bl-lg" />
                <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-rose-500 rounded-br-lg" />

                <!-- Laser scanning beam animation -->
                <div class="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#f43f5e] animate-scan-line" />
              </div>
            </div>

            <!-- Camera Controls (Torch / Switch Camera) -->
            <div
              v-if="isCameraActive"
              class="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 z-10 px-4"
            >
              <!-- Flash/Torch toggle if available -->
              <button
                v-if="hasTorch"
                type="button"
                @click="toggleTorch"
                class="p-2.5 rounded-full backdrop-blur-md transition-colors"
                :class="isTorchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-900/70 text-white hover:bg-slate-800'"
                :title="isTorchOn ? 'Éteindre la lampe' : 'Allumer la lampe'"
                aria-label="Flash / Lampe"
              >
                <Zap v-if="!isTorchOn" class="w-4 h-4" />
                <ZapOff v-else class="w-4 h-4" />
              </button>

              <!-- Switch Camera button if multiple cameras exist -->
              <button
                v-if="availableCameras.length > 1"
                type="button"
                @click="switchCamera"
                class="p-2.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-800 backdrop-blur-md transition-colors"
                title="Changer de caméra"
                aria-label="Changer de caméra"
              >
                <RefreshCw class="w-4 h-4" />
              </button>
            </div>
          </div>

          <p class="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            Pointez votre caméra vers le QR code d'une liste FamWish
          </p>
        </div>

        <!-- TAB 2: Manual Code Entry -->
        <div v-show="activeTab === 'manual'" class="space-y-4">
          <form @submit.prevent="handleSubmit" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Code de la liste ou lien partagé
              </label>
              <input
                v-model="inviteCode"
                type="text"
                placeholder="Ex: NOEL-2026-FAM ou lien https://..."
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs uppercase placeholder:text-slate-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                autofocus
              />
              <p v-if="errorMsg" class="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">
                {{ errorMsg }}
              </p>
            </div>

            <button
              type="submit"
              :disabled="!inviteCode.trim() || isSubmitting"
              class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors active:scale-98"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <template v-else>
                <span>Accéder à la liste</span>
                <ArrowRight class="w-4 h-4" />
              </template>
            </button>
          </form>

          <!-- Quick access to active family lists -->
          <div v-if="lists && lists.length > 0" class="pt-3 border-t border-slate-100 dark:border-slate-800">
            <p class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Vos listes enregistrées :
            </p>
            <div class="space-y-1.5 max-h-40 overflow-y-auto">
              <button
                v-for="l in lists"
                :key="l.id"
                type="button"
                @click="selectQuickCode(l.inviteCode)"
                class="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-base">{{ l.coverEmoji || '🎁' }}</span>
                  <div class="min-w-0">
                    <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400">
                      {{ l.title }}
                    </div>
                    <div class="text-[10px] text-slate-400 truncate">
                      Par {{ l.ownerName }} • Code: {{ l.inviteCode }}
                    </div>
                  </div>
                </div>
                <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                  Ouvrir
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes scan-line-anim {
  0% {
    top: 5%;
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
  100% {
    top: 92%;
    opacity: 0.2;
  }
}

.animate-scan-line {
  animation: scan-line-anim 2.2s ease-in-out infinite alternate;
}
</style>
