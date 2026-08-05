// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onUnmounted, unref, watch } from 'vue'
import { useParcelChecksStore } from '@/stores/parcel.checks.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { reportError } from '@/helpers/error.helpers.js'

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
  const alertStore = useAlertStore()
  let lifecycleVersion = 0

  function publishSubscriptionError(error) {
    alertStore.error(error, { fallback: 'Не удалось обновить статусы проверок посылок' })
  }

  async function stopSafely(context) {
    try {
      await parcelChecksStore.stop()
    } catch (error) {
      // Connection cleanup cannot be retried by this component and does not invalidate page data.
      reportError(error, { context })
    }
  }

  const stopWatch = watch(
    () => [Number(resolve(registerId)), Boolean(resolve(enabled))],
    async ([nextRegisterId, isEnabled]) => {
      const version = ++lifecycleVersion
      if (!isEnabled || !Number.isInteger(nextRegisterId) || nextRegisterId <= 0) {
        await stopSafely('parcel check subscription stop')
        return
      }

      try {
        await parcelChecksStore.start(nextRegisterId, {
          onUpdates,
          onError: publishSubscriptionError,
          onResync: async () => {
            if (version === lifecycleVersion) {
              await refresh?.()
            }
          }
        })
      } catch (error) {
        if (version === lifecycleVersion) publishSubscriptionError(error)
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    ++lifecycleVersion
    stopWatch()
    void stopSafely('parcel check subscription cleanup')
  })

  return parcelChecksStore
}
