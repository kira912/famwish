import { ref, computed, onMounted } from 'vue'
import type { UserProfile } from '~/types'

const currentUser = ref<UserProfile | null>(null)
const isAuthModalOpen = ref(false)
const isGoogleLoading = ref(false)

export const DEMO_PROFILES: UserProfile[] = [
  {
    id: 'user-lea',
    name: 'Léa Bernard',
    email: 'lea.bernard@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    joinedListIds: ['list-noel-famille', 'list-anniv-lucas']
  },
  {
    id: 'user-thomas',
    name: 'Thomas Bernard',
    email: 'thomas.bernard@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    joinedListIds: ['list-noel-famille']
  },
  {
    id: 'user-maman',
    name: 'Isabelle (Maman)',
    email: 'maman.isabelle@example.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    joinedListIds: ['list-noel-famille', 'list-anniv-lucas']
  },
  {
    id: 'user-lucas',
    name: 'Lucas 🚀',
    email: 'lucas@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    joinedListIds: ['list-anniv-lucas', 'list-noel-famille']
  }
]

export function useAuth() {
  const isAuthenticated = computed(() => !!currentUser.value)

  function initAuth() {
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem('famwish_user')
        if (stored) {
          currentUser.value = JSON.parse(stored)
        }
      } catch (err) {
        currentUser.value = null
      }
    }
  }

  function setUser(user: UserProfile | null) {
    currentUser.value = user
    if (import.meta.client) {
      if (user) {
        localStorage.setItem('famwish_user', JSON.stringify(user))
      } else {
        localStorage.removeItem('famwish_user')
      }
    }
  }

  function loginAsDemoUser(userId: string) {
    const found = DEMO_PROFILES.find(p => p.id === userId)
    if (found) {
      setUser({ ...found })
      isAuthModalOpen.value = false
    }
  }

  function createCustomUser(name: string, email?: string) {
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: name.trim() || 'Mon Profil',
      email: email?.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@famwish.app`,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      joinedListIds: []
    }
    setUser(newUser)
    isAuthModalOpen.value = false
    return newUser
  }

  function loginWithGoogleCredential(credential: string) {
    try {
      // Decode JWT token from Google Identity Services
      const base64Url = credential.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      const data = JSON.parse(jsonPayload)

      const googleUser: UserProfile = {
        id: `google-${data.sub}`,
        email: data.email,
        name: data.name || data.given_name || 'Utilisateur Google',
        avatar: data.picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.name || 'user')}`,
        joinedListIds: currentUser.value?.joinedListIds || []
      }

      setUser(googleUser)
      isAuthModalOpen.value = false
      return googleUser
    } catch (e) {
      console.error('Failed to parse Google credential', e)
      return null
    }
  }

  function triggerGoogleLogin() {
    isGoogleLoading.value = true
    if (import.meta.client && (window as any).google?.accounts?.id) {
      try {
        const config = useRuntimeConfig()
        const clientId = config.public.googleClientId
        
        ;(window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            isGoogleLoading.value = false
            if (response.credential) {
              loginWithGoogleCredential(response.credential)
            }
          }
        })
        ;(window as any).google.accounts.id.prompt((notification: any) => {
          isGoogleLoading.value = false
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Prompt fallback modal if third-party cookies or sandbox blocks GIS
          }
        })
      } catch (err) {
        isGoogleLoading.value = false
      }
    } else {
      isGoogleLoading.value = false
    }
  }

  function logout() {
    setUser(null)
  }

  function joinListId(listId: string) {
    if (!currentUser.value) return
    if (!currentUser.value.joinedListIds.includes(listId)) {
      currentUser.value.joinedListIds.push(listId)
      setUser({ ...currentUser.value })
    }
  }

  function openAuthModal() {
    isAuthModalOpen.value = true
  }

  function closeAuthModal() {
    isAuthModalOpen.value = false
  }

  return {
    currentUser,
    isAuthenticated,
    isAuthModalOpen,
    isGoogleLoading,
    DEMO_PROFILES,
    initAuth,
    setUser,
    loginAsDemoUser,
    createCustomUser,
    loginWithGoogleCredential,
    triggerGoogleLogin,
    logout,
    joinListId,
    openAuthModal,
    closeAuthModal
  }
}
