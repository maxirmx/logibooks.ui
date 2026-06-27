// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
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
    downloadFile: vi.fn(),
    getFile: vi.fn()
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
  parcels_hide_legacy_restrictions: false,
  parcels_tnved: '',
  parcels_number: '',
  parcels_product_name: '',
  parcels_wh_page: 1,
  parcels_wh_per_page: 100,
  parcels_wh_sort_by: [{ key: 'id', order: 'asc' }],
  parcels_wh_status: null,
  parcels_wh_check_status_projection: null,
  parcels_wh_zone: null,
  parcels_wh_number: '',
  parcels_wh_box_number: '',
  parcels_wh_sticker: '',
  parcels_wh_product_name: ''
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
    mockAuthStore.parcels_hide_legacy_restrictions = false
    mockAuthStore.parcels_tnved = ''
    mockAuthStore.parcels_number = ''
    mockAuthStore.parcels_product_name = ''
    mockAuthStore.parcels_wh_page = 1
    mockAuthStore.parcels_wh_per_page = 100
    mockAuthStore.parcels_wh_sort_by = [{ key: 'id', order: 'asc' }]
    mockAuthStore.parcels_wh_status = null
    mockAuthStore.parcels_wh_check_status_projection = null
    mockAuthStore.parcels_wh_zone = null
    mockAuthStore.parcels_wh_number = ''
    mockAuthStore.parcels_wh_box_number = ''
    mockAuthStore.parcels_wh_sticker = ''
    mockAuthStore.parcels_wh_product_name = ''
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

  it('fetches data from extended endpoint when requested', async () => {
    fetchWrapper.get.mockResolvedValue({
      items: [],
      pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
    })
    const store = useParcelsStore()
    await store.getAll(1, { showMarkedByPartner: true })
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels/a?registerId=1&page=1&pageSize=100&sortBy=id&sortOrder=asc`
    )
  })

  it('fetches warehouse data with warehouse-specific filters only on extended endpoint', async () => {
    mockAuthStore.parcels_status = 99
    mockAuthStore.parcels_number = 'REGULAR-SUBSTRING'
    mockAuthStore.parcels_product_name = 'Regular product'
    mockAuthStore.parcels_wh_status = 3
    mockAuthStore.parcels_wh_check_status_projection = 20
    mockAuthStore.parcels_wh_zone = 1
    mockAuthStore.parcels_wh_number = 'POST-'
    mockAuthStore.parcels_wh_box_number = 'BOX-'
    mockAuthStore.parcels_wh_sticker = 'ST-'
    mockAuthStore.parcels_wh_product_name = 'Warehouse product'

    fetchWrapper.get.mockResolvedValue({
      items: [],
      pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
    })
    const store = useParcelsStore()
    await store.getAll(1, { showMarkedByPartner: true })
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels/a?registerId=1&page=1&pageSize=100&sortBy=id&sortOrder=asc&statusId=3&checkStatusProjectionKind=20&zone=1&numberPrefix=POST-&boxNumberPrefix=BOX-&stickerPrefix=ST-&productName=Warehouse+product`
    )
  })

  it('ignores warehouse-specific filters on regular parcel endpoint', async () => {
    mockAuthStore.parcels_number = 'REG'
    mockAuthStore.parcels_wh_number = 'POST-'
    mockAuthStore.parcels_wh_box_number = 'BOX-'
    mockAuthStore.parcels_wh_sticker = 'ST-'

    fetchWrapper.get.mockResolvedValue({
      items: [],
      pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
    })
    const store = useParcelsStore()
    await store.getAll(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=1&page=1&pageSize=100&sortBy=id&sortOrder=asc&number=REG`
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

  it('fetches data with hidden legacy restrictions filter', async () => {
    mockAuthStore.parcels_hide_legacy_restrictions = true

    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()
    await store.getAll(1)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=1&page=1&pageSize=100&sortBy=id&sortOrder=asc&hideLegacyRestrictions=true`
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

  it('fetches data with combined tnved, number and product name filtering', async () => {
    mockAuthStore.parcels_tnved = 'AA'
    mockAuthStore.parcels_number = 'OZON456'
    mockAuthStore.parcels_product_name = 'Notebook'
    
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()
    await store.getAll(2)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=2&page=1&pageSize=100&sortBy=id&sortOrder=asc&tnVed=AA&number=OZON456&productName=Notebook`
    )
  })


  it('fetches data with product name filtering', async () => {
    mockAuthStore.parcels_product_name = 'Телефон'

    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()
    await store.getAll(4)
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=4&page=1&pageSize=100&sortBy=id&sortOrder=asc&productName=%D0%A2%D0%B5%D0%BB%D0%B5%D1%84%D0%BE%D0%BD`
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
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/parcels/a/5`)
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

  it('does not toggle store loading for getAll with updateStore false when request fails', async () => {
    const error = new Error('Failed to fetch orders')
    fetchWrapper.get.mockRejectedValue(error)
    const store = useParcelsStore()

    await expect(store.getAll(1, { updateStore: false })).rejects.toBe(error)

    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('clears check status for parcel', async () => {
    fetchWrapper.post.mockResolvedValue(undefined)
    const store = useParcelsStore()

    const result = await store.clearCheckStatus(9)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/9/clear`)
    expect(result).toBe(true)
  })

  it('checks parcel for duplicates', async () => {
    fetchWrapper.post.mockResolvedValue(undefined)
    const store = useParcelsStore()

    const result = await store.checkForDuplicate(12)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/12/check-duplicate`)
    expect(result).toBe(true)
  })

  it('sets parcel defect status', async () => {
    fetchWrapper.post.mockResolvedValue(undefined)
    const store = useParcelsStore()

    const result = await store.setDefect(12)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/12/set-defect`)
    expect(result).toBe(true)
  })

  it('clears parcel defect status', async () => {
    fetchWrapper.post.mockResolvedValue(undefined)
    const store = useParcelsStore()

    const result = await store.clearDefect(12)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/12/clear-defect`)
    expect(result).toBe(true)
  })

  it('fetches warehouse data with warehouse-specific page and sort parameters', async () => {
    mockAuthStore.parcels_page = 9
    mockAuthStore.parcels_per_page = 25
    mockAuthStore.parcels_sort_by = [{ key: 'tnVed', order: 'desc' }]
    mockAuthStore.parcels_wh_page = 3
    mockAuthStore.parcels_wh_per_page = 50
    mockAuthStore.parcels_wh_sort_by = [{ key: 'checkStatusProjection', order: 'asc' }]

    fetchWrapper.get.mockResolvedValue({
      items: [],
      pagination: { totalCount: 0, hasNextPage: false, hasPreviousPage: false }
    })
    const store = useParcelsStore()
    await store.getAll(1, { showMarkedByPartner: true })
    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels/a?registerId=1&page=3&pageSize=50&sortBy=checkStatusProjection&sortOrder=asc`
    )
  })

  it('clears parcel ExtId through API and patches loaded parcel collections', async () => {
    fetchWrapper.post.mockResolvedValue(undefined)
    const store = useParcelsStore()
    store.item = { id: 12, extId: '5', number: 'P-12' }
    store.items = [
      { id: 11, extId: '4' },
      { id: 12, extId: '5', number: 'P-12' }
    ]
    store.items_bn = [
      { id: 12, extId: '5', number: 'P-12' }
    ]

    const result = await store.clearExtId(12)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/12/clear-ext-id`)
    expect(result).toBe(true)
    expect(store.item).toEqual({ id: 12, extId: null, number: 'P-12' })
    expect(store.items).toEqual([
      { id: 11, extId: '4' },
      { id: 12, extId: null, number: 'P-12' }
    ])
    expect(store.items_bn).toEqual([
      { id: 12, extId: null, number: 'P-12' }
    ])
  })

  it('applies ExtId subscription changes and ignores stale revisions', () => {
    const store = useParcelsStore()
    store.item = { id: 12, extId: null, number: 'P-12' }
    store.items = [{ id: 12, extId: null, number: 'P-12' }]
    store.items_bn = [{ id: 12, extId: null, number: 'P-12' }]

    expect(store.applyExtIdChange({ parcelId: 12, extId: '6', revision: 10 })).toBe(true)
    expect(store.item.extId).toBe('6')
    expect(store.items[0].extId).toBe('6')
    expect(store.items_bn[0].extId).toBe('6')

    expect(store.applyExtIdChange({ parcelId: 12, extId: '7', revision: 9 })).toBe(false)
    expect(store.applyExtIdChange({ parcelId: 12, extId: '7', revision: 10 })).toBe(false)
    expect(store.item.extId).toBe('6')

    expect(store.applyExtIdChange({ parcelId: 12, extId: null, revision: 11 })).toBe(true)
    expect(store.item.extId).toBeNull()
  })

  it('applyExtIdChange returns false for null change', () => {
    const store = useParcelsStore()
    expect(store.applyExtIdChange(null)).toBe(false)
  })

  it('applyExtIdChange returns false when parcelId is 0', () => {
    const store = useParcelsStore()
    expect(store.applyExtIdChange({ parcelId: 0, extId: 'X', revision: 5 })).toBe(false)
  })

  it('applyExtIdChange returns false when revision is 0', () => {
    const store = useParcelsStore()
    expect(store.applyExtIdChange({ parcelId: 12, extId: 'X', revision: 0 })).toBe(false)
  })

  describe('bulkAssignTnved method', () => {
    it('calls assign-tnved endpoint with payload', async () => {
      fetchWrapper.post.mockResolvedValue(undefined)
      const store = useParcelsStore()

      const result = await store.bulkAssignTnved([7, 8], '1234567890')

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/assign-tnved`, {
        tnVed: '1234567890',
        parcelIds: [7, 8]
      })
      expect(result).toBe(true)
    })

    it('propagates error when request fails', async () => {
      const error = new Error('Bulk assign failed')
      fetchWrapper.post.mockRejectedValue(error)
      const store = useParcelsStore()

      await expect(store.bulkAssignTnved([7], '1234567890')).rejects.toBe(error)
    })
  })

  describe('status selection methods', () => {
    it('resolves parcel numbers for status bulk change', async () => {
      fetchWrapper.post.mockResolvedValue({ parcelIds: [1], missingNumbers: ['P-2'] })
      const store = useParcelsStore()

      const result = await store.resolveStatusSelection(9, ['P-1', 'P-2'])

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/status-selection/resolve`, {
        registerId: 9,
        numbers: ['P-1', 'P-2']
      })
      expect(result).toEqual({ parcelIds: [1], missingNumbers: ['P-2'] })
    })

    it('updates selected parcel statuses for status bulk change', async () => {
      fetchWrapper.post.mockResolvedValue({ updatedCount: 2, skippedCount: 0 })
      const store = useParcelsStore()

      const result = await store.updateStatusSelection(9, 4, [1, 2])

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/status-selection/update`, {
        registerId: 9,
        statusId: 4,
        parcelIds: [1, 2]
      })
      expect(result).toEqual({ updatedCount: 2, skippedCount: 0 })
    })
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

    it('generate appends weight correction query only when requested', async () => {
      const store = useParcelsStore()
      fetchWrapper.downloadFile = vi.fn().mockResolvedValue(true)

      await store.generate(123, null, true)

      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
        `${apiUrl}/parcels/123/generate?applyWeightCorrection=true`,
        'IndPost_123.xml'
      )
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

    describe('deleteImage method', () => {
      it('calls DELETE endpoint and refreshes item when current', async () => {
        fetchWrapper.delete.mockResolvedValue(undefined)
        fetchWrapper.get.mockResolvedValue({ id: 42, hasImage: false })

        const store = useParcelsStore()
        // simulate currently loaded item
        store.item = { id: 42, hasImage: true }

        const result = await store.deleteImage(42)
        expect(fetchWrapper.delete).toHaveBeenCalledWith(`${apiUrl}/parcels/42/image`)
        expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/parcels/a/42`)
        expect(result).toBe(true)
        expect(store.item).toEqual({ id: 42, hasImage: false })
      })

      it('returns false without calling API when parcel has no image', async () => {
        fetchWrapper.delete.mockResolvedValue(undefined)

        const store = useParcelsStore()
        // simulate currently loaded item without an image
        store.item = { id: 42, hasImage: false }

        const result = await store.deleteImage(42)
        expect(fetchWrapper.delete).not.toHaveBeenCalled()
        expect(result).toBe(false)
      })

      it('propagates error when delete fails', async () => {
        const error = new Error('Not found')
        fetchWrapper.delete.mockRejectedValue(error)

        const store = useParcelsStore()

        await expect(store.deleteImage(100)).rejects.toBe(error)
        expect(store.error).toBe(error)
      })
    })

  describe('lookupFeacnCode method', () => {
    it('calls lookup-feacn-code endpoint and returns result', async () => {
      const mockResult = { tnVed: '6402919000' }
      fetchWrapper.post.mockResolvedValue(mockResult)

      const store = useParcelsStore()
      const result = await store.lookupFeacnCode(55)

      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/55/lookup-feacn-code`)
      expect(result).toEqual(mockResult)
    })

    it('propagates error when lookup fails', async () => {
      const error = new Error('Lookup failed')
      fetchWrapper.post.mockRejectedValue(error)

      const store = useParcelsStore()

      await expect(store.lookupFeacnCode(55)).rejects.toThrow('Lookup failed')
    })
  })

  describe('getImageBlob method', () => {
    it('fetches image blob for the given parcel id', async () => {
      const mockBlob = new Blob(['image data'], { type: 'image/jpeg' })
      const mockResponse = { blob: vi.fn().mockResolvedValue(mockBlob) }
      fetchWrapper.getFile.mockResolvedValue(mockResponse)

      const store = useParcelsStore()
      const result = await store.getImageBlob(77)

      expect(fetchWrapper.getFile).toHaveBeenCalledWith(`${apiUrl}/parcels/77/image`)
      expect(result).toBe(mockBlob)
    })

    it('propagates error when getFile fails', async () => {
      const error = new Error('Image not found')
      fetchWrapper.getFile.mockRejectedValue(error)

      const store = useParcelsStore()

      await expect(store.getImageBlob(77)).rejects.toThrow('Image not found')
    })
  })

})
