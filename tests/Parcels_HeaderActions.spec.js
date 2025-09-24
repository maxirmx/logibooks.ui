/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import OzonParcelsList from '@/lists/OzonParcels_List.vue'
import WbrParcelsList from '@/lists/WbrParcels_List.vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'

const stores = {}
let registerHeaderActionsMock
const loadOrdersMock = vi.fn()

function createRegisterHeaderActionsMock() {
  return {
    validationState: reactive({ show: false, operation: null, total: 0, processed: 0 }),
    progressPercent: ref(0),
    actionDialog: reactive({ show: false, title: '' }),
    generalActionsDisabled: ref(false),
    validateRegisterSw: vi.fn(),
    validateRegisterFc: vi.fn(),
    lookupFeacnCodes: vi.fn(),
    exportAllXmlWithoutExcise: vi.fn(),
    exportAllXmlExcise: vi.fn(),
    downloadRegister: vi.fn(),
    cancelValidation: vi.fn(),
    stop: vi.fn()
  }
}

function setupStores() {
  stores.parcels = {
    items: ref([]),
    loading: ref(false),
    error: ref(null),
    totalCount: ref(0)
  }

  stores.registers = {
    item: { id: 1, fileName: 'register.xlsx', invoiceNumber: 'INV-1', dealNumber: 'D-1' },
    getById: vi.fn().mockResolvedValue(),
    generate: vi.fn(),
    download: vi.fn(),
    validate: vi.fn(),
    getValidationProgress: vi.fn(),
    cancelValidation: vi.fn(),
    lookupFeacnCodes: vi.fn(),
    getLookupFeacnCodesProgress: vi.fn(),
    cancelLookupFeacnCodes: vi.fn(),
    getAll: vi.fn()
  }

  stores.parcelStatuses = {
    ensureLoaded: vi.fn().mockResolvedValue(),
    parcelStatuses: []
  }

  stores.parcelCheckStatuses = {
    ensureLoaded: vi.fn().mockResolvedValue(),
    statuses: [],
    getStatusTitle: vi.fn(() => 'Status')
  }

  stores.keyWords = {
    ensureLoaded: vi.fn().mockResolvedValue(),
    keyWords: []
  }

  stores.stopWords = {
    ensureLoaded: vi.fn().mockResolvedValue(),
    stopWords: []
  }

  stores.feacnOrders = {
    ensureLoaded: vi.fn().mockResolvedValue(),
    orders: []
  }

  stores.countries = {
    ensureLoaded: vi.fn().mockResolvedValue(),
    countries: [],
    getCountryAlpha2: vi.fn(() => 'RU')
  }

  stores.auth = {
    parcels_per_page: ref(100),
    parcels_sort_by: ref([]),
    parcels_page: ref(1),
    parcels_status: ref(null),
    parcels_check_status: ref(null),
    parcels_tnved: ref(''),
    parcels_number: ref(''),
    selectedParcelId: ref(null),
    isAdminOrSrLogist: ref(true)
  }

  stores.alert = {
    alert: ref(null),
    clear: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  }
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  const actualStoreToRefs = actual.storeToRefs
  return {
    ...actual,
    storeToRefs: (store) => {
      switch (store) {
        case stores.parcels:
          return {
            items: stores.parcels.items,
            loading: stores.parcels.loading,
            error: stores.parcels.error,
            totalCount: stores.parcels.totalCount
          }
        case stores.auth:
          return {
            parcels_per_page: stores.auth.parcels_per_page,
            parcels_sort_by: stores.auth.parcels_sort_by,
            parcels_page: stores.auth.parcels_page,
            parcels_status: stores.auth.parcels_status,
            parcels_check_status: stores.auth.parcels_check_status,
            parcels_tnved: stores.auth.parcels_tnved,
            parcels_number: stores.auth.parcels_number,
            selectedParcelId: stores.auth.selectedParcelId,
            isAdminOrSrLogist: stores.auth.isAdminOrSrLogist
          }
        case stores.alert:
          return { alert: stores.alert.alert }
        default:
          return actualStoreToRefs(store)
      }
    }
  }
})

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => stores.parcels
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => stores.registers
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => stores.parcelStatuses
}))

vi.mock('@/stores/parcel.checkstatuses.store.js', () => ({
  useParcelCheckStatusStore: () => stores.parcelCheckStatuses
}))

vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => stores.keyWords
}))

vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => stores.stopWords
}))

vi.mock('@/stores/feacn.orders.store.js', () => ({
  useFeacnOrdersStore: () => stores.feacnOrders
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => stores.countries
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => stores.auth
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => stores.alert
}))

vi.mock('@/helpers/register.header.actions.js', () => ({
  useRegisterHeaderActions: vi.fn(() => registerHeaderActionsMock)
}))

vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  navigateToEditParcel: vi.fn(),
  validateParcelData: vi.fn(),
  approveParcelData: vi.fn(),
  getRowPropsForParcel: vi.fn(() => ({ class: '' })),
  filterGenericTemplateHeadersForParcel: vi.fn(() => []),
  generateRegisterName: vi.fn(() => 'Реестр'),
  exportParcelXmlData: vi.fn(),
  lookupFeacn: vi.fn(),
  getFeacnCodesForKeywords: vi.fn(() => []),
  loadOrders: vi.fn((...args) => {
    loadOrdersMock(...args)
    return Promise.resolve()
  })
}))

vi.mock('@/helpers/url.helpers.js', () => ({
  ensureHttps: (url) => url
}))

vi.mock('@/router', () => ({
  default: { push: vi.fn(), replace: vi.fn() }
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button class="action-button-stub" :data-icon="icon" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

vi.mock('@/components/ClickableCell.vue', () => ({
  default: {
    name: 'ClickableCell',
    props: ['item', 'displayValue', 'cellClass'],
    template: '<div class="clickable-cell-stub"><slot></slot></div>'
  }
}))

vi.mock('@/components/FeacnCodeSelector.vue', () => ({
  default: { name: 'FeacnCodeSelector', template: '<div class="feacn-selector-stub"></div>' }
}))

vi.mock('@/components/FeacnCodeCurrent.vue', () => ({
  default: { name: 'FeacnCodeCurrent', template: '<div class="feacn-current-stub"></div>' }
}))

vi.mock('@/components/ParcelNumberExt.vue', () => ({
  default: {
    name: 'ParcelNumberExt',
    props: ['item', 'fieldName'],
    emits: ['click', 'fellows'],
    template: '<button class="parcel-number-ext-stub" @click="$emit(\'click\', item)"></button>'
  }
}))

describe.each([
  ['OzonParcels_List', OzonParcelsList],
  ['WbrParcels_List', WbrParcelsList]
])('%s header actions', (name, Component) => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupStores()
    loadOrdersMock.mockClear()
    registerHeaderActionsMock = createRegisterHeaderActionsMock()
  })

  it('renders header actions and triggers register operations', async () => {
    const wrapper = mount(Component, {
      props: { registerId: 1 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    const buttons = wrapper.findAll('.header-actions .action-button-stub')
    expect(buttons).toHaveLength(6)

    await buttons[0].trigger('click')
    expect(registerHeaderActionsMock.validateRegisterSw).toHaveBeenCalled()

    await buttons[1].trigger('click')
    expect(registerHeaderActionsMock.validateRegisterFc).toHaveBeenCalled()

    await buttons[2].trigger('click')
    expect(registerHeaderActionsMock.lookupFeacnCodes).toHaveBeenCalled()

    await buttons[3].trigger('click')
    expect(registerHeaderActionsMock.exportAllXmlWithoutExcise).toHaveBeenCalled()

    await buttons[4].trigger('click')
    expect(registerHeaderActionsMock.exportAllXmlExcise).toHaveBeenCalled()

    await buttons[5].trigger('click')
    expect(registerHeaderActionsMock.downloadRegister).toHaveBeenCalled()
  })

  it('hides header actions when user lacks permissions', async () => {
    stores.auth.isAdminOrSrLogist.value = false

    const wrapper = mount(Component, {
      props: { registerId: 2 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    expect(wrapper.find('.header-actions').exists()).toBe(false)
  })

  it('calls stop handler on unmount', async () => {
    const wrapper = mount(Component, {
      props: { registerId: 3 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    wrapper.unmount()
    expect(registerHeaderActionsMock.stop).toHaveBeenCalled()
  })
})
