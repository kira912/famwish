<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useWishlists } from '~/composables/useWishlists'
import { usePwa } from '~/composables/usePwa'
import { useTheme } from '~/composables/useTheme'
import type { Wishlist } from '~/types'

const { initAuth } = useAuth()
const { fetchLists } = useWishlists()
const { initPwa } = usePwa()
const { initTheme } = useTheme()

const isCreateModalOpen = ref(false)
const isScannerModalOpen = ref(false)
const isShareModalOpen = ref(false)
const listToShare = ref<Wishlist | null>(null)

onMounted(async () => {
  initTheme()
  initAuth()
  initPwa()
  await fetchLists()
})

function openCreateList() {
  isCreateModalOpen.value = true
}

function openScanner() {
  isScannerModalOpen.value = true
}

function openShare(list: Wishlist) {
  listToShare.value = list
  isShareModalOpen.value = true
}

// Provide share handler to child components via provide/inject or custom event
provide('openShareModal', openShare)
provide('openCreateListModal', openCreateList)
provide('openScannerModal', openScanner)
</script>

<template>
  <div class="min-h-screen bg-festive-mesh flex flex-col selection:bg-rose-500 selection:text-white">
    <!-- Top Header -->
    <AppHeader
      @open-create-list="openCreateList"
      @open-scanner="openScanner"
    />

    <!-- Main Content Area -->
    <main class="flex-1 pb-24 sm:pb-12">
      <slot />
    </main>

    <!-- Mobile Bottom Navigation -->
    <AppNavbar
      @open-create-list="openCreateList"
      @open-scanner="openScanner"
    />

    <!-- Global Modals -->
    <AuthModal />
    <PwaInstallModal />
    <CreateListModal
      :is-open="isCreateModalOpen"
      @close="isCreateModalOpen = false"
    />
    <QrScannerModal
      :is-open="isScannerModalOpen"
      @close="isScannerModalOpen = false"
    />
    <QrModal
      :is-open="isShareModalOpen"
      :list="listToShare"
      @close="isShareModalOpen = false"
    />

    <!-- Global Toast Notifications -->
    <ToastContainer />
  </div>
</template>
