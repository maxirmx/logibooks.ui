/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
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

  it('debounces filter changes before calling loadFn', async () => {
    const local = ref('')
    const store = ref('')
    const loadFn = vi.fn().mockResolvedValue()
    const isComponentMounted = ref(true)

    useDebouncedFilterSync({
      filters: [{ local, store }],
      loadFn,
      isComponentMounted,
      debounceMs: 300
    })

    await flushPromises()
    loadFn.mockClear()

    local.value = '1234'
    await nextTick()

    expect(store.value).toBe('1234')
    expect(loadFn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(loadFn).toHaveBeenCalledTimes(1)
  })

  it('retries a pending load after an in-flight request finishes', async () => {
    const local = ref('')
    const store = ref('')
    let resolveLoad
    const loadFn = vi.fn(() => new Promise((resolve) => { resolveLoad = resolve }))
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
