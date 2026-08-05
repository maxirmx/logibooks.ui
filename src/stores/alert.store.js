// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { defineStore } from 'pinia'
import { readonly, ref } from 'vue'
import { getErrorMessage } from '@/helpers/error.helpers.js'

const DEFAULT_TIMEOUTS = Object.freeze({
  success: 5000,
  info: 5000,
  warning: 10000,
  error: null
})

function normalizeOptions(options) {
  return options && typeof options === 'object' ? options : {}
}

export const useAlertStore = defineStore('alert', () => {
  const alert = ref(null)
  const activePageHosts = ref(0)
  let timer = null
  let nextId = 1

  function stopTimer() {
    if (timer) clearTimeout(timer)
    timer = null
  }

  function startTimer(notification, delay = notification.remaining ?? notification.timeout) {
    stopTimer()
    if (!Number.isFinite(delay) || delay <= 0) return

    notification.remaining = delay
    notification.expiresAt = Date.now() + delay
    timer = setTimeout(() => dismiss(notification.id), delay)
  }

  function publish(severity, value, rawOptions = {}) {
    const options = normalizeOptions(rawOptions)
    const message =
      severity === 'error'
        ? getErrorMessage(value, options.fallback)
        : getErrorMessage(value, options.fallback || 'Сообщение недоступно')
    const title = typeof options.title === 'string' ? options.title.trim() : ''
    const timeout = options.timeout === undefined ? DEFAULT_TIMEOUTS[severity] : options.timeout

    const notification = {
      id: nextId++,
      severity,
      title,
      message,
      timeout,
      remaining: timeout,
      expiresAt: null,
      action: options.action ?? null,
      createdAt: Date.now()
    }

    stopTimer()
    alert.value = notification
    if (Number.isFinite(timeout) && timeout > 0) startTimer(notification, timeout)
    return notification.id
  }

  function success(message, options) {
    return publish('success', message, options)
  }

  function info(message, options) {
    return publish('info', message, options)
  }

  function warning(message, options) {
    return publish('warning', message, options)
  }

  function error(value, options) {
    return publish('error', value, options)
  }

  function dismiss(id) {
    if (!alert.value || (id != null && alert.value.id !== id)) return
    stopTimer()
    alert.value = null
  }

  function clear() {
    stopTimer()
    alert.value = null
  }

  function pause(id) {
    const notification = alert.value
    if (!notification || notification.id !== id || !timer) return

    notification.remaining = Math.max(0, notification.expiresAt - Date.now())
    stopTimer()
  }

  function resume(id) {
    const notification = alert.value
    if (
      !notification ||
      notification.id !== id ||
      !Number.isFinite(notification.remaining) ||
      notification.remaining <= 0
    )
      return
    startTimer(notification, notification.remaining)
  }

  function registerPageHost() {
    activePageHosts.value += 1
  }

  function unregisterPageHost() {
    activePageHosts.value = Math.max(0, activePageHosts.value - 1)
  }

  return {
    alert: readonly(alert),
    activePageHosts: readonly(activePageHosts),
    success,
    info,
    warning,
    error,
    dismiss,
    clear,
    pause,
    resume,
    registerPageHost,
    unregisterPageHost
  }
})
