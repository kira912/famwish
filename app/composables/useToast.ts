import { ref } from 'vue'

export interface ToastMessage {
  id: string
  title: string
  message?: string
  type: 'success' | 'error' | 'info' | 'festive'
  duration?: number
}

const toasts = ref<ToastMessage[]>([])

export function useToast() {
  function show(toast: Omit<ToastMessage, 'id'>) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? 4000
    }
    toasts.value.push(newToast)

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        remove(id)
      }, newToast.duration)
    }

    return id
  }

  function success(title: string, message?: string) {
    return show({ title, message, type: 'success' })
  }

  function error(title: string, message?: string) {
    return show({ title, message, type: 'error' })
  }

  function info(title: string, message?: string) {
    return show({ title, message, type: 'info' })
  }

  function festive(title: string, message?: string) {
    return show({ title, message, type: 'festive', duration: 5000 })
  }

  function remove(id: string) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index >= 0) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
    festive,
    remove
  }
}
