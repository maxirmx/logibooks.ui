// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, watch, onUnmounted, getCurrentInstance } from 'vue'

/**
 * Composable to synchronize local filter refs with store refs and trigger a debounced load function
 * whenever filters change.
 *
 * @param {Object} options - Configuration options.
 * @param {Array<{ local: import('vue').Ref<any>, store?: import('vue').Ref<any> }>} options.filters
 *   Array of filter definitions. Each item should contain:
 *   - `local`: a local `ref` whose value is watched.
 *   - `store` (optional): a `ref` (e.g., from a store) that will be kept in sync with `local`.
 * @param {() => Promise<void> | void} [options.loadFn]
 *   Function that is called to (re)load data when filters change. May be async.
 * @param {import('vue').Ref<boolean>} [options.isComponentMounted]
 *   Optional `ref` indicating whether the component using this composable is currently mounted.
 *   If not provided, the composable assumes the component is mounted.
 * @param {number} [options.debounceMs=500]
 *   Default debounce delay in milliseconds applied to filter changes after the initial load.
 *
 * @returns {{ triggerLoad: (config?: { debounceMs?: number, syncFilters?: boolean }) => void,
 *            executeLoad: () => Promise<void>,
 *            stop: () => void }}
 *   - `triggerLoad`: Manually trigger a (debounced) load, optionally syncing filters first.
 *   - `executeLoad`: Immediately execute the load function, respecting the mounted state and
 *     internal loading / pending-reload logic.
 *   - `stop`: Stop watching filters and clear any pending debounced load.
 *
 * @example
 * import { ref } from 'vue'
 * import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync'
 *
 * const nameFilter = ref('')
 * const nameStoreFilter = ref('')
 *
 * const { triggerLoad, stop } = useDebouncedFilterSync({
 *   filters: [{ local: nameFilter, store: nameStoreFilter }],
 *   loadFn: () => fetchData({ name: nameStoreFilter.value }),
 *   debounceMs: 300
 * })
 */
export function useDebouncedFilterSync({ filters, loadFn, isComponentMounted, debounceMs = 500 }) {
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
