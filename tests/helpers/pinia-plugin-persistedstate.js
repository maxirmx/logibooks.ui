// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export default function piniaPluginPersistedstate({ store, options }) {
  const persist = options?.persist ?? store.$options?.persist ?? {}
  const key = persist.key || store.$id
  const paths = Array.isArray(persist.paths) ? persist.paths : null

  store.$persist = () => {
    const state = paths
      ? paths.reduce((acc, path) => {
          acc[path] = store.$state[path]
          return acc
        }, {})
      : store.$state
    globalThis.localStorage?.setItem(key, JSON.stringify(state))
  }

  store.$hydrate = () => {
    const raw = globalThis.localStorage?.getItem(key)
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      store.$patch(data)
    } catch {
      // ignore malformed persisted data
    }
  }
}
