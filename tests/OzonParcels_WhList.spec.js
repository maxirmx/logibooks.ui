/* @vitest-environment jsdom */
// Copyright (C) 2026

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import OzonParcelsWhList from '@/lists/OzonParcels_WhList.vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'

const { loadParcels, setDefect, clearDefect } = vi.hoisted(() => ({
  loadParcels: vi.fn().mockResolvedValue(),
  setDefect: vi.fn().mockResolvedValue(true),
  clearDefect: vi.fn().mockResolvedValue(true)
}))

const mockItems = ref([
  {
    id: 1,
    postingNumber: 'POST-1',
    productName: 'Very long Ozon product name that must remain on one line',
    barcode: 'BAR-1',
    boxNumber: 'BOX-1',
    weightKg: 2.4,
    quantity: 3,
    statusId: 7,
    checkStatus: CheckStatusCode.NotChecked.value,
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

describe('OzonParcels_WhList.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = [
      {
        id: 1,
        postingNumber: 'POST-1',
        productName: 'Very long Ozon product name that must remain on one line',
        barcode: 'BAR-1',
        boxNumber: 'BOX-1',
        weightKg: 2.4,
        quantity: 3,
        statusId: 7,
        checkStatus: CheckStatusCode.NotChecked.value,
        zone: 1
      }
    ]
    isAdmin.value = false
    isWhManager.value = false
    isShiftLead.value = false
  })

  it('loads warehouse parcels with showMarkedByPartner enabled', async () => {
    mount(OzonParcelsWhList, {
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

  it('renders projected status, check status, and zone fields in the table', async () => {
    const wrapper = mount(OzonParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const text = wrapper.text()
    expect(text).toContain('POST-1')
    expect(text).toContain('Very long Ozon product name that must remain on one line')
    expect(text).toContain('BAR-1')
    expect(text).toContain('BOX-1')
    expect(text).toContain('3')
    expect(text).toContain('Status 7')
    expect(text).toContain('Не проверено')
    expect(text).toContain('Зона 1')
  })

  it('defines headers only for the warehouse parcel columns', () => {
    const wrapper = mount(OzonParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const headerKeys = wrapper.vm.headers.map((header) => header.key)
    expect(headerKeys).toEqual([
      'actions',
      'id',
      'postingNumber',
      'barcode',
      'boxNumber',
      'productName',
      'weightKg',
      'quantity',
      'zone',
      'statusId',
      'checkStatus'
    ])
  })

  it('sets defect from row action and reloads parcels for warehouse manager', async () => {
    isWhManager.value = true
    const wrapper = mount(OzonParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    loadParcels.mockClear()

    await wrapper.get('[data-testid="set-defect-action"]').trigger('click')
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
    mockItems.value = [{ ...mockItems.value[0], checkStatus: CheckStatusCode.Defect.value }]
    const wrapper = mount(OzonParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()
    loadParcels.mockClear()

    await wrapper.get('[data-testid="clear-defect-action"]').trigger('click')
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

  it('disables set defect action for duplicate and partner-marked projection statuses', async () => {
    isWhManager.value = true
    mockItems.value = [
      {
        ...mockItems.value[0],
        checkStatus: null,
        checkStatusProjection: { title: 'Дубликат' }
      },
      {
        ...mockItems.value[0],
        id: 2,
        checkStatus: null,
        checkStatusProjection: { title: 'Исключено партнёром' }
      }
    ]
    const wrapper = mount(OzonParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    const setDefectButtons = wrapper.findAll('[data-testid="set-defect-action"]')
    expect(setDefectButtons).toHaveLength(2)
    expect(setDefectButtons[0].attributes('disabled')).toBeDefined()
    expect(setDefectButtons[1].attributes('disabled')).toBeDefined()
  })

  it('renders product name in a non-wrapping truncated cell', () => {
    const wrapper = mount(OzonParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const productName = wrapper.get('.warehouse-product-name-cell')
    expect(productName.text()).toBe('Very long Ozon product name that must remain on one line')
    expect(productName.attributes('title')).toBe('Very long Ozon product name that must remain on one line')
  })
})
