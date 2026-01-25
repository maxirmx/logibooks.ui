/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import Wbr2ParcelsWhList from '@/lists/Wbr2Parcels_WhList.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const mockItems = ref([
  {
    id: 1,
    shk: 'SHK-1',
    stickerCode: 'ST-1',
    wbSticker: 'WB-1',
    sellerSticker: 'SL-1',
    weightKg: 2.4,
    quantity: 3,
    statusId: 7
  }
])
const mockLoading = ref(false)
const mockError = ref(null)
const mockTotalCount = ref(1)

const parcelsPerPage = ref(10)
const parcelsSortBy = ref([])
const parcelsPage = ref(1)

const registerItem = ref({ dealNumber: 'D-1' })

const ensureLoaded = vi.fn().mockResolvedValue()
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

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: registerItem,
    getById
  })
}))

vi.mock('@/stores/transportation.types.store.js', () => ({
  useTransportationTypesStore: () => ({
    ensureLoaded,
    getDocument: () => 'Документ'
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

const globalStubs = {
  ...vuetifyStubs,
  RegisterHeadingWithStats: {
    template: '<div data-testid="register-heading"></div>'
  },
  PaginationFooter: {
    template: '<div data-testid="pagination-footer"></div>'
  }
}

describe('Wbr2Parcels_WhList.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the required parcel fields in the table', async () => {
    const wrapper = mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const text = wrapper.text()
    expect(text).toContain('SHK-1')
    expect(text).toContain('ST-1')
    expect(text).toContain('WB-1')
    expect(text).toContain('SL-1')
    expect(text).toContain('3')
    expect(text).toContain('7')
  })

  it('defines headers only for the warehouse parcel columns', () => {
    const wrapper = mount(Wbr2ParcelsWhList, {
      props: { registerId: 1 },
      global: { stubs: globalStubs }
    })

    const headerKeys = wrapper.vm.headers.map((header) => header.key)
    expect(headerKeys).toEqual([
      'id',
      'shk',
      'stickerCode',
      'wbSticker',
      'sellerSticker',
      'weightKg',
      'quantity',
      'statusId'
    ])
  })
})
