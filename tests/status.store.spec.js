// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStatusStore } from '@/stores/status.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('status store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchStatus sets versions and exchange rates from API', async () => {
    fetchWrapper.get.mockResolvedValue({
      appVersion: '1.2.3',
      dbVersion: '20240624',
      exchangeRates: {
        rates: [
          { alphabeticCode: 'USD', rate: 92.12, date: '2024-06-24' },
          { alphabeticCode: 'EUR', rate: 101.98, date: '2024-06-24' },
        ]
      },
    })

    const store = useStatusStore()
    await store.fetchStatus()

    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/status/status`
    )
    expect(store.coreVersion).toBe('1.2.3')
    expect(store.dbVersion).toBe('20240624')
    expect(store.exchangeRates).toEqual([
      { alphabeticCode: 'USD', rate: 92.12, date: '2024-06-24' },
      { alphabeticCode: 'EUR', rate: 101.98, date: '2024-06-24' },
    ])
  })

  it('fetchStatus resets exchange rates when API does not return them', async () => {
    fetchWrapper.get.mockResolvedValue({
      appVersion: '2.0.0',
      dbVersion: '20240630',
      exchangeRates: {},
    })

    const store = useStatusStore()
    store.exchangeRates = [
      { alphabeticCode: 'USD', rate: 91.1, date: '2024-06-01' },
    ]

    await store.fetchStatus()

    expect(store.exchangeRates).toEqual([])
  })
})
