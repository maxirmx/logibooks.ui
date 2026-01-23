// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScanJobsStore } from '@/stores/scanjobs.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

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

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: vi.fn()
}))

const mockScanJobs = [
  {
    id: 1,
    name: 'Сканирование посылок',
    type: 0,
    operation: 1,
    mode: 0,
    status: 0,
    warehouseId: 10
  },
  {
    id: 2,
    name: 'Поиск мешков',
    type: 1,
    operation: 2,
    mode: 1,
    status: 1,
    warehouseId: 11
  }
]

const mockScanJob = mockScanJobs[0]

describe('scanjobs store', () => {
  const defaultAuthStore = {
    scanjobs_page: 1,
    scanjobs_per_page: 10,
    scanjobs_sort_by: [{ key: 'id', order: 'asc' }],
    scanjobs_search: ''
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    useAuthStore.mockReturnValue(defaultAuthStore)
  })

  it('initializes with default values', () => {
    const store = useScanJobsStore()
    expect(store.scanJobs).toEqual([])
    expect(store.scanJob).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('getAll', () => {
    it('fetches scan jobs with pagination metadata', async () => {
      const response = {
        items: mockScanJobs,
        pagination: {
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
      fetchWrapper.get.mockResolvedValue(response)

      const store = useScanJobsStore()
      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/scanjobs?page=1&pageSize=10&sortBy=id&sortOrder=asc`
      )
      expect(store.scanJobs).toEqual(mockScanJobs)
      expect(store.totalCount).toBe(2)
      expect(store.hasNextPage).toBe(false)
      expect(store.hasPreviousPage).toBe(false)
    })

    it('fetches scan jobs with search term', async () => {
      useAuthStore.mockReturnValueOnce({
        scanjobs_page: 2,
        scanjobs_per_page: 5,
        scanjobs_sort_by: [{ key: 'name', order: 'desc' }],
        scanjobs_search: 'Поиск'
      })

      fetchWrapper.get.mockResolvedValue({ items: [], pagination: { totalCount: 0 } })

      const store = useScanJobsStore()
      await store.getAll()

      expect(fetchWrapper.get).toHaveBeenCalledWith(
        `${apiUrl}/scanjobs?page=2&pageSize=5&sortBy=name&sortOrder=desc&search=%D0%9F%D0%BE%D0%B8%D1%81%D0%BA`
      )
    })

    it('handles legacy array response', async () => {
      fetchWrapper.get.mockResolvedValue(mockScanJobs)

      const store = useScanJobsStore()
      await store.getAll()

      expect(store.scanJobs).toEqual(mockScanJobs)
      expect(store.totalCount).toBe(2)
    })

    it('handles fetch error', async () => {
      const error = new Error('Network error')
      fetchWrapper.get.mockRejectedValue(error)

      const store = useScanJobsStore()
      await store.getAll()

      expect(store.scanJobs).toEqual([])
      expect(store.totalCount).toBe(0)
      expect(store.error).toBe(error)
    })
  })

  describe('getById', () => {
    it('fetches scan job by id successfully', async () => {
      fetchWrapper.get.mockResolvedValue(mockScanJob)

      const store = useScanJobsStore()
      const result = await store.getById(1)

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`)
      expect(store.scanJob).toEqual(mockScanJob)
      expect(result).toEqual(mockScanJob)
      expect(store.error).toBeNull()
    })

    it('handles fetch error and returns null', async () => {
      const error = new Error('Not found')
      fetchWrapper.get.mockRejectedValue(error)

      const store = useScanJobsStore()
      const result = await store.getById(999)

      expect(result).toBeNull()
      expect(store.error).toBe(error)
    })
  })

  describe('create', () => {
    it('creates scan job successfully', async () => {
      const newScanJob = { ...mockScanJob, id: 3 }
      fetchWrapper.post.mockResolvedValue(newScanJob)

      const store = useScanJobsStore()
      store.scanJobs = [...mockScanJobs]

      const result = await store.create(mockScanJob)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/scanjobs`, mockScanJob)
      expect(store.scanJobs).toHaveLength(3)
      expect(store.scanJobs[2]).toEqual(newScanJob)
      expect(result).toEqual(newScanJob)
    })

    it('handles create error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.post.mockRejectedValue(error)

      const store = useScanJobsStore()
      await expect(store.create(mockScanJob)).rejects.toThrow('Conflict')

      expect(store.error).toBe(error)
    })
  })

  describe('update', () => {
    it('updates scan job successfully', async () => {
      fetchWrapper.put.mockResolvedValue({})

      const store = useScanJobsStore()
      store.scanJobs = [...mockScanJobs]
      store.scanJob = { ...mockScanJob }

      const updateData = { status: 1 }
      const result = await store.update(1, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`, updateData)
      expect(store.scanJobs[0]).toEqual({ ...mockScanJobs[0], ...updateData })
      expect(store.scanJob).toEqual({ ...mockScanJob, ...updateData })
      expect(result).toBe(true)
    })

    it('handles update error', async () => {
      const error = new Error('Not found')
      fetchWrapper.put.mockRejectedValue(error)

      const store = useScanJobsStore()
      await expect(store.update(999, {})).rejects.toThrow('Not found')

      expect(store.error).toBe(error)
    })
  })

  describe('remove', () => {
    it('removes scan job successfully', async () => {
      fetchWrapper.delete.mockResolvedValue({})

      const store = useScanJobsStore()
      store.scanJobs = [...mockScanJobs]

      const result = await store.remove(1)

      expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/scanjobs/1`)
      expect(store.scanJobs).not.toContain(mockScanJobs[0])
      expect(store.scanJobs.length).toBe(1)
      expect(result).toBe(true)
    })

    it('handles remove error', async () => {
      const error = new Error('Conflict')
      fetchWrapper.delete.mockRejectedValue(error)

      const store = useScanJobsStore()
      await expect(store.remove(1)).rejects.toThrow('Conflict')

      expect(store.error).toBe(error)
    })
  })
})
