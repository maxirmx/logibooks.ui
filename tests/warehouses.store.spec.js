// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

const mockWarehouses = [
  {
    id: 1,
    name: 'Основной склад',
    countryIsoNumeric: 643,
    postalCode: '123456',
    city: 'Москва',
    street: 'ул. Тестовая, д. 1',
    type: 0
  },
  {
    id: 2,
    name: 'Склад сортировки',
    countryIsoNumeric: 840,
    postalCode: '90210',
    city: 'New York',
    street: 'Broadway',
    type: 1
  }
]

const mockWarehouse = mockWarehouses[0]

describe('warehouses store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useWarehousesStore()
    expect(store.warehouses).toEqual([])
    expect(store.warehouse).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('getAll', () => {
    it('fetches warehouses successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockWarehouses)
      const store = useWarehousesStore()

      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/warehouses`)
      expect(store.warehouses).toEqual(mockWarehouses)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useWarehousesStore()

      await store.getAll()

      expect(store.warehouses).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('getById', () => {
    it('fetches warehouse by id successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockWarehouse)
      const store = useWarehousesStore()

      const result = await store.getById(1)

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/warehouses/1`)
      expect(store.warehouse).toEqual(mockWarehouse)
      expect(result).toEqual(mockWarehouse)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error and returns null', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useWarehousesStore()

      const result = await store.getById(999)

      expect(result).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('create', () => {
    it('creates warehouse successfully', async () => {
      const newWarehouse = { ...mockWarehouse, id: 3 }
      fetchWrapper.post.mockResolvedValue(newWarehouse)
      const store = useWarehousesStore()
      store.warehouses = [...mockWarehouses]

      const result = await store.create(mockWarehouse)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/warehouses`, mockWarehouse)
      expect(store.warehouses).toHaveLength(3)
      expect(store.warehouses[2]).toEqual(newWarehouse)
      expect(result).toEqual(newWarehouse)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles create error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useWarehousesStore()

      await expect(store.create(mockWarehouse)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('update', () => {
    it('updates warehouse successfully', async () => {
      fetchWrapper.put.mockResolvedValue({})
      const store = useWarehousesStore()
      store.warehouses = [...mockWarehouses]
      store.warehouse = { ...mockWarehouse }

      const updateData = { city: 'Санкт-Петербург', type: 1 }
      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/warehouses/1`, updateData)
      expect(store.warehouses[0]).toEqual({ ...mockWarehouses[0], ...updateData })
      expect(store.warehouse).toEqual({ ...mockWarehouse, ...updateData })
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles update error', async () => {
      const error = new Error('Not found')
      fetchWrapper.put.mockRejectedValue(error)
      const store = useWarehousesStore()

      await expect(store.update(999, {})).rejects.toThrow('Not found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('remove', () => {
    it('removes warehouse successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      const store = useWarehousesStore()
      store.warehouses = [...mockWarehouses]

      const result = await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/warehouses/1`)
      expect(store.warehouses).not.toContain(mockWarehouses[0])
      expect(store.warehouses.length).toBe(1)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles remove error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.delete.mockRejectedValue(error)
      const store = useWarehousesStore()

      await expect(store.remove(1)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  it('sets loading state during operations', async () => {
    let resolvePromise
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    fetchWrapper.get.mockReturnValue(promise)

    const store = useWarehousesStore()
    const getAllPromise = store.getAll()

    expect(store.loading).toBe(true)

    resolvePromise(mockWarehouses)
    await getAllPromise

    expect(store.loading).toBe(false)
  })
})
