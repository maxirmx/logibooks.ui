/* @vitest-environment jsdom */
// Copyright (C) 2026

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import OzonParcelsWhList from '@/lists/OzonParcels_WhList.vue'
import { vuetifyStubs } from './helpers/test-utils.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'

const mockItems = ref([
  {
    id: 1,
    postingNumber: 'POST-1',
    barcode: 'BAR-1',
    boxCode: 'BOX-1',
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
  loadOrders: vi.fn().mockResolvedValue()
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    items: mockItems,
    loading: mockLoading,
    error: mockError,
    totalCount: mockTotalCount
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
    parcels_page: parcelsPage
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
  }
}

describe('OzonParcels_WhList.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders projected status, check status, and zone fields in the table', async () => {
    const wrapper = mount(OzonParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const text = wrapper.text()
    expect(text).toContain('POST-1')
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
      'id',
      'postingNumber',
      'barcode',
      'boxCode',
      'weightKg',
      'quantity',
      'zone',
      'statusId',
      'checkStatus'
    ])
  })
})
