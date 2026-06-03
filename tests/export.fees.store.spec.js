// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useExportFeesStore } from '@/stores/export.fees.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('export fees store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches fees from API', async () => {
    const mockFees = [{ id: 1, code: '1000000000', description: 'Test', fee: 5.5 }]
    fetchWrapper.get.mockResolvedValue(mockFees)

    const store = useExportFeesStore()
    await store.getAll()

    expect(store.$id).toBe('exportFees')
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/exportfees`)
    expect(store.fees).toEqual(mockFees)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.isInitialized).toBe(true)
  })

  it('stores error and leaves initialization false when fetch fails', async () => {
    const testError = new Error('API error')
    fetchWrapper.get.mockRejectedValue(testError)

    const store = useExportFeesStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/exportfees`)
    expect(store.fees).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
    expect(store.isInitialized).toBe(false)
  })

  it('clears previous error before a new fetch', async () => {
    const store = useExportFeesStore()
    store.error = new Error('old')
    fetchWrapper.get.mockResolvedValue([])

    await store.getAll()

    expect(store.error).toBeNull()
  })

  it('calls update endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})

    const store = useExportFeesStore()
    await store.update()

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/exportfees/update`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.isInitialized).toBe(false)
  })

  it('ensures fees are loaded only once after successful initialization', async () => {
    fetchWrapper.get.mockResolvedValue([{ id: 1, code: '1000000000', fee: 1 }])

    const store = useExportFeesStore()
    await store.ensureLoaded()

    expect(fetchWrapper.get).toHaveBeenCalledOnce()
    fetchWrapper.get.mockClear()

    await store.ensureLoaded()

    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('does not load while already loading', async () => {
    const store = useExportFeesStore()
    store.loading = true

    await store.ensureLoaded()

    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })
})
