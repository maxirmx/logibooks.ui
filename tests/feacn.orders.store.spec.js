// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn(), put: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('feacn.orders store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches orders from API', async () => {
    const mockOrders = [{ id: 1, title: 'doc', url: 'u' }]
    fetchWrapper.get.mockResolvedValue(mockOrders)

    const store = useFeacnOrdersStore()
    await store.getOrders()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
    expect(store.orders).toEqual(mockOrders)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.isInitialized).toBe(true)
  })

  it('handles error when fetching orders', async () => {
    const testError = new Error('API error')
    fetchWrapper.get.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await expect(store.getOrders()).rejects.toBe(testError)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
    expect(store.orders).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
    expect(store.isInitialized).toBe(false)
  })

  it('fetches prefixes for order', async () => {
    const mockPrefixes = [{ id: 1, code: '1', exceptions: [] }]
    fetchWrapper.get.mockResolvedValue(mockPrefixes)

    const store = useFeacnOrdersStore()
    await store.getPrefixes(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders/1/prefixes`)
    expect(store.prefixes).toEqual(mockPrefixes)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches one order for route-based editing', async () => {
    const mockOrder = {
      id: 7,
      title: 'Order 7',
      scopes: [{ countryIsoNumeric: 643, customsProcedureCode: 10 }]
    }
    fetchWrapper.get.mockResolvedValue(mockOrder)

    const store = useFeacnOrdersStore()
    await expect(store.getById(7)).resolves.toEqual(mockOrder)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders/7`)
    expect(store.order).toEqual(mockOrder)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('rejects when one order cannot be loaded', async () => {
    const error = new Error('order load failed')
    fetchWrapper.get.mockRejectedValue(error)

    const store = useFeacnOrdersStore()
    await expect(store.getById(7)).rejects.toBe(error)

    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('handles error when fetching prefixes', async () => {
    const testError = new Error('API error')
    fetchWrapper.get.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await expect(store.getPrefixes(1)).rejects.toBe(testError)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders/1/prefixes`)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })

  it('clears prefixes when no orderId is provided', async () => {
    const store = useFeacnOrdersStore()
    store.prefixes.value = [{ id: 1 }] // Set some initial value

    await store.getPrefixes(null)

    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.prefixes).toEqual([])
  })

  it('calls update endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.update()

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacnorders/update`)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles error when updating', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await expect(store.update()).rejects.toBe(testError)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/feacnorders/update`)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })

  it('replaces regulatory-order scopes and refreshes orders', async () => {
    const scopes = [{ countryIsoNumeric: 860, customsProcedureCode: 40 }]
    fetchWrapper.put.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([{ id: 9, scopes }])

    const store = useFeacnOrdersStore()
    await store.updateScopes(9, scopes)

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders/9/scopes`, scopes)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
    expect(store.orders).toEqual([{ id: 9, scopes }])
    expect(store.loading).toBe(false)
  })

  it('rejects a regulatory-order scope update without refreshing', async () => {
    const error = new Error('scope update failed')
    fetchWrapper.put.mockRejectedValue(error)

    const store = useFeacnOrdersStore()
    await expect(store.updateScopes(9, [])).rejects.toBe(error)

    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('ensures orders are loaded only once', async () => {
    const mockOrders = [{ id: 1, title: 'doc', url: 'u' }]
    fetchWrapper.get.mockResolvedValue(mockOrders)

    const store = useFeacnOrdersStore()
    await store.ensureLoaded()

    // First call should call getOrders
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
    expect(store.isInitialized).toBe(true)

    // Reset the mock to verify it's not called again
    fetchWrapper.get.mockClear()

    // Second call should not call getOrders since isInitialized is true
    await store.ensureLoaded()
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })

})
