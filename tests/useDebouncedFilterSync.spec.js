/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'

describe('useDebouncedFilterSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('retries a pending load after an in-flight request finishes', async () => {
    const local = ref('')
    const store = ref('')
    let resolveLoad
    const loadFn = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve
        })
    )
    const isComponentMounted = ref(true)

    useDebouncedFilterSync({
      filters: [{ local, store }],
      loadFn,
      isComponentMounted,
      debounceMs: 200
    })

    local.value = 'first'
    await nextTick()
    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(loadFn).toHaveBeenCalledTimes(1)

    local.value = 'second'
    await nextTick()
    expect(store.value).toBe('second')

    resolveLoad()
    await flushPromises()

    vi.advanceTimersByTime(200)
    await flushPromises()

    expect(loadFn).toHaveBeenCalledTimes(2)
  })
})
