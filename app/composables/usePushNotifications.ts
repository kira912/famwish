import { ref, computed } from 'vue'
import type { PushSubscriptionRecord, ListNotificationEvent } from '~/types'
import { useAuth } from './useAuth'
import { useToast } from './useToast'

const subscriptionsByList = ref<Record<string, PushSubscriptionRecord | null>>({})
const listSubscribersMap = ref<Record<string, PushSubscriptionRecord[]>>({})
const notificationsByList = ref<Record<string, ListNotificationEvent[]>>({})
const seenNotificationIdsByList = ref<Record<string, string[]>>({})
const permissionState = ref<'default' | 'granted' | 'denied'>('default')
const isSubscribing = ref(false)

function getSeenStorageKey(listId: string, userId?: string): string {
  return `famwish_seen_notifs_${listId}_${userId || 'guest'}`
}

function getDeliveredStorageKey(listId: string, userId?: string): string {
  return `famwish_delivered_push_${listId}_${userId || 'guest'}`
}

function readStoredIds(key: string): Set<string> {
  if (!import.meta.client) return new Set()
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

function writeStoredIds(key: string, ids: Set<string>) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids).slice(-100)))
  } catch {}
}

export function usePushNotifications() {
  const { currentUser, createCustomUser } = useAuth()
  const toast = useToast()

  function syncBrowserPermission() {
    if (!import.meta.client) return
    if ('Notification' in window) {
      permissionState.value = Notification.permission
    }
  }

  async function requestBrowserPermission(): Promise<'default' | 'granted' | 'denied'> {
    if (!import.meta.client) return 'default'
    if (!('Notification' in window)) {
      permissionState.value = 'granted'
      return 'granted'
    }

    if (Notification.permission === 'granted') {
      permissionState.value = 'granted'
      return 'granted'
    }

    try {
      const result = await Promise.race<'default' | 'granted' | 'denied'>([
        Notification.requestPermission(),
        new Promise<'default'>((resolve) => setTimeout(() => resolve('default'), 1200))
      ])
      permissionState.value = result
      return result
    } catch {
      return permissionState.value
    }
  }

  async function extractWebPushEndpoint(): Promise<{
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }> {
    if (!import.meta.client || !('serviceWorker' in navigator)) {
      return {}
    }

    try {
      const registration = await Promise.race([
        navigator.serviceWorker.getRegistration(),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 800))
      ])
      if (!registration || !('pushManager' in registration)) {
        return {}
      }
      const existingSub = await registration.pushManager.getSubscription()
      if (existingSub) {
        const json = existingSub.toJSON()
        return {
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth
          }
        }
      }
    } catch {
      // Fallback to browser/polling push channel when VAPID pushManager is unavailable
    }

    return {}
  }

  async function triggerNativeNotification(notif: ListNotificationEvent) {
    if (!import.meta.client) return

    // 1. Trigger in-app push toast for immediate visual feedback
    toast.festive(notif.title, notif.body)

    // 2. Trigger OS / Browser native notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg && typeof reg.showNotification === 'function') {
            await reg.showNotification(notif.title, {
              body: notif.body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-192x192.png',
              tag: notif.id,
              data: { url: `/lists/${notif.listId}` }
            })
            return
          }
        }
        new Notification(notif.title, {
          body: notif.body,
          icon: '/icons/icon-192x192.png',
          tag: notif.id
        })
      } catch {
        // Ignore if native Notification constructor is restricted on mobile
      }
    }
  }

  async function fetchListNotifications(
    listId: string,
    options: { silent?: boolean } = {}
  ) {
    if (!listId) return null
    syncBrowserPermission()

    const userId = currentUser.value?.id
    const userName = currentUser.value?.name

    try {
      const query: Record<string, string> = {}
      if (userId) query.userId = userId
      if (userName) query.userName = userName

      const data = await $fetch<{
        notifications: ListNotificationEvent[]
        subscriptions: PushSubscriptionRecord[]
        mySubscription: PushSubscriptionRecord | null
      }>(`/api/lists/${encodeURIComponent(listId)}/notifications`, { query })

      if (data) {
        notificationsByList.value[listId] = data.notifications || []
        listSubscribersMap.value[listId] = data.subscriptions || []
        subscriptionsByList.value[listId] = data.mySubscription || null

        if (import.meta.client) {
          const seenKey = getSeenStorageKey(listId, userId)
          const seenSet = readStoredIds(seenKey)
          seenNotificationIdsByList.value[listId] = Array.from(seenSet)

          // Push notifications are enabled by default for all list members
          const isPushActive = data.mySubscription ? data.mySubscription.enabled : true
          if (isPushActive && !options.silent) {
            const deliveredKey = getDeliveredStorageKey(listId, userId)
            const deliveredSet = readStoredIds(deliveredKey)
            let updatedDelivered = false

            // Deliver in chronological order (oldest new first)
            const newEvents = [...(data.notifications || [])]
              .reverse()
              .filter(n => !deliveredSet.has(n.id))

            for (const ev of newEvents) {
              deliveredSet.add(ev.id)
              updatedDelivered = true
              await triggerNativeNotification(ev)
            }

            if (updatedDelivered) {
              writeStoredIds(deliveredKey, deliveredSet)
            }
          }
        }
      }

      return data
    } catch {
      return null
    }
  }

  /**
   * Automatically registers the current member for push notifications on the list
   * by default without requiring any manual configuration.
   */
  async function ensureMemberPushActive(
    listId: string,
    memberNameFallback?: string
  ): Promise<PushSubscriptionRecord | null> {
    if (!listId) return null

    const activeUser = currentUser.value
    const userId = activeUser?.id
    const userName = activeUser?.name || memberNameFallback?.trim()
    if (!userId || !userName) return null

    const existing = subscriptionsByList.value[listId]
    if (existing?.enabled && existing.userId === userId) {
      return existing
    }

    try {
      await requestBrowserPermission()
      const webPushData = await extractWebPushEndpoint()

      const res = await $fetch<{
        success: boolean
        subscription: PushSubscriptionRecord
      }>(`/api/lists/${encodeURIComponent(listId)}/notifications/subscribe`, {
        method: 'POST',
        body: {
          userId,
          userName,
          userAvatar: activeUser?.avatar,
          endpoint: webPushData.endpoint,
          keys: webPushData.keys,
          enabled: true,
          notifyOnAdd: true,
          notifyOnReserve: true
        }
      })

      if (res?.subscription) {
        subscriptionsByList.value[listId] = res.subscription
        return res.subscription
      }
      return null
    } catch {
      return null
    }
  }

  async function subscribeToListPush(
    listId: string,
    preferences: {
      notifyOnAdd?: boolean
      notifyOnReserve?: boolean
      memberNameFallback?: string
    } = {}
  ): Promise<PushSubscriptionRecord | null> {
    if (!listId) return null
    isSubscribing.value = true

    try {
      let activeUser = currentUser.value
      if (!activeUser && preferences.memberNameFallback?.trim()) {
        activeUser = createCustomUser(preferences.memberNameFallback.trim())
      }
      if (!activeUser) {
        activeUser = createCustomUser('Membre Famille')
      }

      await requestBrowserPermission()
      const webPushData = await extractWebPushEndpoint()

      const res = await $fetch<{
        success: boolean
        subscription: PushSubscriptionRecord
      }>(`/api/lists/${encodeURIComponent(listId)}/notifications/subscribe`, {
        method: 'POST',
        body: {
          userId: activeUser.id,
          userName: activeUser.name,
          userAvatar: activeUser.avatar,
          endpoint: webPushData.endpoint,
          keys: webPushData.keys,
          enabled: true,
          notifyOnAdd: preferences.notifyOnAdd ?? true,
          notifyOnReserve: preferences.notifyOnReserve ?? true
        }
      })

      if (res?.subscription) {
        subscriptionsByList.value[listId] = res.subscription
        await fetchListNotifications(listId, { silent: true })
        return res.subscription
      }
      return null
    } catch {
      return null
    } finally {
      isSubscribing.value = false
    }
  }

  function markAllNotificationsAsSeen(listId: string) {
    if (!import.meta.client || !listId) return
    const userId = currentUser.value?.id
    const seenKey = getSeenStorageKey(listId, userId)
    const seenSet = readStoredIds(seenKey)
    const current = notificationsByList.value[listId] || []
    current.forEach(n => seenSet.add(n.id))
    writeStoredIds(seenKey, seenSet)
    seenNotificationIdsByList.value[listId] = Array.from(seenSet)
  }

  function getMySubscription(listId: string) {
    return computed(() => subscriptionsByList.value[listId] || null)
  }

  function getListSubscribers(listId: string) {
    return computed(() => listSubscribersMap.value[listId] || [])
  }

  function getListNotifications(listId: string) {
    return computed(() => notificationsByList.value[listId] || [])
  }

  function getUnreadCount(listId: string) {
    return computed(() => {
      const notifs = notificationsByList.value[listId] || []
      const seen = new Set(seenNotificationIdsByList.value[listId] || [])
      return notifs.filter(n => !seen.has(n.id)).length
    })
  }

  return {
    permissionState,
    isSubscribing,
    syncBrowserPermission,
    requestBrowserPermission,
    fetchListNotifications,
    ensureMemberPushActive,
    subscribeToListPush,
    markAllNotificationsAsSeen,
    getMySubscription,
    getListSubscribers,
    getListNotifications,
    getUnreadCount
  }
}
