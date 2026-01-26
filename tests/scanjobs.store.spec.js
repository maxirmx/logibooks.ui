// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
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

const mockScanjobs = [
  {
    id: 1,
    name: 'Сканирование приемки',
    type: 0,
    operation: 1,
    mode: 2,
    status: 3,
    warehouseId: 10
  },
  {
    id: 2,
    name: 'Сканирование отбора',
    type: 1,
    operation: 2,
    mode: 1,
    status: 0,
    warehouseId: 11
  }
]

const mockScanJob = mockScanjobs[0]

const mockOps = {
  types: [{ value: 0, name: 'Тип 1' }],
  operations: [{ value: 1, name: 'Операция 1' }],
  modes: [{ value: 2, name: 'Режим 1' }],
  statuses: [{ value: 3, name: 'Статус 1' }]
}

describe('scanjobs store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useScanjobsStore()
    expect(store.items).toEqual([])
    expect(store.scanjob).toBeNull()
    expect(store.totalCount).toBe(0)
    expect(store.ops).toEqual({
      types: [],
      operations: [],
      modes: [],
      statuses: []
    })
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('getAll', () => {
    it('fetches scanjobs successfully with pagination', async () => {
      const paginatedResponse = {
        items: mockScanjobs,
        pagination: {
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
      fetchWrapper.get.mockResolvedValue(paginatedResponse)
      const store = useScanjobsStore()

      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining(`${apiUrl}/scanjobs?`))
      expect(store.items).toEqual(mockScanjobs)
      expect(store.totalCount).toBe(2)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useScanjobsStore()

      await store.getAll()

      expect(store.items).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('getById', () => {
    it('fetches scanjob by id successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockScanJob)
      const store = useScanjobsStore()

      const result = await store.getById(1)

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`)
      expect(store.scanjob).toEqual(mockScanJob)
      expect(result).toEqual(mockScanJob)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error and returns null', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useScanjobsStore()

      const result = await store.getById(999)

      expect(result).toBeNull()
      expect(store.scanjob).toBeNull() // scanjob should remain null, not set to { error }
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })

    it('preserves previous scanjob value on fetch error', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockResolvedValueOnce(mockScanJob).mockRejectedValueOnce(error)
      const store = useScanjobsStore()

      // First call succeeds
      await store.getById(1)
      expect(store.scanjob).toEqual(mockScanJob)

      // Second call fails - should preserve previous value
      const result = await store.getById(999)
      expect(result).toBeNull()
      expect(store.scanjob).toEqual(mockScanJob) // Previous value preserved
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('create', () => {
    it('creates scanjob successfully', async () => {
      const newScanJob = { ...mockScanJob, id: 3 }
      fetchWrapper.post.mockResolvedValue(newScanJob)
      const store = useScanjobsStore()
      store.items = [...mockScanjobs]

      const result = await store.create(mockScanJob)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/scanjobs`, mockScanJob)
      expect(store.items).toHaveLength(3)
      expect(store.items[2]).toEqual(newScanJob)
      expect(result).toEqual(newScanJob)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles create error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.create(mockScanJob)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('update', () => {
    it('updates scanjob successfully', async () => {
      fetchWrapper.put.mockResolvedValue({})
      const store = useScanjobsStore()
      store.items = [...mockScanjobs]
      store.scanjob = { ...mockScanJob }

      const updateData = { status: 0, mode: 1 }
      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`, updateData)
      expect(store.items[0]).toEqual({ ...mockScanjobs[0], ...updateData })
      expect(store.scanjob).toEqual({ ...mockScanJob, ...updateData })
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles update error', async () => {
      const error = new Error('Not found')
      fetchWrapper.put.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.update(999, {})).rejects.toThrow('Not found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('remove', () => {
    it('removes scanjob successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      const store = useScanjobsStore()
      store.items = [...mockScanjobs]

      const result = await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`)
      expect(store.items).not.toContain(mockScanjobs[0])
      expect(store.items.length).toBe(1)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles remove error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.delete.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.remove(1)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('start', () => {
    it('starts scanjob successfully', async () => {
      fetchWrapper.post.mockResolvedValue({})
      const store = useScanjobsStore()

      const result = await store.start(1)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1/start`)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles start error 403 Forbidden', async () => {
      const error = new Error('403 Forbidden')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.start(1)).rejects.toThrow('403 Forbidden')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })

    it('handles start error 404 Not Found', async () => {
      const error = new Error('404 Not Found')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.start(999)).rejects.toThrow('404 Not Found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('finish', () => {
    it('finishes scanjob successfully', async () => {
      fetchWrapper.post.mockResolvedValue({})
      const store = useScanjobsStore()

      const result = await store.finish(1)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1/finish`)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles finish error 403 Forbidden', async () => {
      const error = new Error('403 Forbidden')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.finish(1)).rejects.toThrow('403 Forbidden')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })

    it('handles finish error 404 Not Found', async () => {
      const error = new Error('404 Not Found')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useScanjobsStore()

      await expect(store.finish(999)).rejects.toThrow('404 Not Found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('ops', () => {
    it('fetches ops successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useScanjobsStore()

      const result = await store.getOps()

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/ops`)
      expect(store.ops).toEqual(mockOps)
      expect(result).toEqual(mockOps)
      expect(store.opsLoading).toBe(false)
      expect(store.opsError).toBeNull()
    })

    it('handles ops error', async () => {
      const error = new Error('Ops error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useScanjobsStore()

      const result = await store.getOps()

      expect(result).toBeNull()
      expect(store.opsLoading).toBe(false)
      expect(store.opsError).toBe(error)
    })

    it('ensureOpsLoaded only calls ops once', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useScanjobsStore()

      await store.ensureOpsLoaded()
      await store.ensureOpsLoaded()

      expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/ops`)
      expect(store.ops).toEqual(mockOps)
    })

    it('getOpsLabel returns matching name and falls back to string when missing', () => {
      const store = useScanjobsStore()

      // set ops to known values
      store.ops = JSON.parse(JSON.stringify(mockOps))

      // matching numeric value
      expect(store.getOpsLabel(store.ops.types, 0)).toBe('Тип 1')
      // matching when value is a string
      expect(store.getOpsLabel(store.ops.operations, '1')).toBe('Операция 1')
      // no match -> stringified fallback
      expect(store.getOpsLabel(store.ops.modes, 999)).toBe('999')
      // null/undefined list -> fallback
      expect(store.getOpsLabel(null, 5)).toBe('5')
    })
  })
})
