// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { effectScope, ref } from 'vue'
import { expect, it, vi } from 'vitest'
import { useCustomsReportPolling } from '@/composables/useCustomsReportPolling.js'

it('reports an in-flight rejection as a diagnostic after its view is disposed', async () => {
  vi.useFakeTimers()
  const scope = effectScope()
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  let rejectRefresh
  const refresh = vi.fn(() => new Promise((_, reject) => { rejectRefresh = reject }))
  const onError = vi.fn()
  try {
    scope.run(() => useCustomsReportPolling(ref(true), refresh, onError))
    await vi.advanceTimersByTimeAsync(2000)
    scope.stop()
    rejectRefresh(new Error('late polling failure'))
    await vi.advanceTimersByTimeAsync(4000)
    expect(refresh).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('[customs report polling after disposal]', new Error('late polling failure'))
  } finally {
    scope.stop()
    consoleError.mockRestore()
    vi.useRealTimers()
  }
})
