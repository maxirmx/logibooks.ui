// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useExportDutiesStore } from '@/stores/export.duties.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('export.duties store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches duties from API', async () => {
    const mockDuties = [{ id: 1, code: '1000000000', description: 'Test', duty: 5.5 }]
    fetchWrapper.get.mockResolvedValue(mockDuties)

    const store = useExportDutiesStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/exportduties`)
    expect(store.duties).toEqual(mockDuties)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.isInitialized).toBe(true)
  })

  it('stores error and leaves initialization false when fetch fails', async () => {
    const testError = new Error('API error')
    fetchWrapper.get.mockRejectedValue(testError)

    const store = useExportDutiesStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/exportduties`)
    expect(store.duties).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
    expect(store.isInitialized).toBe(false)
  })

  it('clears previous error before a new fetch', async () => {
    const store = useExportDutiesStore()
    store.error = new Error('old')
    fetchWrapper.get.mockResolvedValue([])

    await store.getAll()

    expect(store.error).toBeNull()
  })

  it('ensures duties are loaded only once after successful initialization', async () => {
    fetchWrapper.get.mockResolvedValue([{ id: 1, code: '1000000000', duty: 1 }])

    const store = useExportDutiesStore()
    await store.ensureLoaded()

    expect(fetchWrapper.get).toHaveBeenCalledOnce()
    fetchWrapper.get.mockClear()

    await store.ensureLoaded()

    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

  it('does not load while already loading', async () => {
    const store = useExportDutiesStore()
    store.loading = true

    await store.ensureLoaded()

    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })
})
