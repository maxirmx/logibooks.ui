/* @vitest-environment jsdom */
// Copyright (C) 2026

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import OzonParcels_List from '@/lists/OzonParcels_List.vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'

const mockItems = ref([
  { id: 1, postingNumber: 'P-1', productName: 'Item1', checkStatus: 0 },
  { id: 2, postingNumber: 'P-2', productName: 'Item2', checkStatus: 0 },
  { id: 3, postingNumber: 'P-3', productName: 'Item3', checkStatus: 0 },
  { id: 4, postingNumber: 'P-4', productName: 'Item4', checkStatus: 0 },
  { id: 5, postingNumber: 'P-5', productName: 'Item5', checkStatus: 0 }
])
const mockLoading = ref(false)
const mockError = ref(null)
const mockTotalCount = ref(5)
const selectedParcelId = ref(null)

const parcelsPerPage = ref(100)
const parcelsSortBy = ref([])
const parcelsPage = ref(1)

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
    loadOrders: vi.fn().mockResolvedValue(),
    getRowPropsForParcel: vi.fn(() => ({ class: '' })),
    navigateToEditParcel: vi.fn(),
    validateParcelData: vi.fn().mockResolvedValue(),
    approveParcelData: vi.fn().mockResolvedValue(),
    filterGenericTemplateHeadersForParcel: vi.fn(() => []),
    exportParcelXmlData: vi.fn().mockResolvedValue(),
    lookupFeacn: vi.fn().mockResolvedValue(),
    getFeacnCodesForKeywords: vi.fn().mockResolvedValue()
  }
})

vi.mock('@/helpers/register.actions.js', () => ({
  useRegisterHeaderActions: () => ({
    validationState: ref(null),
    progressPercent: ref(0),
    actionDialog: ref(null),
    generalActionsDisabled: ref(false),
    validateRegisterSw: vi.fn(),
    validateRegisterSwEx: vi.fn(),
    validateRegisterFc: vi.fn(),
    lookupFeacnCodes: vi.fn(),
    lookupFeacnCodesEx: vi.fn(),
    exportAllXmlOrdinary: vi.fn(),
    exportAllXmlExcise: vi.fn(),
    exportAllXmlNotifications: vi.fn(),
    downloadRegister: vi.fn(),
    downloadTechdoc: vi.fn(),
    cancelValidation: vi.fn(),
    stop: vi.fn()
  })
}))

vi.mock('@/composables/useDebouncedFilterSync.js', () => ({
  useDebouncedFilterSync: () => ({
    triggerLoad: vi.fn(),
    stop: vi.fn()
  })
}))

vi.mock('@/composables/useParcelSelectionRestore.js', () => ({
  useParcelSelectionRestore: () => ({
    restoreSelectedParcelIdSnapshot: vi.fn(() => null)
  })
}))

vi.mock('@/helpers/register.heading.helpers.js', () => ({
  buildParcelListHeading: vi.fn(() => 'Test Heading')
}))

vi.mock('@/helpers/ozon.register.mapping.js', () => ({
  ozonRegisterColumnTitles: {}
}))

vi.mock('@/helpers/parcels.check.helpers.js', () => ({
  getCheckStatusClass: vi.fn(() => '')
}))

// check.status.code.js uses real implementation (has static methods needed by template)

vi.mock('@/helpers/number.formatters.js', () => ({
  formatWeight: vi.fn(v => String(v)),
  formatPrice: vi.fn(v => String(v))
}))

vi.mock('@/helpers/url.helpers.js', () => ({
  ensureHttps: vi.fn(v => v)
}))

vi.mock('@/helpers/parcel.number.ext.helpers.js', () => ({
  handleFellowsClick: vi.fn()
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [10, 25, 50, 100]
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
    getStatusTitle: vi.fn(id => `Status ${id}`),
    parcelStatuses: []
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: ref({ dealNumber: 'D-1' }),
    ops: { customsProcedures: [], transportationTypes: [] },
    getById: vi.fn().mockResolvedValue(),
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
    selectedParcelId
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

vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue() })
}))

vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue() })
}))

vi.mock('@/stores/feacn.orders.store.js', () => ({
  useFeacnOrdersStore: () => ({ ensureLoaded: vi.fn().mockResolvedValue() })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    getCountryAlpha2: vi.fn(code => code)
  })
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const globalStubs = {
  ...vuetifyStubs,
  RegisterHeadingWithStats: { template: '<div data-testid="register-heading"></div>' },
  RegisterHeaderActionsBar: { template: '<div data-testid="register-header-actions"></div>' },
  PaginationFooter: { template: '<div data-testid="pagination-footer"></div>' },
  RegisterActionsDialogs: { template: '<div></div>' },
  AssignTnvedDialog: { template: '<div></div>' },
  ParcelFilterSelectors: { template: '<div data-testid="parcel-filter-selectors"></div>' },
  FeacnCodeSelector: { template: '<div></div>' },
  FeacnCodeCurrent: { template: '<div></div>' },
  ParcelNumberExt: { template: '<div></div>' },
  ClickableCell: { template: '<div></div>' },
  ActionButton: { template: '<div></div>' }
}

describe('OzonParcels_List.vue – multi-select', () => {
  let wrapper

  beforeEach(async () => {
    vi.clearAllMocks()
    selectedParcelId.value = null
    mockItems.value = [
      { id: 1, postingNumber: 'P-1', productName: 'Item1', checkStatus: 0 },
      { id: 2, postingNumber: 'P-2', productName: 'Item2', checkStatus: 0 },
      { id: 3, postingNumber: 'P-3', productName: 'Item3', checkStatus: 0 },
      { id: 4, postingNumber: 'P-4', productName: 'Item4', checkStatus: 0 },
      { id: 5, postingNumber: 'P-5', productName: 'Item5', checkStatus: 0 }
    ]
    mockTotalCount.value = 5

    wrapper = mount(OzonParcels_List, {
      props: { registerId: 1 },
      global: { plugins: [createPinia()], stubs: globalStubs }
    })

    await resolveAll()
  })

  it('plain click selects a single row', () => {
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[1] })

    expect(wrapper.vm.selectedParcelIds.size).toBe(1)
    expect(wrapper.vm.selectedParcelIds.has(2)).toBe(true)
    expect(selectedParcelId.value).toBe(2)
  })

  it('plain click replaces previous selection', () => {
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[0] })
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[2] })

    expect(wrapper.vm.selectedParcelIds.size).toBe(1)
    expect(wrapper.vm.selectedParcelIds.has(3)).toBe(true)
    expect(wrapper.vm.selectedParcelIds.has(1)).toBe(false)
  })

  it('Ctrl+Click toggles individual rows', () => {
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[0] })
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: true, metaKey: false }, { item: mockItems.value[2] })

    expect(wrapper.vm.selectedParcelIds.size).toBe(2)
    expect(wrapper.vm.selectedParcelIds.has(1)).toBe(true)
    expect(wrapper.vm.selectedParcelIds.has(3)).toBe(true)

    // Toggle off
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: true, metaKey: false }, { item: mockItems.value[0] })
    expect(wrapper.vm.selectedParcelIds.size).toBe(1)
    expect(wrapper.vm.selectedParcelIds.has(1)).toBe(false)
    expect(wrapper.vm.selectedParcelIds.has(3)).toBe(true)
  })

  it('Shift+Click selects a range', () => {
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[0] })
    wrapper.vm.handleRowClick({ shiftKey: true, ctrlKey: false, metaKey: false }, { item: mockItems.value[3] })

    expect(wrapper.vm.selectedParcelIds.size).toBe(4)
    expect([...wrapper.vm.selectedParcelIds].sort()).toEqual([1, 2, 3, 4])
  })

  it('Shift+Click backwards selects a range', () => {
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[4] })
    wrapper.vm.handleRowClick({ shiftKey: true, ctrlKey: false, metaKey: false }, { item: mockItems.value[1] })

    expect(wrapper.vm.selectedParcelIds.size).toBe(4)
    expect([...wrapper.vm.selectedParcelIds].sort()).toEqual([2, 3, 4, 5])
  })

  it('Shift+Click replaces previous selection without Ctrl', () => {
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: true, metaKey: false }, { item: mockItems.value[4] })
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[0] })
    wrapper.vm.handleRowClick({ shiftKey: true, ctrlKey: false, metaKey: false }, { item: mockItems.value[2] })

    // Only 1-3 selected, not 5
    expect(wrapper.vm.selectedParcelIds.has(5)).toBe(false)
    expect([...wrapper.vm.selectedParcelIds].sort()).toEqual([1, 2, 3])
  })

  it('Ctrl+Shift+Click extends range onto existing selection', () => {
    // Select rows 1 and 2 via Ctrl
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[0] })
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: true, metaKey: false }, { item: mockItems.value[1] })

    // Shift+Ctrl from row 2 anchor to row 5
    wrapper.vm.handleRowClick({ shiftKey: true, ctrlKey: true, metaKey: false }, { item: mockItems.value[4] })

    // All 5 should be selected (1,2 from Ctrl, 2-5 from Shift range)
    expect(wrapper.vm.selectedParcelIds.size).toBe(5)
  })

  it('selectedItems returns the correct items', () => {
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[0] })
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: true, metaKey: false }, { item: mockItems.value[3] })

    const selected = wrapper.vm.selectedItems
    expect(selected).toHaveLength(2)
    expect(selected.map(i => i.id)).toEqual([1, 4])
  })

  it('Meta+Click works like Ctrl+Click (macOS)', () => {
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: false }, { item: mockItems.value[0] })
    wrapper.vm.handleRowClick({ shiftKey: false, ctrlKey: false, metaKey: true }, { item: mockItems.value[2] })

    expect(wrapper.vm.selectedParcelIds.size).toBe(2)
    expect(wrapper.vm.selectedParcelIds.has(1)).toBe(true)
    expect(wrapper.vm.selectedParcelIds.has(3)).toBe(true)
  })
})
