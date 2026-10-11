import { ref } from 'vue'

const isInstallable = ref(false)
const isInstalled = ref(false)
const isOnline = ref(true)
const isIos = ref(false)
const isSafari = ref(false)
const showInstallModal = ref(false)
let deferredPrompt: any = null

const STORAGE_KEY = 'famwish_pwa_install_dismissed'

export function usePwa() {
  function initPwa() {
    if (!import.meta.client) return

    isOnline.value = navigator.onLine
    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })

    // Check iOS / Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    isIos.value = isIosDevice
    isSafari.value = /safari/.test(userAgent) && !/chrome|crios|fxios|edgios/.test(userAgent)

    // Check standalone mode (already installed or opened as standalone PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    if (isStandalone) {
      isInstalled.value = true
      isInstallable.value = false
      showInstallModal.value = false
      return
    }

    // Listen for standard browser install prompt (Chrome, Edge, Android, Desktop)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      isInstallable.value = true
      checkAndShowPrompt()
    })

    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      isInstallable.value = false
      showInstallModal.value = false
      deferredPrompt = null
    })

    // Proactively propose installation when the app is not already installed
    setTimeout(() => {
      checkAndShowPrompt()
    }, 1000)
  }

  function checkAndShowPrompt(force = false) {
    if (!import.meta.client) return
    if (isInstalled.value) return

    if (!force) {
      const dismissed = sessionStorage.getItem(STORAGE_KEY)
      if (dismissed) {
        return
      }
    }

    // Always propose when app is not installed
    showInstallModal.value = true
  }

  async function promptInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        isInstalled.value = true
        isInstallable.value = false
        showInstallModal.value = false
      }
      deferredPrompt = null
      return outcome === 'accepted'
    }
    return false
  }

  function dismissInstall() {
    showInstallModal.value = false
    if (import.meta.client) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
    }
  }

  function openInstallModal() {
    showInstallModal.value = true
  }

  return {
    isInstallable,
    isInstalled,
    isIos,
    isSafari,
    isOnline,
    showInstallModal,
    initPwa,
    promptInstall,
    dismissInstall,
    openInstallModal
  }
}
