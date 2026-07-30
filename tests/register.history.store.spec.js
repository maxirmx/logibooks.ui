/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRegisterHistoryStore } from '@/stores/register.history.store.js'

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: mockGet }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:3000/api'
}))

describe('register.history.store.js', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads a paged register history', async () => {
    const response = {
      items: [{ id: 5, registerId: 42, reason: 'Сохранение изменений' }],
      pagination: { totalCount: 7 }
    }
    mockGet.mockResolvedValue(response)
    const store = useRegisterHistoryStore()

    const result = await store.getHistory(42, { page: 2, pageSize: 25 })

    expect(mockGet).toHaveBeenCalledWith(
      'http://localhost:3000/api/registers/42/history?page=2&pageSize=25'
    )
    expect(result).toEqual(response)
    expect(store.items).toEqual(response.items)
    expect(store.totalCount).toBe(7)
    expect(store.loading).toBe(false)
  })

  it('clears stale data and exposes an error when loading fails', async () => {
    const store = useRegisterHistoryStore()
    store.items = [{ id: 1 }]
    store.totalCount = 1
    const error = new Error('Forbidden')
    mockGet.mockRejectedValue(error)

    await expect(store.getHistory(42)).rejects.toThrow('Forbidden')

    expect(store.items).toEqual([])
    expect(store.totalCount).toBe(0)
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })
})
