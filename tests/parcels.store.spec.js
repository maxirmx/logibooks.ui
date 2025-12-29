// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { ParcelApprovalMode } from '@/models/parcel.approval.mode.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    downloadFile: vi.fn()
  }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

// Mock auth store
const mockAuthStore = {
  parcels_page: 1,
  parcels_per_page: 100,
  parcels_sort_by: [{ key: 'id', order: 'asc' }],
  parcels_status: null,
  parcels_check_status_sw: null,
  parcels_check_status_fc: null,
  parcels_tnved: '',
  parcels_number: ''
}

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
}))

describe('parcels store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Reset mock auth store to defaults
    mockAuthStore.parcels_page = 1
    mockAuthStore.parcels_per_page = 100
    mockAuthStore.parcels_sort_by = [{ key: 'id', order: 'asc' }]
    mockAuthStore.parcels_status = null
    mockAuthStore.parcels_check_status_sw = null
    mockAuthStore.parcels_check_status_fc = null
    mockAuthStore.parcels_tnved = ''
    mockAuthStore.parcels_number = ''
  })

  it('fetches data with default parameters from auth store', async () => {
    fetchWrapper.get.mockResolvedValue({
      items: [],
      pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
    })
    const store = useParcelsStore()
    await store.getAll(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=1&page=1&pageSize=100&sortBy=id&sortOrder=asc`
    )
  })

  it('fetches data with custom parameters from auth store', async () => {
    mockAuthStore.parcels_page = 2
    mockAuthStore.parcels_per_page = 50
    mockAuthStore.parcels_sort_by = [{ key: 'tnVed', order: 'desc' }]
    mockAuthStore.parcels_status = 3
    mockAuthStore.parcels_tnved = 'AA'
    
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()
    await store.getAll(2)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=2&page=2&pageSize=50&sortBy=tnVed&sortOrder=desc&statusId=3&tnVed=AA`
    )
  })

  it('fetches data with check status filtering', async () => {
    mockAuthStore.parcels_check_status_sw = 5
    
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()
    await store.getAll(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=1&page=1&pageSize=100&sortBy=id&sortOrder=asc&checkStatusSw=5`
    )
  })

  it('fetches data with both status and check status filtering', async () => {
    mockAuthStore.parcels_status = 2
    mockAuthStore.parcels_check_status_fc = 4
    mockAuthStore.parcels_tnved = 'BB'
    
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()
    await store.getAll(3)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=3&page=1&pageSize=100&sortBy=id&sortOrder=asc&statusId=2&checkStatusFc=4&tnVed=BB`
    )
  })

  it('fetches data with parcel number filtering', async () => {
    mockAuthStore.parcels_number = 'TEST123'
    
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()
    await store.getAll(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=1&page=1&pageSize=100&sortBy=id&sortOrder=asc&number=TEST123`
    )
  })

  it('fetches data with combined tnved and number filtering', async () => {
    mockAuthStore.parcels_tnved = 'AA'
    mockAuthStore.parcels_number = 'OZON456'
    
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()
    await store.getAll(2)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=2&page=1&pageSize=100&sortBy=id&sortOrder=asc&tnVed=AA&number=OZON456`
    )
  })

  it('fetches parcels by number and updates store', async () => {
    mockAuthStore.parcels_number = 'PN-001'
    fetchWrapper.get.mockResolvedValue([{ id: 1, number: 'PN-001' }])
    const store = useParcelsStore()
    await store.getByNumber()
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels/by-number?number=PN-001`
    )
    expect(store.items_bn).toEqual([{ id: 1, number: 'PN-001' }])
    expect(store.loading).toBe(false)
  })

  it('handles getByNumber error', async () => {
    const error = new Error('Failed to fetch parcels by number')
    fetchWrapper.get.mockRejectedValue(error)

    const store = useParcelsStore()
    await expect(store.getByNumber()).rejects.toBe(error)

    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('initializes with default values', () => {
    const store = useParcelsStore()
    expect(store.items).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.totalCount).toBe(0)
    expect(store.hasNextPage).toBe(false)
    expect(store.hasPreviousPage).toBe(false)
  })

  it('fetches order by id', async () => {
    fetchWrapper.get.mockResolvedValue({ id: 5 })
    const store = useParcelsStore()
    await store.getById(5)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/parcels/5`)
    expect(store.item).toEqual({ id: 5 })
  })

  it('handles getById error', async () => {
    const error = new Error('Failed to fetch order')
    fetchWrapper.get.mockRejectedValue(error)
    const store = useParcelsStore()
    await store.getById(5)
    expect(store.item).toEqual({ error })
  })

  it('handles getAll error', async () => {
    const error = new Error('Failed to fetch orders')
    fetchWrapper.get.mockRejectedValue(error)
    const store = useParcelsStore()
    try {
      await store.getAll(1)
    } catch (thrownError) {
      expect(thrownError).toBe(error)
    }
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  describe('update method', () => {
    it('updates order and calls API with correct parameters', async () => {
      fetchWrapper.put.mockResolvedValue({ success: true })

      const store = useParcelsStore()
      const updateData = { statusId: 2, tnVed: 'Updated' }

      const result = await store.update(5, updateData)

      expect(fetchWrapper.put).toHaveBeenCalledWith(
        `${apiUrl}/parcels/5`,
        updateData
      )
      expect(result).toEqual({ success: true })
    })

    it('updates item in store when currently loaded item matches', async () => {
      fetchWrapper.put.mockResolvedValue({ success: true })

      const store = useParcelsStore()
      // Set up current item
      store.item = { id: 5, statusId: 1, tnVed: 'Original' }

      const updateData = { statusId: 2, tnVed: 'Updated' }
      await store.update(5, updateData)

      expect(store.item).toEqual({
        id: 5,
        statusId: 2,
        tnVed: 'Updated'
      })
    })

    it('updates item in items array when it exists', async () => {
      fetchWrapper.put.mockResolvedValue({ success: true })

      const store = useParcelsStore()
      // Set up items array
      store.items = [
        { id: 4, statusId: 1, tnVed: 'Other' },
        { id: 5, statusId: 1, tnVed: 'Original' },
        { id: 6, statusId: 1, tnVed: 'Another' }
      ]

      const updateData = { statusId: 2, tnVed: 'Updated' }
      await store.update(5, updateData)

      expect(store.items[1]).toEqual({
        id: 5,
        statusId: 2,
        tnVed: 'Updated'
      })
      // Check other items weren't affected
      expect(store.items[0]).toEqual({ id: 4, statusId: 1, tnVed: 'Other' })
      expect(store.items[2]).toEqual({ id: 6, statusId: 1, tnVed: 'Another' })
    })

    it('does not update item when loaded item has different id', async () => {
      fetchWrapper.put.mockResolvedValue({ success: true })

      const store = useParcelsStore()
      // Set up current item with different id
      store.item = { id: 7, statusId: 1, tnVed: 'Different' }

      const updateData = { statusId: 2, tnVed: 'Updated' }
      await store.update(5, updateData)

      // Item should remain unchanged
      expect(store.item).toEqual({ id: 7, statusId: 1, tnVed: 'Different' })
    })

    it('propagates errors when API call fails', async () => {
      const errorMessage = 'Failed to update order'
      fetchWrapper.put.mockRejectedValue(new Error(errorMessage))

      const store = useParcelsStore()
      const updateData = { statusId: 2 }

      await expect(store.update(5, updateData)).rejects.toThrow(errorMessage)
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        `${apiUrl}/parcels/5`,
        updateData
      )
    })
  })

  describe('generate methods', () => {
    it('generate calls downloadFile with correct parameters', async () => {
      const store = useParcelsStore()
      
      // Mock fetchWrapper.downloadFile
      fetchWrapper.downloadFile = vi.fn().mockResolvedValue(true)
      
      const result = await store.generate(123)
      
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(`${apiUrl}/parcels/123/generate`, 'IndPost_123.xml')
      expect(result).toBe(true)
    })
    
    it('throws error when generate fails', async () => {
      const store = useParcelsStore()
      const error = new Error('Generation failed')
      
      fetchWrapper.downloadFile = vi.fn().mockRejectedValue(error)
      
      await expect(store.generate(123)).rejects.toThrow('Generation failed')
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(`${apiUrl}/parcels/123/generate`, 'IndPost_123.xml')
    })

  })

  describe('validateSw method', () => {
    it('calls validate-sw endpoint with correct id', async () => {
      fetchWrapper.post.mockResolvedValue(undefined) // 204 No Content

      const store = useParcelsStore()
      const result = await store.validate(789, true)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/789/validate-sw?withSwMatch=0`)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('returns false and sets error when validateSw fails', async () => {
      const error = new Error('Validation failed')
      fetchWrapper.post.mockRejectedValue(error)

      const store = useParcelsStore()
      const result = await store.validate(789, true)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/789/validate-sw?withSwMatch=0`)
      expect(result).toBe(false)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('validateFc method', () => {
    it('calls validate-fc endpoint with correct id', async () => {
      fetchWrapper.post.mockResolvedValue(undefined) // 204 No Content

      const store = useParcelsStore()
      const result = await store.validate(123, false)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/123/validate-fc`)
      expect(result).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(null)
    })

    it('returns false and sets error when validateFc fails', async () => {
      const error = new Error('Validation failed')
      fetchWrapper.post.mockRejectedValue(error)

      const store = useParcelsStore()
      const result = await store.validate(123, false)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/123/validate-fc`)
      expect(result).toBe(false)
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('approve method', () => {
    it('calls approve endpoint with correct id (default approvalMode=SimpleApprove)', async () => {
      fetchWrapper.post.mockResolvedValue(undefined)

      const store = useParcelsStore()
      const result = await store.approve(123)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/123/approve?approveMode=SimpleApprove`)
      expect(result).toBe(true)
    })

    it('calls approve endpoint with explicit SimpleApprove mode', async () => {
      fetchWrapper.post.mockResolvedValue(undefined)

      const store = useParcelsStore()
      const result = await store.approve(123, ParcelApprovalMode.SimpleApprove)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/123/approve?approveMode=SimpleApprove`)
      expect(result).toBe(true)
    })

    it('calls approve endpoint with ApproveWithExcise mode', async () => {
      fetchWrapper.post.mockResolvedValue(undefined)

      const store = useParcelsStore()
      const result = await store.approve(123, ParcelApprovalMode.ApproveWithExcise)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/123/approve?approveMode=ApproveWithExcise`)
      expect(result).toBe(true)
    })

    it('calls approve endpoint with ApproveWithNotification mode', async () => {
      fetchWrapper.post.mockResolvedValue(undefined)

      const store = useParcelsStore()
      const result = await store.approve(123, ParcelApprovalMode.ApproveWithNotification)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/123/approve?approveMode=ApproveWithNotification`)
      expect(result).toBe(true)
    })

    it('throws error when approve fails with default mode', async () => {
      const error = new Error('Approval failed')
      fetchWrapper.post.mockRejectedValue(error)

      const store = useParcelsStore()

      await expect(store.approve(123)).rejects.toThrow('Approval failed')
      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/123/approve?approveMode=SimpleApprove`)
    })

    it('throws error when approve fails with ApproveWithExcise', async () => {
      const error = new Error('Approval with excise failed')
      fetchWrapper.post.mockRejectedValue(error)

      const store = useParcelsStore()

      await expect(store.approve(123, ParcelApprovalMode.ApproveWithExcise)).rejects.toThrow('Approval with excise failed')
      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/123/approve?approveMode=ApproveWithExcise`)
    })
  })

})
