/* @vitest-environment jsdom */
// Copyright (C) 2026

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import GtcParcels_List from '@/lists/GtcParcels_List.vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'

const mockItems = ref([
  {
    id: 1,
    postingNumber: 'P-1',
    lastName: 'Ivanov',
    firstName: 'Ivan',
    patronymic: 'Ivanovich',
    passportSeries: 'AA',
    passportNumber: '123456',
    passportIssuedBy: 'ОВД',
    passportIssueDate: '2020-01-01'
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

vi.mock('@/helpers/parcels.list.helpers.js', async () => {
  const actual = await vi.importActual('@/helpers/parcels.list.helpers.js')
  return {
    ...actual,
    loadOrders: vi.fn().mockResolvedValue()
  }
})

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
    getStatusTitle: vi.fn(id => `Status ${id}`),
    parcelStatuses: []
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
    parcels_status: ref(null),
    parcels_check_status_sw: ref(null),
    parcels_check_status_fc: ref(null),
    parcels_tnved: ref(''),
    parcels_number: ref(''),
    parcels_product_name: ref(''),
    selectedParcelId: ref(null)
  })
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: () => ({ query: {} }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
  }
})

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    error: vi.fn(),
    clear: vi.fn()
  })
}))

const globalStubs = {
  ...vuetifyStubs,
  RegisterHeadingWithStats: { template: '<div data-testid="register-heading"></div>' },
  PaginationFooter: { template: '<div data-testid="pagination-footer"></div>' }
}

describe('GtcParcels_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders formatted passport text in the passport column', async () => {
    const wrapper = mount(GtcParcels_List, {
      props: { registerId: 1 },
      global: { plugins: [createPinia()], stubs: globalStubs }
    })

    await resolveAll()

    const text = wrapper.text()
    expect(text).toContain('AA 123456 выдан ОВД 01.01.2020')
  })

  it('formatPassport returns correct strings for various inputs', async () => {
    const wrapper = mount(GtcParcels_List, {
      props: { registerId: 1 },
      global: { plugins: [createPinia()], stubs: globalStubs }
    })

    // Wait for component to initialize
    await resolveAll()

    const fn = wrapper.vm.formatPassport
    expect(fn({ passportSeries: 'AA', passportNumber: '123' })).toBe('AA 123')
    expect(fn({ passportSeries: 'AA', passportNumber: '123', passportIssuedBy: 'ОВД' })).toBe('AA 123 выдан ОВД')
    expect(fn({ passportSeries: 'AA', passportNumber: '123', passportIssueDate: '2020-01-01' })).toBe('AA 123 выдан 01.01.2020')
    expect(fn({})).toBe('')
  })
})
