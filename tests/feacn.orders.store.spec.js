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
    const scopes = [{ countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'Reason' }]
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

  it('calls enable-for-export endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.enableForExport(3)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/3/enable-for-export`
    )
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles error when enabling order for export', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await expect(store.enableForExport(3)).rejects.toBe(testError)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/3/enable-for-export`
    )
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })

  it('calls disable-for-export endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.disableForExport(4)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/4/disable-for-export`
    )
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles error when disabling order for export', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await expect(store.disableForExport(4)).rejects.toBe(testError)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/4/disable-for-export`
    )
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })

  it('calls enable-for-import endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.enableForImport(7)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/7/enable-for-import`
    )
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('calls disable-for-import endpoint', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.disableForImport(8)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/8/disable-for-import`
    )
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles error when enabling order for import', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await expect(store.enableForImport(7)).rejects.toBe(testError)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/7/enable-for-import`
    )
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })

  it('handles error when disabling order for import', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useFeacnOrdersStore()
    await expect(store.disableForImport(8)).rejects.toBe(testError)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/8/disable-for-import`
    )
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
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

  it('toggleEnabledForExport calls enable-for-export when enabled is true', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.toggleEnabledForExport(5, true)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/5/enable-for-export`
    )
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
  })

  it('toggleEnabledForExport calls disable-for-export when enabled is false', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.toggleEnabledForExport(6, false)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/6/disable-for-export`
    )
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
  })

  it('toggleEnabledForImport calls enable-for-import when enabled is true', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.toggleEnabledForImport(9, true)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/9/enable-for-import`
    )
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
  })

  it('toggleEnabledForImport calls disable-for-import when enabled is false', async () => {
    fetchWrapper.post.mockResolvedValue({})
    fetchWrapper.get.mockResolvedValue([])

    const store = useFeacnOrdersStore()
    await store.toggleEnabledForImport(10, false)

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      `${apiUrl}/feacnorders/orders/10/disable-for-import`
    )
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/feacnorders/orders`)
  })
})
