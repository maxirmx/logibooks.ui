// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScanJobsStore } from '@/stores/scanjobs.store.js'
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

const mockScanJobs = [
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

const mockScanJob = mockScanJobs[0]

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
    const store = useScanJobsStore()
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
        items: mockScanJobs,
        pagination: {
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
      fetchWrapper.get.mockResolvedValue(paginatedResponse)
      const store = useScanJobsStore()

      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining(`${apiUrl}/scanjobs?`))
      expect(store.items).toEqual(mockScanJobs)
      expect(store.totalCount).toBe(2)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)
      const store = useScanJobsStore()

      await store.getAll()

      expect(store.items).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('getById', () => {
    it('fetches scanjob by id successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockScanJob)
      const store = useScanJobsStore()

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
      const store = useScanJobsStore()

      const result = await store.getById(999)

      expect(result).toBeNull()
      expect(store.scanjob).toBeNull() // scanjob should remain null, not set to { error }
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })

    it('preserves previous scanjob value on fetch error', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockResolvedValueOnce(mockScanJob).mockRejectedValueOnce(error)
      const store = useScanJobsStore()

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
      const store = useScanJobsStore()
      store.items = [...mockScanJobs]

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
      const store = useScanJobsStore()

      await expect(store.create(mockScanJob)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('update', () => {
    it('updates scanjob successfully', async () => {
      fetchWrapper.put.mockResolvedValue({})
      const store = useScanJobsStore()
      store.items = [...mockScanJobs]
      store.scanjob = { ...mockScanJob }

      const updateData = { status: 0, mode: 1 }
      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`, updateData)
      expect(store.items[0]).toEqual({ ...mockScanJobs[0], ...updateData })
      expect(store.scanjob).toEqual({ ...mockScanJob, ...updateData })
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles update error', async () => {
      const error = new Error('Not found')
      fetchWrapper.put.mockRejectedValue(error)
      const store = useScanJobsStore()

      await expect(store.update(999, {})).rejects.toThrow('Not found')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('remove', () => {
    it('removes scanjob successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})
      const store = useScanJobsStore()
      store.items = [...mockScanJobs]

      const result = await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`)
      expect(store.items).not.toContain(mockScanJobs[0])
      expect(store.items.length).toBe(1)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('handles remove error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.delete.mockRejectedValue(error)
      const store = useScanJobsStore()

      await expect(store.remove(1)).rejects.toThrow('Conflict')

      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('ops', () => {
    it('fetches ops successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useScanJobsStore()

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
      const store = useScanJobsStore()

      const result = await store.getOps()

      expect(result).toBeNull()
      expect(store.opsLoading).toBe(false)
      expect(store.opsError).toBe(error)
    })

    it('ensureOpsLoaded only calls ops once', async () => {
      fetchWrapper.get.mockResolvedValue(mockOps)
      const store = useScanJobsStore()

      await store.ensureOpsLoaded()
      await store.ensureOpsLoaded()

      expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/ops`)
      expect(store.ops).toEqual(mockOps)
    })
  })
})
