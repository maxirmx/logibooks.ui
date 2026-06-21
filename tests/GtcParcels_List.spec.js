/* @vitest-environment jsdom */
// Copyright (C) 2026

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import GtcParcels_List from '@/lists/GtcParcels_List.vue'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import ActionButton from '@/components/ActionButton.vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'

const confirmMock = vi.hoisted(() => vi.fn())

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

const mockItems = ref([
  {
    id: 1,
    postingNumber: 'P-1',
    lastName: 'Ivanov',
    firstName: 'Ivan',
    patronymic: 'Ivanovich',
    inn: '770123456789',
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
    loadParcels: vi.fn().mockResolvedValue()
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
    parcels_hide_legacy_restrictions: ref(false),
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

function createMockItem(overrides = {}) {
  return {
    id: 1,
    postingNumber: 'P-1',
    lastName: 'Ivanov',
    firstName: 'Ivan',
    patronymic: 'Ivanovich',
    inn: '770123456789',
    passportSeries: 'AA',
    passportNumber: '123456',
    passportIssuedBy: 'ОВД',
    passportIssueDate: '2020-01-01',
    fellowItems: [],
    blockedByFellowItem: false,
    excsiseByFellowItem: false,
    markedByFellowItem: false,
    ...overrides
  }
}

describe('GtcParcels_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = [createMockItem()]
  })

  it('renders INN and formatted combined passport text', async () => {
    const wrapper = mount(GtcParcels_List, {
      props: { registerId: 1 },
      global: { plugins: [createPinia()], stubs: globalStubs }
    })

    await resolveAll()

    const text = wrapper.text()
    expect(text).toContain('770123456789')
    expect(text).toContain('AA 123456 выдан ОВД 01.01.2020')
  })

  it('uses a single combined passport column', async () => {
    const wrapper = mount(GtcParcels_List, {
      props: { registerId: 1 },
      global: { plugins: [createPinia()], stubs: globalStubs }
    })

    await resolveAll()

    const table = wrapper.findComponent({ name: 'v-data-table-server' })
    const keys = table.props('headers').map(header => header.key)

    expect(keys).toContain('inn')
    expect(keys.filter(key => key === 'passport' || key.startsWith('passport'))).toEqual(['passport'])
  })

  it('renders posting-number sibling indicators with the same flags as Ozon parcels', async () => {
    mockItems.value = [
      createMockItem({
        fellowItems: [2, 3, 4],
        blockedByFellowItem: true,
        excsiseByFellowItem: true,
        markedByFellowItem: true
      })
    ]

    const wrapper = mount(GtcParcels_List, {
      props: { registerId: 1 },
      global: { plugins: [createPinia()], stubs: globalStubs }
    })

    await resolveAll()

    const parcelNumberCell = wrapper.findComponent(ParcelNumberExt)
    expect(parcelNumberCell.exists()).toBe(true)
    expect(parcelNumberCell.props('fieldName')).toBe('postingNumber')
    expect(parcelNumberCell.props('item')).toMatchObject({
      postingNumber: 'P-1',
      fellowItems: [2, 3, 4],
      blockedByFellowItem: true,
      excsiseByFellowItem: true,
      markedByFellowItem: true
    })

    const fellowButtons = parcelNumberCell.findAllComponents(ActionButton)

    expect(fellowButtons).toHaveLength(3)
    expect(fellowButtons.map(button => button.props('icon'))).toEqual([
      'fa-solid fa-comment-slash',
      'fa-solid fa-comment-dollar',
      'fa-solid fa-comment-nodes'
    ])
    expect(fellowButtons.map(button => button.props('variant'))).toEqual([
      'red',
      'orange',
      'blue'
    ])
  })
})
