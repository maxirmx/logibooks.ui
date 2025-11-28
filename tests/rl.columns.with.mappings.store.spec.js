// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRlColumnsWithMappingsStore } from '@/stores/rl.columns.with.mappings.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn(), post: vi.fn(), put: vi.fn() }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

describe('rlColumnsWithMappings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches all columns with mappings from API', async () => {
    const mockData = [{ id: 1, name: 'Column 1' }]
    fetchWrapper.get.mockResolvedValueOnce(mockData)

    const store = useRlColumnsWithMappingsStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/rlcolumnswithmappings`)
    expect(store.columnsWithMappings).toEqual(mockData)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.isInitialized).toBe(true)
  })

  it('stores error when getAll fails', async () => {
    const error = new Error('Network error')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = useRlColumnsWithMappingsStore()

    await expect(store.getAll()).rejects.toThrow('Network error')
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  describe('ensureLoaded', () => {
    it('calls getAll when not initialized and not loading', async () => {
      const mockData = [{ id: 1, name: 'Column 1' }]
      fetchWrapper.get.mockResolvedValueOnce(mockData)
      const store = useRlColumnsWithMappingsStore()

      await store.ensureLoaded()

      expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/rlcolumnswithmappings`)
      expect(store.columnsWithMappings).toEqual(mockData)
    })

    it('skips fetching when already initialized', async () => {
      const store = useRlColumnsWithMappingsStore()
      store.isInitialized = true

      await store.ensureLoaded()

      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })

    it('skips fetching when already loading', async () => {
      const store = useRlColumnsWithMappingsStore()
      store.loading = true

      await store.ensureLoaded()

      expect(fetchWrapper.get).not.toHaveBeenCalled()
    })
  })

  it('retrieves column with mappings by id and supports refresh', async () => {
    const response = { id: 2, name: 'Column 2' }
    fetchWrapper.get.mockResolvedValueOnce(response)

    const store = useRlColumnsWithMappingsStore()
    store.columnWithMappings = { id: 1 }

    await store.getById(2, true)

    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/rlcolumnswithmappings/2`)
    expect(store.columnWithMappings).toEqual(response)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('stores error when getById fails', async () => {
    const error = new Error('Not found')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = useRlColumnsWithMappingsStore()

    await expect(store.getById(1)).rejects.toThrow('Not found')
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('creates new entry and reloads list', async () => {
    const payload = { name: 'New column' }
    const created = { id: 3, ...payload }
    fetchWrapper.post.mockResolvedValueOnce(created)
    fetchWrapper.get.mockResolvedValueOnce([created])

    const store = useRlColumnsWithMappingsStore()
    const result = await store.create(payload)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/rlcolumnswithmappings`, payload)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/rlcolumnswithmappings`)
    expect(result).toEqual(created)
    expect(store.columnsWithMappings).toEqual([created])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('updates entry and reloads list', async () => {
    const payload = { name: 'Updated column' }
    const updated = { id: 5, ...payload }
    fetchWrapper.put.mockResolvedValueOnce(updated)
    fetchWrapper.get.mockResolvedValueOnce([updated])

    const store = useRlColumnsWithMappingsStore()
    const result = await store.update(5, payload)

    expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/rlcolumnswithmappings/5`, payload)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/rlcolumnswithmappings`)
    expect(result).toEqual(updated)
    expect(store.columnsWithMappings).toEqual([updated])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
})
