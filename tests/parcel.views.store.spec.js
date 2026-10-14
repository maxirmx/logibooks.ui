// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useParcelViewsStore } from '@/stores/parcel.views.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { post: vi.fn(), put: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('parcel.views store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('handles no content when backing', async () => {
    fetchWrapper.put.mockResolvedValue(undefined)

    const store = useParcelViewsStore()
    const result = await store.back()

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/parcelviews`)
    expect(store.prevParcel).toBeNull()
    expect(result).toBeNull()
  })

  it('handles error when backing', async () => {
    const testError = new Error('API error')
    fetchWrapper.put.mockRejectedValue(testError)

    const store = useParcelViewsStore()
    await expect(store.back()).rejects.toBe(testError)

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/parcelviews`)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })
})
