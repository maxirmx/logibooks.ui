// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAlertStore } from '@/stores/alert.store.js'
describe('single-position alert store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('expires success messages and supports pause and resume', () => {
    const store = useAlertStore()
    const id = store.success('ok')

    vi.advanceTimersByTime(2000)
    store.pause(id)
    vi.advanceTimersByTime(10000)
    expect(store.alert?.id).toBe(id)

    store.resume(id)
    vi.advanceTimersByTime(2999)
    expect(store.alert?.id).toBe(id)
    vi.advanceTimersByTime(1)
    expect(store.alert).toBeNull()
  })

})
