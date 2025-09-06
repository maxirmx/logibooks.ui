// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('transportation types store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with defaults', () => {
    const store = useTransportationTypesStore()
    expect(store.types).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches types successfully', async () => {
    const data = [ { id: 1, title: 'Авто' } ]
    fetchWrapper.get.mockResolvedValue(data)

    const store = useTransportationTypesStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/transportationtypes`)
    expect(store.types).toEqual(data)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('handles fetch error', async () => {
    const err = new Error('fail')
    fetchWrapper.get.mockRejectedValue(err)

    const store = useTransportationTypesStore()
    await store.getAll()

    expect(store.error).toBe(err)
    expect(store.loading).toBe(false)
  })

  it('ensureLoaded loads only once', async () => {
    const data = [ { id: 1, title: 'Авто' } ]
    fetchWrapper.get.mockResolvedValue(data)
    const store = useTransportationTypesStore()

    store.ensureLoaded()
    store.ensureLoaded()
    await Promise.resolve()

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it('getName returns name or fallback', async () => {
    const store = useTransportationTypesStore()
    fetchWrapper.get.mockResolvedValueOnce([{ id: 2, name: 'Авиа' }])
    await store.getAll()

    expect(store.getName(2)).toBe('Авиа')
    expect(store.getName(5)).toBe('Тип 5')
  })

  it('getDocument returns document or fallback', async () => {
    const store = useTransportationTypesStore()
    fetchWrapper.get.mockResolvedValueOnce([
      { id: 1, name: 'Авто', document: 'Автомобильный транспорт' },
      { id: 2, name: 'Авиа', document: 'Авиационный транспорт' }
    ])
    await store.getAll()

    expect(store.getDocument(1)).toBe('Автомобильный транспорт')
    expect(store.getDocument(2)).toBe('Авиационный транспорт')
    expect(store.getDocument(999)).toBe('[Тип 999]')
  })

  it('getDocument returns fallback when document is missing', async () => {
    const store = useTransportationTypesStore()
    fetchWrapper.get.mockResolvedValueOnce([
      { id: 3, name: 'Морской' } // no document property
    ])
    await store.getAll()

    expect(store.getDocument(3)).toBeUndefined() // Should be undefined when document property is missing
    expect(store.getDocument(999)).toBe('[Тип 999]') // Should be fallback when type doesn't exist
  })

  it('handles empty response from server', async () => {
    const store = useTransportationTypesStore()
    fetchWrapper.get.mockResolvedValueOnce(null)
    await store.getAll()

    expect(store.types).toEqual([])
    expect(store.getName(1)).toBe('Тип 1')
    expect(store.getDocument(1)).toBe('[Тип 1]')
  })

  it('ensureLoaded does not reload when already loaded', async () => {
    const data = [{ id: 1, name: 'Авто', document: 'Автомобильный транспорт' }]
    fetchWrapper.get.mockResolvedValue(data)
    const store = useTransportationTypesStore()

    // First load
    await store.ensureLoaded()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)

    // Add some data to simulate loaded state
    store.types.push({ id: 2, name: 'Test' })

    // Should not load again since types array is not empty
    await store.ensureLoaded()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it('ensureLoaded does not reload when already loading', async () => {
    const data = [{ id: 1, name: 'Авто' }]
    let resolvePromise
    const loadingPromise = new Promise(resolve => {
      resolvePromise = resolve
    })
    
    fetchWrapper.get.mockImplementation(() => loadingPromise)
    const store = useTransportationTypesStore()

    // Start first load
    const firstLoad = store.ensureLoaded()
    
    // Try to load again while first is still in progress
    const secondLoad = store.ensureLoaded()
    
    // Resolve the mock
    resolvePromise(data)
    await firstLoad
    await secondLoad

    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })
})
