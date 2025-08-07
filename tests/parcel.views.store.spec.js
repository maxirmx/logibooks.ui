// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

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

  it('adds a parcel view', async () => {
    fetchWrapper.post.mockResolvedValue({})

    const store = useParcelViewsStore()
    await store.add(123)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcelviews`, { id: 123 })
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles error when adding a parcel view', async () => {
    const testError = new Error('API error')
    fetchWrapper.post.mockRejectedValue(testError)

    const store = useParcelViewsStore()
    await store.add(123)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcelviews`, { id: 123 })
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })

  it('retrieves previous parcel view', async () => {
    const mockView = { id: 1 }
    fetchWrapper.put.mockResolvedValue(mockView)

    const store = useParcelViewsStore()
    const result = await store.back()

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/parcelviews`)
    expect(store.prevParcel).toEqual(mockView)
    expect(result).toEqual(mockView)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
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
    await store.back()

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/parcelviews`)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(testError)
  })
})
