// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('customs procedures store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with defaults', () => {
    const store = useCustomsProceduresStore()
    expect(store.procedures).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches procedures successfully', async () => {
    const data = [ { id: 1, title: 'Экспорт' } ]
    fetchWrapper.get.mockResolvedValue(data)

    const store = useCustomsProceduresStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/customsprocedures`)
    expect(store.procedures).toEqual(data)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles fetch error', async () => {
    const err = new Error('err')
    fetchWrapper.get.mockRejectedValue(err)
    const store = useCustomsProceduresStore()
    await store.getAll()
    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

  it('ensureLoaded loads only once', async () => {
    const data = [ { id: 1, title: 'Процедура' } ]
    fetchWrapper.get.mockResolvedValue(data)
    const store = useCustomsProceduresStore()
    store.ensureLoaded()
    store.ensureLoaded()
    await Promise.resolve()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it('getName returns name or fallback', async () => {
    const store = useCustomsProceduresStore()
    fetchWrapper.get.mockResolvedValueOnce([{ id: 3, name: 'Импорт' }])
    await store.getAll()
    expect(store.getName(3)).toBe('Импорт')
    expect(store.getName(7)).toBe('Процедура 7')
  })
})
