// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onUnmounted, unref, watch } from 'vue'
import { useParcelChecksStore } from '@/stores/parcel.checks.store.js'

function resolve(value) {
  return typeof value === 'function' ? value() : unref(value)
}

export function useParcelCheckStatusSubscription({
  registerId,
  enabled,
  refresh,
  onUpdates = null
}) {
  const parcelChecksStore = useParcelChecksStore()
  let lifecycleVersion = 0

  const stopWatch = watch(
    () => [Number(resolve(registerId)), Boolean(resolve(enabled))],
    async ([nextRegisterId, isEnabled]) => {
      const version = ++lifecycleVersion
      if (!isEnabled || !Number.isInteger(nextRegisterId) || nextRegisterId <= 0) {
        await parcelChecksStore.stop()
        return
      }

      await parcelChecksStore.start(nextRegisterId, {
        onUpdates,
        onResync: async () => {
          if (version === lifecycleVersion) {
            await refresh?.()
          }
        }
      })
    },
    { immediate: true }
  )

  onUnmounted(() => {
    ++lifecycleVersion
    stopWatch()
    parcelChecksStore.stop().catch(() => {})
  })

  return parcelChecksStore
}
