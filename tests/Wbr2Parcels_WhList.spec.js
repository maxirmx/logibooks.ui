/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import Wbr2ParcelsWhList from '@/lists/Wbr2Parcels_WhList.vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'

const { loadParcels, setDefect, clearDefect } = vi.hoisted(() => ({
  loadParcels: vi.fn().mockResolvedValue(),
  setDefect: vi.fn().mockResolvedValue(true),
  clearDefect: vi.fn().mockResolvedValue(true)
}))

const mockItems = ref([
  {
    id: 1,
    shk: 'SHK-1',
    productName: 'Very long WBR2 product name that must remain on one line',
    stickerCode: 'ST-1',
    wbSticker: 'WB-1',
    sellerSticker: 'SL-1',
    weightKg: 2.4,
    quantity: 3,
    statusId: 7,
    checkStatusProjection: {
      kind: scanjobCheckStatusProjectionKind.NotChecked,
      title: 'Не проверено',
      restrictionReason: null
    },
    zone: 1
  }
])
const mockLoading = ref(false)
const mockError = ref(null)
const mockTotalCount = ref(1)

const parcelsPerPage = ref(10)
const parcelsSortBy = ref([])
const parcelsPage = ref(1)
const isAdmin = ref(false)
const isWhManager = ref(false)
const isShiftLead = ref(false)

const registerItem = ref({ dealNumber: 'D-1' })

const getById = vi.fn().mockResolvedValue()

const alertRef = ref(null)
const alertError = vi.fn()
const alertClear = vi.fn()

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      const refs = {}
      Object.keys(store).forEach((key) => {
        const value = store[key]
        if (value && typeof value === 'object' && 'value' in value) {
          refs[key] = value
        }
      })
      return refs
    }
  }
})

vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  loadParcels
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    items: mockItems,
    loading: mockLoading,
    error: mockError,
    totalCount: mockTotalCount,
    setDefect,
    clearDefect
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    getStatusTitle: vi.fn(id => `Status ${id}`)
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: registerItem,
    ops: { customsProcedures: [], transportationTypes: [] },
    getById,
    ensureOpsLoaded: vi.fn().mockResolvedValue(),
    getTransportationDocument: vi.fn(() => 'Документ')
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    parcels_per_page: parcelsPerPage,
    parcels_sort_by: parcelsSortBy,
    parcels_page: parcelsPage,
    isAdmin,
    isWhManager,
    isShiftLead
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: alertRef,
    error: alertError,
    clear: alertClear
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    ops: ref({ zones: [{ value: 1, name: 'Зона 1' }] }),
    ensureOpsLoaded: vi.fn().mockResolvedValue()
  })
}))

const globalStubs = {
  ...vuetifyStubs,
  RegisterHeadingWithStats: {
    template: '<div data-testid="register-heading"></div>'
  },
  PaginationFooter: {
    template: '<div data-testid="pagination-footer"></div>'
  },
  RegisterWhHeaderActionBar: {
    template: '<div data-testid="register-wh-header-action-bar"></div>'
  }
}

describe('Wbr2Parcels_WhList.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = [
      {
        id: 1,
        shk: 'SHK-1',
        productName: 'Very long WBR2 product name that must remain on one line',
        stickerCode: 'ST-1',
        wbSticker: 'WB-1',
        sellerSticker: 'SL-1',
        weightKg: 2.4,
        quantity: 3,
        statusId: 7,
        checkStatusProjection: {
          kind: scanjobCheckStatusProjectionKind.NotChecked,
          title: 'Не проверено',
          restrictionReason: null
        },
        zone: 1
      }
    ]
    isAdmin.value = false
    isWhManager.value = false
    isShiftLead.value = false
  })

  it('loads warehouse parcels with showMarkedByPartner enabled', async () => {
    mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true }
    )
  })

  it('renders the required parcel fields in the table', async () => {
    const wrapper = mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const text = wrapper.text()
    expect(text).toContain('SHK-1')
    expect(text).toContain('Very long WBR2 product name that must remain on one line')
    expect(text).toContain('ST-1')
    expect(text).toContain('WB-1')
    expect(text).toContain('SL-1')
    expect(text).toContain('3')
    expect(text).toContain('Status 7')
    expect(text).toContain('Не проверено')
    expect(text).toContain('Зона 1')
  })

  it('defines headers only for the warehouse parcel columns', () => {
    const wrapper = mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const headerKeys = wrapper.vm.headers.map((header) => header.key)
    expect(headerKeys).toEqual([
      'actions',
      'id',
      'checkStatusProjection',
      'zone',
      'statusId',
      'shk',
      'stickerCode',
      'boxNumber',
      'wbSticker',
      'sellerSticker',
      'productName',
      'weightKg',
      'quantity'
    ])
    expect(wrapper.vm.headers.find((header) => header.key === 'checkStatusProjection').sortable).toBe(true)
  })

  it('renders product name in a non-wrapping truncated cell', () => {
    const wrapper = mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const productName = wrapper.get('.warehouse-product-name-cell')
    expect(productName.text()).toBe('Very long WBR2 product name that must remain on one line')
    expect(productName.attributes('title')).toBe('Very long WBR2 product name that must remain on one line')
  })

  it('sets defect from row action and reloads parcels for warehouse manager', async () => {
    isWhManager.value = true
    const wrapper = mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    loadParcels.mockClear()

    const setDefectAction = wrapper.get('[data-testid="set-defect-action"]')
    expect(setDefectAction.attributes('aria-label')).toBe('Брак')
    expect(setDefectAction.attributes('title')).toBe('Брак')

    await setDefectAction.trigger('click')
    await resolveAll()

    expect(setDefect).toHaveBeenCalledWith(1)
    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true }
    )
  })

  it('clears defect from row action and reloads parcels for shift lead', async () => {
    isShiftLead.value = true
    mockItems.value = [{
      ...mockItems.value[0],
      checkStatusProjection: {
        kind: scanjobCheckStatusProjectionKind.Defect,
        title: 'Брак',
        restrictionReason: 'Брак'
      }
    }]
    const wrapper = mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    loadParcels.mockClear()

    const clearDefectAction = wrapper.get('[data-testid="clear-defect-action"]')
    expect(clearDefectAction.attributes('aria-label')).toBe('Отменить брак')
    expect(clearDefectAction.attributes('title')).toBe('Отменить брак')

    await clearDefectAction.trigger('click')
    await resolveAll()

    expect(clearDefect).toHaveBeenCalledWith(1)
    expect(loadParcels).toHaveBeenCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ value: true }),
      expect.any(Object),
      { showMarkedByPartner: true }
    )
  })

  it('shows reload error message when refresh fails after setting defect', async () => {
    isWhManager.value = true
    const wrapper = mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    loadParcels.mockRejectedValueOnce(new Error('refresh failed'))

    await wrapper.get('[data-testid="set-defect-action"]').trigger('click')
    await resolveAll()

    expect(setDefect).toHaveBeenCalledWith(1)
    expect(alertError).toHaveBeenCalledWith('Ошибка при обновлении данных')
  })

  it('disables set defect action for duplicate and partner-marked projection statuses', async () => {
    isWhManager.value = true
    mockItems.value = [
      {
        ...mockItems.value[0],
        checkStatusProjection: { title: 'Дубликат' }
      },
      {
        ...mockItems.value[0],
        id: 2,
        checkStatusProjection: { title: 'Исключено партнёром' }
      }
    ]
    const wrapper = mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    const setDefectButtons = wrapper.findAll('[data-testid="set-defect-action"]')
    expect(setDefectButtons).toHaveLength(2)
    expect(setDefectButtons[0].attributes('disabled')).toBeDefined()
    expect(setDefectButtons[1].attributes('disabled')).toBeDefined()
  })
})
