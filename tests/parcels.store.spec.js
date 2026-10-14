// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { ParcelApprovalMode } from '@/models/parcel.approval.mode.js'
import { loadParcels } from '@/helpers/parcels.list.helpers.js'

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
  parcels_filter_id: null,
  setParcelFilterId(id) {
    this.parcels_filter_id = id
    this.parcels_page = 1
    this.parcels_wh_page = 1
  },
  parcels_page: 1,
  parcels_per_page: 100,
  parcels_sort_by: [{ key: 'id', order: 'asc' }],
  parcels_status: null,
  parcels_check_status_sw: null,
  parcels_check_status_fc: null,
  parcels_passport_check_status: null,
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
    mockAuthStore.parcels_filter_id = null
    // Reset mock auth store to defaults
    mockAuthStore.parcels_page = 1
    mockAuthStore.parcels_per_page = 100
    mockAuthStore.parcels_sort_by = [{ key: 'id', order: 'asc' }]
    mockAuthStore.parcels_status = null
    mockAuthStore.parcels_check_status_sw = null
    mockAuthStore.parcels_check_status_fc = null
    mockAuthStore.parcels_passport_check_status = null
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

  it.each([false, true])('passes the selected filter alongside inclusive list controls (warehouse=%s)', async warehouse => {
    mockAuthStore.parcels_filter_id = 23
    mockAuthStore.parcels_status = 2
    mockAuthStore.parcels_wh_status = 3
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    await useParcelsStore().getAll(1, { showMarkedByPartner: warehouse })
    const url = new URL(fetchWrapper.get.mock.calls[0][0])
    expect(url.searchParams.get('parcelFilterId')).toBe('23')
    expect(url.searchParams.get('statusId')).toBe(warehouse ? '3' : '2')
  })

  it('clears a deleted filter and reloads once with one visible warning', async () => {
    mockAuthStore.parcels_filter_id = 23
    mockAuthStore.parcels_page = 4
    const missing = Object.assign(new Error('Missing filter'), { status: 404 })
    fetchWrapper.get.mockReset().mockRejectedValueOnce(missing).mockRejectedValueOnce(missing)
      .mockResolvedValueOnce({ items: [{ id: 1 }], pagination: { totalCount: 1 } })
    const wrapper = mount(PageAlertRegion)
    const alerts = useAlertStore()
    const warning = vi.spyOn(alerts, 'warning')
    await loadParcels(1, useParcelsStore(), ref(true), alerts)
    expect(mockAuthStore.parcels_filter_id).toBeNull()
    expect(mockAuthStore.parcels_page).toBe(1)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(3)
    expect(new URL(fetchWrapper.get.mock.calls[2][0]).searchParams.has('parcelFilterId')).toBe(false)
    expect(useParcelsStore().items.map(item => item.id)).toEqual([1])
    expect(warning).toHaveBeenCalledOnce()
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Фильтр сброшен')
    wrapper.unmount()
  })

  it.each([true, false])('preserves an existing filter when list or validation fails (validationExists=%s)', async exists => {
    mockAuthStore.parcels_filter_id = 23
    fetchWrapper.get.mockReset().mockRejectedValueOnce(Object.assign(new Error('Register unavailable'), { status: 404 }))
    if (exists) fetchWrapper.get.mockResolvedValueOnce({ id: 23 })
    else fetchWrapper.get.mockRejectedValueOnce(new Error('Validation unavailable'))
    const wrapper = mount(PageAlertRegion)
    const alerts = useAlertStore()
    const error = vi.spyOn(alerts, 'error')
    await loadParcels(1, useParcelsStore(), ref(true), alerts)
    expect(mockAuthStore.parcels_filter_id).toBe(23)
    expect(error).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain(exists ? 'Register unavailable' : 'Validation unavailable')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    wrapper.unmount()
  })

  it('passes an exact box id to both parcel list endpoints', async () => {
    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()

    await store.getAll(1, { boxId: 17 })
    expect(fetchWrapper.get).toHaveBeenLastCalledWith(
      `${apiUrl}/parcels?registerId=1&page=1&pageSize=100&boxId=17&sortBy=id&sortOrder=asc`
    )

    await store.getAll(1, { showMarkedByPartner: true, boxId: 17 })
    expect(fetchWrapper.get).toHaveBeenLastCalledWith(
      `${apiUrl}/parcels/a?registerId=1&page=1&pageSize=100&boxId=17&sortBy=id&sortOrder=asc`
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

  it('fetches data with passport problems filtering', async () => {
    mockAuthStore.parcels_passport_check_status = 'problems'

    fetchWrapper.get.mockResolvedValue({ items: [], pagination: {} })
    const store = useParcelsStore()
    await store.getAll(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith(
      `${apiUrl}/parcels?registerId=1&page=1&pageSize=100&sortBy=id&sortOrder=asc&passportCheckWithProblems=true`
    )
  })

  it('fetches parcels by number and updates store', async () => {
    mockAuthStore.parcels_number = 'PN-001'
    fetchWrapper.get.mockResolvedValue([{ id: 1, number: 'PN-001' }])
    const store = useParcelsStore()
    await store.getByNumber()
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/parcels/by-number?number=PN-001`)
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

  it.each(['older-first', 'newer-first'])('only commits the latest item request (%s)', async (order) => {
    let resolveOlder, resolveNewer
    fetchWrapper.get
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOlder = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewer = resolve }))
    const store = useParcelsStore()
    store.item = { id: 1 }
    const older = store.getById(2)
    const newer = store.getById(3)
    expect(store.item).toEqual({ id: 1 })
    expect(store.itemLoading).toBe(true)
    if (order === 'older-first') {
      resolveOlder({ id: 2 })
      expect(await older).toEqual({ id: 2 })
      expect(store.item).toEqual({ id: 1 })
      expect(store.itemLoading).toBe(true)
      resolveNewer({ id: 3 })
    } else {
      resolveNewer({ id: 3 })
      await newer
      resolveOlder({ id: 2 })
    }
    await expect(older).resolves.toEqual({ id: 2 })
    await expect(newer).resolves.toEqual({ id: 3 })
    expect(store.item).toEqual({ id: 3 })
    expect(store.itemLoading).toBe(false)
    expect(store.itemError).toBeNull()
  })

  it('checks parcel passport through the passport endpoint', async () => {
    fetchWrapper.post.mockResolvedValue(undefined)
    const store = useParcelsStore()

    const result = await store.checkPassport(12)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/12/check-passport`)
    expect(result).toBe(true)
  })

  it('clears parcel passport check through the passport endpoint', async () => {
    fetchWrapper.post.mockResolvedValue(undefined)
    const store = useParcelsStore()

    const result = await store.clearPassportCheck(12)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/12/clear-passport-check`)
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

  it('clears parcel ExtId through API and patches loaded parcel collections', async () => {
    fetchWrapper.post.mockResolvedValue(undefined)
    const store = useParcelsStore()
    store.item = { id: 12, extId: '5', number: 'P-12' }
    store.items = [
      { id: 11, extId: '4' },
      { id: 12, extId: '5', number: 'P-12' }
    ]
    store.items_bn = [{ id: 12, extId: '5', number: 'P-12' }]

    const result = await store.clearExtId(12)

    expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/12/clear-ext-id`)
    expect(result).toBe(true)
    expect(store.item).toEqual({ id: 12, extId: null, number: 'P-12' })
    expect(store.items).toEqual([
      { id: 11, extId: '4' },
      { id: 12, extId: null, number: 'P-12' }
    ])
    expect(store.items_bn).toEqual([{ id: 12, extId: null, number: 'P-12' }])
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

  it('applies revision-ordered parcel check statuses to loaded rows and current item', () => {
    const store = useParcelsStore()
    store.items = [
      { id: 12, registerId: 7, passportCheckStatus: 0 },
      { id: 13, registerId: 8, passportCheckStatus: 0 }
    ]
    store.item = { id: 12, registerId: 7, passportCheckStatus: 0 }

    const accepted = store.applyParcelCheckStatusChanges({
      registerId: 7,
      updates: [
        { parcelId: 12, checkCode: 'passport', status: 10, revision: 5 },
        { parcelId: 99, checkCode: 'future-check', status: 20, revision: 5 }
      ]
    })
    const stale = store.applyParcelCheckStatusChanges({
      registerId: 7,
      updates: [{ parcelId: 12, checkCode: 'passport', status: 30, revision: 4 }]
    })

    expect(accepted).toHaveLength(1)
    expect(stale).toEqual([])
    expect(store.items[0].passportCheckStatus).toBe(10)
    expect(store.items[1].passportCheckStatus).toBe(0)
    expect(store.item.passportCheckStatus).toBe(10)
  })

  it('rejects inherited object property names as parcel check codes', () => {
    const store = useParcelsStore()
    store.items = [{ id: 12, registerId: 7, passportCheckStatus: 0 }]

    const accepted = store.applyParcelCheckStatusChanges({
      registerId: 7,
      updates: ['toString', '__proto__', 'constructor'].map((checkCode, index) => ({
        parcelId: 12,
        checkCode,
        status: 10,
        revision: index + 1
      }))
    })

    expect(accepted).toEqual([])
    expect(store.items[0]).toEqual({ id: 12, registerId: 7, passportCheckStatus: 0 })
  })

  it('preserves live check updates that arrive during a list REST request', async () => {
    let resolveRequest
    fetchWrapper.get.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      })
    )
    const store = useParcelsStore()

    const request = store.getAll(7, { updateStore: false })
    store.applyParcelCheckStatusChanges({
      registerId: 7,
      updates: [{ parcelId: 12, checkCode: 'passport', status: 30, revision: 8 }]
    })
    resolveRequest({
      items: [{ id: 12, registerId: 7, passportCheckStatus: 10 }],
      pagination: { totalCount: 1 }
    })
    const response = await request
    store.applyParcelCheckStatusChanges({
      registerId: 7,
      updates: [{ parcelId: 12, checkCode: 'passport', status: 40, revision: 9 }]
    })
    store.updateItems(response)

    expect(store.items[0].passportCheckStatus).toBe(40)
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
    it.each([true, false])('refreshes the marker before returning to cached list rows (%s)', async (flag) => {
      const store = useParcelsStore()
      store.item = { id: 5, tnVed: 'old', postingNumber: 'P5', matchesExportFeeCategory: !flag }
      store.items = [{ ...store.item }, { id: 6, matchesExportFeeCategory: true }]
      fetchWrapper.put.mockResolvedValue(undefined)
      fetchWrapper.get.mockResolvedValue({ id: 5, matchesExportFeeCategory: flag })
      const showList = ref(false)
      const wrapper = mount({
        components: { ParcelNumberExt },
        setup: () => ({ store, showList }),
        template: '<ParcelNumberExt :item="showList ? store.items[0] : store.item" />'
      }, { global: { stubs: { ClickableCell: true, ActionButton: true } } })
      expect(wrapper.find('.export-fee-category-marker').exists()).toBe(!flag)
      await store.update(5, { tnVed: 'new', matchesExportFeeCategory: !flag })
      showList.value = true
      await nextTick()
      expect(wrapper.find('.export-fee-category-marker').exists()).toBe(flag)
      expect(store.item.matchesExportFeeCategory).toBe(flag)
      expect(store.items[0].matchesExportFeeCategory).toBe(flag)
      expect(store.items[1].matchesExportFeeCategory).toBe(true)
      expect(fetchWrapper.get).toHaveBeenCalledWith(apiUrl + '/parcels/a/5')
      wrapper.unmount()
    })

    it.each(['detail', 'list'])('refreshes when only the %s cache contains the parcel', async (cache) => {
      const store = useParcelsStore()
      store.item = { id: 7 }
      store.items = [{ id: 6 }]
      const parcel = { id: 5, tnVed: 'old', matchesExportFeeCategory: true }
      if (cache === 'detail') store.item = parcel
      else store.items.push(parcel)
      fetchWrapper.put.mockResolvedValue(undefined)
      // Older server versions may omit the additive field.
      fetchWrapper.get.mockResolvedValue({ id: 5 })
      await store.update(5, { tnVed: 'new' })
      expect((cache === 'detail' ? store.item : store.items[1]).matchesExportFeeCategory).toBe(false)
      expect(store.items[0]).toEqual({ id: 6 })
    })

    it('shows one refresh error, keeps the form open, and allows retry', async () => {
      const store = useParcelsStore()
      const alertStore = useAlertStore()
      store.item = { id: 5, postingNumber: 'P5', tnVed: 'old', matchesExportFeeCategory: true }
      store.items = [{ ...store.item }]
      fetchWrapper.put.mockResolvedValue(undefined)
      fetchWrapper.get.mockRejectedValueOnce(new Error('category refresh failed'))
        .mockResolvedValueOnce({ id: 5, matchesExportFeeCategory: false })
      const showList = ref(false)
      const save = async () => {
        try {
          await store.update(5, { tnVed: 'new' })
          showList.value = true
        } catch (error) {
          alertStore.error(error)
        }
      }
      const wrapper = mount({
        components: { ParcelNumberExt, PageAlertRegion },
        setup: () => ({ store, save, showList }),
        template: '<div><PageAlertRegion /><button @click="save">Save</button><span data-testid="location">{{ showList ? "list" : "form" }}</span><ParcelNumberExt :item="showList ? store.items[0] : store.item" /></div>'
      }, { global: { stubs: { ClickableCell: true, ActionButton: true } } })
      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(wrapper.get('[role="alert"]').text()).toContain('category refresh failed')
      expect(wrapper.get('[data-testid="location"]').text()).toBe('form')
      expect(wrapper.find('.export-fee-category-marker').exists()).toBe(false)
      expect(store.items[0].matchesExportFeeCategory).toBeUndefined()
      await save()
      await nextTick()
      expect(wrapper.get('[data-testid="location"]').text()).toBe('list')
      expect(fetchWrapper.put).toHaveBeenCalledTimes(2)
      expect(store.items[0].matchesExportFeeCategory).toBe(false)
      wrapper.unmount()
    })

    it('falls back to marking the loaded parcel read-only when conflict refresh fails', async () => {
      const conflict = Object.assign(new Error('Изменения запрещены для реестра'), { status: 409 })
      const refreshError = new Error('refresh failed')
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      fetchWrapper.put.mockRejectedValue(conflict)
      fetchWrapper.get.mockRejectedValue(refreshError)
      const store = useParcelsStore()
      store.item = { id: '5', statusId: 1, readOnly: false }
      store.items = [{ id: '5', statusId: 1, readOnly: false }]

      await expect(store.update(5, { statusId: 2 })).rejects.toBe(conflict)

      expect(store.item).toEqual({ id: '5', statusId: 1, readOnly: true })
      expect(store.items[0]).toEqual({ id: '5', statusId: 1, readOnly: true })
      expect(consoleError).toHaveBeenCalledTimes(1)
      expect(consoleError).toHaveBeenCalledWith('[parcels conflict refresh]', refreshError)
      consoleError.mockRestore()
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

  })

  describe('generate methods', () => {
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
      expect(fetchWrapper.downloadFile).toHaveBeenCalledWith(
        `${apiUrl}/parcels/123/generate`,
        'IndPost_123.xml'
      )
    })
  })

  describe('validateSw method', () => {
    it('rethrows and sets error when validateSw fails', async () => {
      const error = new Error('Validation failed')
      fetchWrapper.post.mockRejectedValue(error)

      const store = useParcelsStore()
      await expect(store.validate(789, true)).rejects.toBe(error)

      expect(fetchWrapper.post).toHaveBeenCalledWith(
        `${apiUrl}/parcels/789/validate-sw?withSwMatch=0`
      )
      expect(store.loading).toBe(false)
      expect(store.error).toBe(error)
    })
  })

  describe('approve method', () => {
    it('calls approve endpoint with ApproveWithNotification mode', async () => {
      fetchWrapper.post.mockResolvedValue(undefined)

      const store = useParcelsStore()
      const result = await store.approve(123, ParcelApprovalMode.ApproveWithNotification)

      expect(fetchWrapper.post).toHaveBeenCalledWith(
        `${apiUrl}/parcels/123/approve?approveMode=ApproveWithNotification`
      )
      expect(result).toBe(true)
    })

    it('refreshes the loaded and listed parcel after a read-only mutation conflict', async () => {
      const conflict = Object.assign(new Error('Изменения запрещены для реестра'), { status: 409 })
      fetchWrapper.post.mockRejectedValue(conflict)
      fetchWrapper.get.mockResolvedValue({ id: 123, statusId: 7, readOnly: true })
      const store = useParcelsStore()
      store.item = { id: 123, statusId: 1, readOnly: false }
      store.items = [{ id: 123, statusId: 1, readOnly: false }]

      await expect(store.approve(123)).rejects.toBe(conflict)

      expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/parcels/a/123`)
      expect(store.item).toEqual({ id: 123, statusId: 7, readOnly: true })
      expect(store.items[0]).toEqual({ id: 123, statusId: 7, readOnly: true })
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
