// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { watch } from 'vue'
import { reportError } from '@/helpers/error.helpers.js'

export function useCustomsReportPolling(target, refresh, onError, { startImmediately = false, canRetry = () => true } = {}) {
  watch(target, (enabled, _, onCleanup) => {
    if (!enabled) return

    let stopped = false
    let timer
    let failed = false

    async function poll() {
      let retry = true
      try {
        await refresh()
        failed = false
      } catch (error) {
        retry = canRetry(error)
        if (stopped) {
          reportError(error, { context: 'customs report polling after disposal' })
        } else if (!failed) {
          failed = true
          onError(error)
        }
      } finally {
        if (!stopped && retry) timer = setTimeout(poll, 2000)
      }
    }

    onCleanup(() => {
      stopped = true
      clearTimeout(timer)
    })
    if (startImmediately) void poll()
    else timer = setTimeout(poll, 2000)
  }, { immediate: true })
}
