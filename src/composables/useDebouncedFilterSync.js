// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, watch, onUnmounted, getCurrentInstance } from 'vue'

export function useDebouncedFilterSync({ filters, loadFn, isComponentMounted, debounceMs = 300 }) {
  const isLoading = ref(false)
  const hasPendingReload = ref(false)
  let loadTimeout = null
  let pendingDebounceDelay = 0
  let isWatcherInitialized = false
  const watcherStops = []

  const isMounted = () => (isComponentMounted ? isComponentMounted.value : true)

  function syncFiltersToStore() {
    filters.forEach(({ local, store }) => {
      if (store) {
        store.value = local.value
      }
    })
  }

  async function executeLoad() {
    if (!isMounted() || isLoading.value) {
      if (isLoading.value) {
        hasPendingReload.value = true
      }
      return
    }

    isLoading.value = true
    try {
      await loadFn?.()
    } finally {
      if (isMounted()) {
        isLoading.value = false
        const shouldReload = hasPendingReload.value
        hasPendingReload.value = false
        if (shouldReload) {
          const delay = pendingDebounceDelay
          pendingDebounceDelay = 0
          triggerLoad({ debounceMs: delay })
        }
      }
    }
  }

  function triggerLoad({ debounceMs: debounceDelay = 0, syncFilters = false } = {}) {
    if (!isMounted()) return

    if (syncFilters) {
      syncFiltersToStore()
    }

    if (loadTimeout) {
      clearTimeout(loadTimeout)
      loadTimeout = null
    }

    if (isLoading.value) {
      hasPendingReload.value = true
      pendingDebounceDelay = debounceDelay
      return
    }

    if (debounceDelay > 0) {
      pendingDebounceDelay = 0
      loadTimeout = setTimeout(() => {
        loadTimeout = null
        triggerLoad()
      }, debounceDelay)
      return
    }

    pendingDebounceDelay = 0
    executeLoad()
  }

  watcherStops.push(
    watch(
      () => filters.map(({ local }) => local.value),
      (newValues, oldValues) => {
        const isSame = Array.isArray(oldValues)
          ? newValues.every((value, index) => value === oldValues[index])
          : false

        if (isWatcherInitialized && isSame) {
          return
        }

        const debounceDelay = isWatcherInitialized ? debounceMs : 0
        triggerLoad({ debounceMs: debounceDelay, syncFilters: true })
        isWatcherInitialized = true
      },
      { immediate: true }
    )
  )

  function stop() {
    watcherStops.forEach((stopWatcher) => stopWatcher())
    watcherStops.length = 0
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      loadTimeout = null
    }
  }

  if (getCurrentInstance()) {
    onUnmounted(stop)
  }

  return {
    triggerLoad,
    executeLoad,
    stop
  }
}
