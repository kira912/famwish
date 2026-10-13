<script setup lang="ts">
import { ref, onMounted, watch, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWishlists } from '~/composables/useWishlists'
import { useAuth } from '~/composables/useAuth'
import {
  Sparkles,
  QrCode,
  ArrowRight,
  Loader2,
  User,
  ShieldCheck,
  Camera
} from 'lucide-vue-next'
import type { Wishlist } from '~/types'

const route = useRoute()
const router = useRouter()
const { joinListByCode } = useWishlists()
const { currentUser, createCustomUser, triggerGoogleLogin, isGoogleLoading } = useAuth()
const openScannerModal = inject<() => void>('openScannerModal', () => {})

const code = ref((route.query.code as string) || '')
const inviteList = ref<Wishlist | null>(null)
const isLoadingPreview = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const guestName = ref('')
const showCustomNameForm = ref(false)

if (code.value) {
  await fetchListPreview(code.value)
}

onMounted(async () => {
  if (code.value && !inviteList.value) {
    await fetchListPreview(code.value)
  }
})

watch(() => route.query.code, async (newCode) => {
  if (newCode && typeof newCode === 'string') {
    code.value = newCode
    await fetchListPreview(newCode)
  }
})

async function fetchListPreview(codeToSearch: string) {
  const cleanCode = codeToSearch.trim()
  if (!cleanCode) return
  isLoadingPreview.value = true
  errorMessage.value = ''
  try {
    const list = await $fetch<Wishlist>(`/api/lists/${encodeURIComponent(cleanCode)}`)
    if (list) {
      inviteList.value = list
    } else {
      errorMessage.value = 'Aucune liste trouvée avec ce code.'
    }
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || 'Code de liste invalide ou inexistant.'
    inviteList.value = null
  } finally {
    isLoadingPreview.value = false
  }
}

async function handleJoinWithCurrentUser() {
  if (!inviteList.value || !currentUser.value) return
  isSubmitting.value = true
  try {
    const joined = await joinListByCode(inviteList.value.inviteCode, currentUser.value)
    if (joined) {
      router.push(`/lists/${joined.id}`)
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Erreur lors de la connexion à la liste.'
  } finally {
    isSubmitting.value = false
  }
}

async function handleJoinWithCustomName() {
  const name = guestName.value.trim()
  if (!name || !inviteList.value) return
  isSubmitting.value = true
  try {
    const newUser = createCustomUser(name)
    const joined = await joinListByCode(inviteList.value.inviteCode, newUser)
    if (joined) {
      router.push(`/lists/${joined.id}`)
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Erreur lors de la connexion.'
  } finally {
    isSubmitting.value = false
  }
}

async function handleGoogleLoginClick() {
  triggerGoogleLogin()
}

watch(currentUser, async (newUser) => {
  if (newUser && inviteList.value && !isSubmitting.value) {
    isSubmitting.value = true
    try {
      const joined = await joinListByCode(inviteList.value.inviteCode, newUser)
      if (joined) {
        router.push(`/lists/${joined.id}`)
      }
    } finally {
      isSubmitting.value = false
    }
  }
})

async function handleCodeSearchSubmit() {
  if (!code.value.trim()) return
  await fetchListPreview(code.value.trim())
}
</script>

<template>
  <div class="min-h-[75vh] flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-elevated relative overflow-hidden">
      <!-- State 1: Loading List Preview -->
      <div v-if="isLoadingPreview" class="text-center py-12 space-y-3">
        <Loader2 class="w-8 h-8 text-rose-600 animate-spin mx-auto" />
        <h2 class="text-lg font-bold font-display text-slate-900 dark:text-white">
          Recherche de la liste...
        </h2>
        <p class="text-xs text-slate-500">Chargement des informations d'invitation</p>
      </div>

      <!-- State 2: Found List Preview -->
      <div v-else-if="inviteList" class="space-y-6">
        <!-- Invitation Header -->
        <div class="text-center space-y-2">
          <div class="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl mx-auto shadow-subtle">
            {{ inviteList.coverEmoji || '🎁' }}
          </div>
          <span class="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
            Invitation Famille
          </span>
          <h1 class="text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            {{ inviteList.title }}
          </h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Créée par <strong class="text-slate-800 dark:text-slate-200">{{ inviteList.ownerName }}</strong>
            • {{ inviteList.items?.length || 0 }} idée(s) de cadeau(x)
          </p>
        </div>

        <!-- If already logged in with currentUser -->
        <div v-if="currentUser && !showCustomNameForm" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div class="flex items-center gap-3">
            <img
              :src="currentUser.avatar"
              :alt="currentUser.name"
              class="w-11 h-11 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {{ currentUser.name }}
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {{ currentUser.email }}
              </div>
            </div>
          </div>

          <button
            type="button"
            @click="handleJoinWithCurrentUser"
            :disabled="isSubmitting"
            class="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <Sparkles v-else class="w-4 h-4" />
            <span>Rejoindre en tant que {{ currentUser.name }}</span>
          </button>

          <div class="text-center pt-0.5">
            <button
              type="button"
              @click="showCustomNameForm = true"
              class="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
            >
              Rejoindre avec un autre prénom
            </button>
          </div>
        </div>

        <!-- Join Choices: Google Login OR First Name Input -->
        <div v-else class="space-y-4">
          <!-- Choice 1: Google Login -->
          <button
            type="button"
            @click="handleGoogleLoginClick"
            :disabled="isGoogleLoading || isSubmitting"
            class="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-white font-semibold text-xs sm:text-sm transition-colors shadow-subtle active:scale-98"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Rejoindre avec Google en 1 clic</span>
          </button>

          <!-- Divider -->
          <div class="relative flex items-center justify-center my-3">
            <div class="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span class="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold absolute">
              OU AVEC UN PRÉNOM
            </span>
          </div>

          <!-- Choice 2: First Name Form -->
          <form @submit.prevent="handleJoinWithCustomName" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Quel est votre prénom ?
              </label>
              <div class="relative">
                <User class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  v-model="guestName"
                  type="text"
                  placeholder="Ex: Papy André, Manon, Sophie..."
                  class="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              :disabled="!guestName.trim() || isSubmitting"
              class="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
              <ArrowRight v-else class="w-4 h-4" />
              <span>Accéder à la liste 🎁</span>
            </button>
          </form>

          <p class="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
            <span>Aucun mot de passe requis • Réservation secrète garantie</span>
          </p>
        </div>
      </div>

      <!-- State 3: Code Search Input -->
      <div v-else class="space-y-6 text-center">
        <div class="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto shadow-subtle">
          <QrCode class="w-7 h-7" />
        </div>

        <div>
          <h2 class="text-xl font-bold font-display text-slate-900 dark:text-white">
            Rejoindre une liste de souhaits
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Entrez le code d'invitation partagé par votre proche :
          </p>
        </div>

        <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900/60">
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleCodeSearchSubmit" class="space-y-3">
          <div>
            <input
              v-model="code"
              type="text"
              placeholder="Ex: NOEL-2026-FAM"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center font-mono font-bold uppercase text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          <button
            type="submit"
            :disabled="!code.trim() || isLoadingPreview"
            class="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Loader2 v-if="isLoadingPreview" class="w-4 h-4 animate-spin" />
            <ArrowRight v-else class="w-4 h-4" />
            <span>Rechercher la liste</span>
          </button>
        </form>

        <div class="relative flex items-center justify-center my-4">
          <div class="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span class="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold absolute">
            OU
          </span>
        </div>

        <button
          type="button"
          @click="openScannerModal"
          class="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors active:scale-98"
        >
          <Camera class="w-4 h-4 text-rose-500" />
          <span>Scanner le QR code avec la caméra</span>
        </button>
      </div>
    </div>
  </div>
</template>
