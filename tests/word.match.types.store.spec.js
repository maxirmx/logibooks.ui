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
import { useWordMatchTypesStore } from '@/stores/word.match.types.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('word match types store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with defaults', () => {
    const store = useWordMatchTypesStore()
    expect(store.matchTypes).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches match types successfully', async () => {
    const data = [{ id: 1, name: 'Exact' }]
    fetchWrapper.get.mockResolvedValue(data)

    const store = useWordMatchTypesStore()
    await store.fetchMatchTypes()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/stopwords/matchtypes`)
    expect(store.matchTypes).toEqual(data)
    expect(store.matchTypeMap.size).toBe(1)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles fetch error', async () => {
    const err = new Error('fail')
    fetchWrapper.get.mockRejectedValue(err)

    const store = useWordMatchTypesStore()
    await store.fetchMatchTypes()

    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

  it('ensureLoaded loads only once', async () => {
    const data = [{ id: 1, name: 'Exact' }]
    fetchWrapper.get.mockResolvedValue(data)
    const store = useWordMatchTypesStore()

    store.ensureLoaded()
    store.ensureLoaded()
    await Promise.resolve()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it('getName returns name or fallback', async () => {
    const store = useWordMatchTypesStore()
    fetchWrapper.get.mockResolvedValueOnce([{ id: 2, name: 'Partial' }])
    await store.fetchMatchTypes()

    expect(store.getName(2)).toBe('Partial')
    expect(store.getName(5)).toBe('Тип 5')
  })
})
