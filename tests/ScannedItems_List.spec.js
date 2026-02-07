/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ScannedItemsList from '@/lists/ScannedItems_List.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const mockItems = ref([
  {
    id: 11,
    code: 'CODE-1',
    scanTime: '2024-01-02T09:30:00',
    userName: 'Operator',
    number: 'N-100'
  }
])
const mockLoading = ref(false)
const mockError = ref(null)
const mockTotalCount = ref(1)
const mockScanjob = ref({ id: 7, name: 'Scanjob A' })

const scannedItemsPerPage = ref(10)
const scannedItemsPage = ref(1)
const scannedItemsSortBy = ref([])
const scannedItemsId = ref('')
const scannedItemsCode = ref('')
const scannedItemsScanTimeFrom = ref('')
const scannedItemsScanTimeTo = ref('')
const scannedItemsUserName = ref('')
const scannedItemsNumber = ref('')

const getScannedItems = vi.fn().mockResolvedValue()
const getById = vi.fn().mockResolvedValue({ id: 7, name: 'Scanjob A' })

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

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    scannedItems: mockItems,
    scannedItemsLoading: mockLoading,
    scannedItemsError: mockError,
    scannedItemsTotalCount: mockTotalCount,
    scanjob: mockScanjob,
    getScannedItems,
    getById
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    scanneditems_per_page: scannedItemsPerPage,
    scanneditems_page: scannedItemsPage,
    scanneditems_sort_by: scannedItemsSortBy,
    scanneditems_id: scannedItemsId,
    scanneditems_code: scannedItemsCode,
    scanneditems_scan_time_from: scannedItemsScanTimeFrom,
    scanneditems_scan_time_to: scannedItemsScanTimeTo,
    scanneditems_user_name: scannedItemsUserName,
    scanneditems_number: scannedItemsNumber
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: alertRef,
    error: alertError,
    clear: alertClear
  })
}))

vi.mock('@/composables/useDebouncedFilterSync.js', () => ({
  useDebouncedFilterSync: () => ({
    triggerLoad: vi.fn(),
    stop: vi.fn()
  })
}))

const globalStubs = {
  ...vuetifyStubs,
  PaginationFooter: {
    template: '<div data-testid="pagination-footer"></div>'
  }
}

describe('ScannedItems_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders scanned item data', async () => {
    const wrapper = mount(ScannedItemsList, {
      props: { scanjobId: 7 },
      global: { stubs: globalStubs }
    })

    await wrapper.vm.$nextTick()

    const text = wrapper.text()
    expect(text).toContain('CODE-1')
    expect(text).toContain('Operator')
    expect(text).toContain('N-100')
    expect(text).toContain('02.01.2024')
  })

  it('defines headers for scanned item columns', () => {
    const wrapper = mount(ScannedItemsList, {
      props: { scanjobId: 7 },
      global: { stubs: globalStubs }
    })

    const headerKeys = wrapper.vm.headers.map((header) => header.key)
    expect(headerKeys).toEqual(['id', 'code', 'scanTime', 'userName', 'number'])
  })
})
