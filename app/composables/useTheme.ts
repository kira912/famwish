import { ref, watch } from 'vue'

const THEME_STORAGE_KEY = 'famwish_theme'
const isDark = ref<boolean>(false)
let isInitialized = false

export function useTheme() {
  function initTheme() {
    if (!import.meta.client || isInitialized) return
    isInitialized = true

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'dark') {
        isDark.value = true
      } else if (stored === 'light') {
        isDark.value = false
      } else {
        // Fallback to system preference if user hasn't chosen explicitly
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        isDark.value = prefersDark
      }
    } catch (_) {
      isDark.value = false
    }

    applyTheme(isDark.value)

    // Listen for system preference changes only if user hasn't explicitly set a preference
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
        if (!stored) {
          isDark.value = e.matches
          applyTheme(e.matches)
        }
      })
    } catch (_) {}
  }

  function applyTheme(dark: boolean) {
    if (!import.meta.client) return
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleDark() {
    setDark(!isDark.value)
  }

  function setDark(val: boolean) {
    isDark.value = val
    if (import.meta.client) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, val ? 'dark' : 'light')
      } catch (_) {}
      applyTheme(val)
    }
  }

  return {
    isDark,
    initTheme,
    toggleDark,
    setDark
  }
}
