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

  it('stores error and leaves initialization false when fetch fails', async () => {
    const testError = new Error('API error')
    fetchWrapper.get.mockRejectedValue(testError)

    const store = useExportFeesStore()
    await expect(store.getAll()).rejects.toBe(testError)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/exportfees`)
    expect(store.fees).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
    expect(store.isInitialized).toBe(false)
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

})
