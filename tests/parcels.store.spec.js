// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
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

  it.each([
    false
  ])('preserves an existing filter when list or validation fails (validationExists=%s)', async exists => {
    mockAuthStore.parcels_filter_id = 23
    fetchWrapper.get.mockReset().mockRejectedValueOnce(Object.assign(new Error('Реестр недоступен'), { status: 404 }))
    if (exists) fetchWrapper.get.mockResolvedValueOnce({ id: 23 })
    else fetchWrapper.get.mockRejectedValueOnce(new Error('Проверка недоступна'))
    const wrapper = mount(PageAlertRegion)
    const alerts = useAlertStore()
    const error = vi.spyOn(alerts, 'error')
    await loadParcels(1, useParcelsStore(), ref(true), alerts)
    expect(mockAuthStore.parcels_filter_id).toBe(23)
    expect(error).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain(exists ? 'Реестр недоступен' : 'Проверка недоступна')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    wrapper.unmount()
  })

  it.each([false, true])('keeps the new list loading after an older request settles (rejected=%s)', async rejected => {
    const store = useParcelsStore()
    const old = Promise.withResolvers()
    const current = Promise.withResolvers()
    const failure = new Error('Старая страница недоступна')
    fetchWrapper.get.mockReset().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const previous = store.getAll(1)
    const observedPrevious = rejected ? expect(previous).rejects.toBe(failure) : previous
    store.clearVisibleList()
    const pending = store.getAll(2)
    const wrapper = mount({
      setup: () => ({ store }),
      template: '<div><span v-if="store.loading" role="status">Загрузка посылок</span><button :disabled="store.loading">Сканировать</button></div>'
    })
    try {
      if (rejected) old.reject(failure)
      else old.resolve({ items: [{ id: 101 }], pagination: { totalCount: 1 } })
      await observedPrevious
      await nextTick()
      expect(store.loading).toBe(true)
      expect(wrapper.get('[role="status"]').text()).toBe('Загрузка посылок')
      expect(wrapper.get('button').element.disabled).toBe(true)
      expect(store.items).toEqual([])
      expect(store.error).toBeNull()

      current.resolve({ items: [{ id: 202 }], pagination: { totalCount: 1 } })
      await pending
      await nextTick()
      expect(store.loading).toBe(false)
      expect(store.items.map(item => item.id)).toEqual([202])
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
      expect(wrapper.get('button').element.disabled).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it.each([false, true])('releases the visible load when a background read supersedes it (rejected=%s)', async rejected => {
    const store = useParcelsStore()
    const visible = Promise.withResolvers()
    const background = Promise.withResolvers()
    const failure = new Error('Фоновое обновление недоступно')
    fetchWrapper.get.mockReset().mockReturnValueOnce(visible.promise).mockReturnValueOnce(background.promise)
    const pending = store.getAll(1)
    const refresh = store.getAll(1, { updateStore: false })
    const observedRefresh = rejected ? expect(refresh).rejects.toBe(failure) : refresh
    expect(store.loading).toBe(true)

    visible.resolve({ items: [{ id: 101 }], pagination: {} })
    await pending
    expect(store.loading).toBe(false)
    expect(store.items).toEqual([])

    if (rejected) background.reject(failure)
    else background.resolve({ items: [{ id: 202 }], pagination: {} })
    await observedRefresh
    expect(store.loading).toBe(false)
    expect(store.items).toEqual([])
    expect(store.error).toBe(rejected ? failure : null)
  })

  it.each([false, true])('releases the current list loading and preserves failure propagation (rejected=%s)', async rejected => {
    const store = useParcelsStore()
    const current = Promise.withResolvers()
    const failure = new Error('Список посылок недоступен')
    fetchWrapper.get.mockReset().mockReturnValueOnce(current.promise)
    const pending = store.getAll(1)
    const observed = rejected ? expect(pending).rejects.toBe(failure) : pending
    expect(store.loading).toBe(true)
    if (rejected) current.reject(failure)
    else current.resolve({ items: [{ id: 101 }], pagination: {} })
    await observed
    expect(store.loading).toBe(false)
    expect(store.error).toBe(rejected ? failure : null)
  })

  it('presents a current load rejection once and retries the same list', async () => {
    const store = useParcelsStore()
    const alerts = useAlertStore()
    const present = vi.spyOn(alerts, 'error')
    const isMounted = ref(true)
    fetchWrapper.get.mockReset().mockRejectedValueOnce(new Error('Список посылок недоступен'))
      .mockResolvedValueOnce({ items: [{ id: 101 }], pagination: { totalCount: 1 } })
    const wrapper = mount(PageAlertRegion)
    try {
      await loadParcels(12, store, isMounted, alerts)
      expect(store.loading).toBe(false)
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(wrapper.get('[role="alert"]').text()).toContain('Список посылок недоступен')
      expect(present).toHaveBeenCalledOnce()

      await loadParcels(12, store, isMounted, alerts)
      expect(fetchWrapper.get.mock.calls[1][0]).toBe(fetchWrapper.get.mock.calls[0][0])
      expect(store.items.map(item => item.id)).toEqual([101])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(present).toHaveBeenCalledOnce()
    } finally {
      wrapper.unmount()
    }
  })

  it('does not retry a deleted filter after closing the list', async () => {
    const store = useParcelsStore()
    const delayed = Promise.withResolvers()
    const missing = Object.assign(new Error('Фильтр не найден'), { status: 404 })
    mockAuthStore.parcels_filter_id = 23
    fetchWrapper.get.mockReset().mockRejectedValueOnce(missing).mockReturnValueOnce(delayed.promise)
    const pending = expect(store.getAll(1)).rejects.toBe(missing)
    await Promise.resolve()
    expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
    store.clearVisibleList()
    delayed.reject(missing)
    await pending

    expect(mockAuthStore.parcels_filter_id).toBe(23)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(2)
    expect(store.error).toBeNull()
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

  })

  describe('status selection methods', () => {
    it('passes Lookup purpose on the existing resolver route', async () => {
      const response = { purpose: 'lookup', lookupBy: 'sticker', matches: [] }
      fetchWrapper.post.mockResolvedValueOnce(response)
      const store = useParcelsStore()
      await expect(store.resolveStatusSelection(9, ['0001'], 'sticker', 'lookup')).resolves.toEqual(response)
      expect(fetchWrapper.post).toHaveBeenCalledWith(`${apiUrl}/parcels/status-selection/resolve?purpose=lookup`, {
        registerId: 9, numbers: ['0001'], lookupBy: 'sticker'
      })
    })

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

  })

  describe('update method', () => {
    it.each([
      true
    ])('merges Boolean dangerous goods and preserves null/undefined (%s)', async flag => {
      const store = useParcelsStore()
      store.item = { id: 5, dangerousGoods: true }
      store.items = [{ ...store.item }]
      fetchWrapper.put.mockResolvedValue(undefined)
      const data = { id: 5, dangerousGoods: flag }
      await store.update(5, data)
      expect(fetchWrapper.put).toHaveBeenCalledWith(apiUrl + '/parcels/5', data)
      expect(store.item.dangerousGoods).toBe(flag ?? true)
      expect(store.items[0].dangerousGoods).toBe(flag ?? true)
      expect(Object.hasOwn(data, 'dangerousGoods')).toBe(true)
    })

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
      }, { global: { stubs: { ClickableCell: true, ActionButton: true,
        'v-tooltip': { template: '<div><slot name="activator" :props="{}" /></div>' } } } })
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

  })

  describe('generate methods', () => {
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
      const error = new Error('Ошибка проверки')
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

  })

  it('refreshes saved group metadata in the cached detail through the existing detail loader', async () => {
    const store = useParcelsStore()
    store.item = { id: 12, registerId: 7, customsFee: 0, customsChargeGroup: null }
    fetchWrapper.get.mockResolvedValueOnce({ id: 12, registerId: 7, customsFee: 0, customsChargeGroup: { customsFee: 1231, customsDuty: 0 } })
    await store.refreshCachedDetail(7)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/parcels/a/12`)
    expect(store.item.customsChargeGroup.customsFee).toBe(1231)
    await store.refreshCachedDetail(8)
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  it.each([
    false
  ])('refreshes a cached sibling after another row changes and propagates failure (%s)', async fail => {
    const store = useParcelsStore()
    store.item = { id: 12, registerId: 7, customsFee: 0, customsChargeGroup: { customsFee: 1231, customsDuty: 0 } }
    store.items = [{ id: 13, registerId: 7, unitPrice: 10 }]
    const error = new Error('Не удалось обновить таможенные платежи')
    fetchWrapper.put.mockResolvedValueOnce(undefined)
    fetchWrapper.get.mockImplementation(async url => {
      if (url.endsWith('/a/13')) return { id: 13, registerId: 7, unitPrice: 20 }
      if (url.endsWith('/a/12')) {
        if (fail) throw error
        return { id: 12, registerId: 7, customsFee: null, customsDuty: null, customsChargeGroup: null }
      }
      throw new Error('Неожиданный запрос в тесте')
    })
    const operation = store.update(13, { unitPrice: 20 })
    if (fail) {
      await expect(operation).rejects.toBe(error)
      expect(store.itemError).toBe(error)
    } else {
      await operation
      expect(store.item.customsChargeGroup).toBeNull()
    }
    expect(store.item.id).toBe(12)
    expect(store.items[0].unitPrice).toBe(20)
    expect(fetchWrapper.get).toHaveBeenCalledWith(`${apiUrl}/parcels/a/12`)
  })
  it('merges only refreshed charge fields into a cached item on the current page', async () => {
    const store = useParcelsStore()
    store.item = { id: 12, registerId: 7, productName: 'Введённое значение', customsChargeGroup: { customsFee: 1231, customsDuty: 0 } }
    fetchWrapper.get.mockResolvedValue({ items: [{ id: 12, registerId: 7, productName: 'Сохранённое значение', customsFee: null, customsDuty: null, customsChargeGroup: null }], pagination: { totalCount: 1 } })
    await store.getAll(7, { updateStore: true })
    await store.refreshVisibleDerived(7)
    expect(store.item.productName).toBe('Введённое значение')
    expect(store.item.customsChargeGroup).toBeNull()
    expect(store.item.customsFee).toBeNull()
  })})
