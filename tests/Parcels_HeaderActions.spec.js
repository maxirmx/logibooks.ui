/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, reactive } from 'vue'
import OzonParcelsList from '@/lists/OzonParcels_List.vue'
import WbrParcelsList from '@/lists/WbrParcels_List.vue'
import Wbr2ParcelsList from '@/lists/Wbr2Parcels_List.vue'
import GtcParcelsList from '@/lists/GtcParcels_List.vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn()
  }),
  useRoute: () => ({
    query: {}
  })
}))

const stores = {}
let registerHeaderActionsMock
const loadOrdersMock = vi.fn()
const useParcelMultiSelectMock = vi.fn(() => ({
  selectedParcelIds: ref(new Set()),
  lastClickedId: ref(null),
  selectedItems: ref([]),
  handleRowClick: vi.fn(),
  handleRowContextMenu: vi.fn(),
  updateSelectedParcelIds: vi.fn(),
  scrollToSelectedItem: vi.fn(),
  getRowProps: vi.fn(() => ({ class: '' })),
  stop: vi.fn()
}))

function createRegisterHeaderActionsMock() {
  return {
    validationState: reactive({ show: false, operation: null, total: 0, processed: 0 }),
    progressPercent: ref(0),
    actionDialog: reactive({ show: false, title: '' }),
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
    item: { id: 1, fileName: 'register.xlsx', invoiceNumber: 'INV-1', dealNumber: 'D-1', customsProcedureCode: 1 },
    ops: {
      customsProcedures: [{ value: 1, charCode: 'ЭК10', name: 'Экспорт', isRe: false, isExport: true }],
      transportationTypes: []
    },
    getById: vi.fn().mockResolvedValue(),
    generate: vi.fn(),
    download: vi.fn(),
    validate: vi.fn(),
    getValidationProgress: vi.fn(),
    cancelValidation: vi.fn(),
    lookupFeacnCodes: vi.fn(),
    getLookupFeacnCodesProgress: vi.fn(),
    cancelLookupFeacnCodes: vi.fn(),
    getAll: vi.fn(),
    ensureOpsLoaded: vi.fn().mockResolvedValue(),
    getTransportationDocument: vi.fn(() => 'Документ')
  }

  stores.parcelStatuses = {
    ensureLoaded: vi.fn().mockResolvedValue(),
    parcelStatuses: []
  }

  stores.customsProcedures = {
    procedures: ref([{ id: 1, code: 10 }]),
    ensureLoaded: vi.fn().mockResolvedValue()
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
    parcels_check_status_sw: ref(null),
    parcels_check_status_fc: ref(null),
    parcels_tnved: ref(''),
    parcels_number: ref(''),
    parcels_product_name: ref(''),
    selectedParcelId: ref(null),
    isSrLogistPlus: ref(true),
    isShiftLeadPlus: ref(true)
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
            parcels_check_status_sw: stores.auth.parcels_check_status_sw,
            parcels_check_status_fc: stores.auth.parcels_check_status_fc,
            parcels_tnved: stores.auth.parcels_tnved,
            parcels_number: stores.auth.parcels_number,
            parcels_product_name: stores.auth.parcels_product_name,
            selectedParcelId: stores.auth.selectedParcelId,
            isSrLogistPlus: stores.auth.isSrLogistPlus,
            isShiftLeadPlus: stores.auth.isShiftLeadPlus
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
  useRegistersStore: () => stores.registers,
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => stores.parcelStatuses
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

vi.mock('@/helpers/register.actions.js', () => ({
  useRegisterHeaderActions: vi.fn(() => registerHeaderActionsMock)
}))

vi.mock('@/composables/useParcelMultiSelect.js', () => ({
  useParcelMultiSelect: (...args) => useParcelMultiSelectMock(...args)
}))

vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  navigateToEditParcel: vi.fn(),
  validateParcelData: vi.fn(),
  getRowPropsForParcel: vi.fn(() => ({ class: '' })),
  filterGenericTemplateHeadersForParcel: vi.fn(() => []),
  generateRegisterName: vi.fn(() => 'Реестр'),
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

vi.mock('@/l2/AssignTnvedDialog.vue', () => ({
  default: { name: 'AssignTnvedDialog', template: '<div class="assign-tnved-dialog-stub"></div>' }
}))

describe.each([
  ['OzonParcels_List', OzonParcelsList, { hasHistoricActions: true, hasPreviousDTagComment: true }],
  ['WbrParcels_List', WbrParcelsList, { hasHistoricActions: true, hasPreviousDTagComment: true }],
  ['Wbr2Parcels_List', Wbr2ParcelsList, { hasHistoricActions: false, hasPreviousDTagComment: true }],
  ['GtcParcels_List', GtcParcelsList, { hasHistoricActions: false, hasPreviousDTagComment: false }]
])('%s header actions', (name, Component, capabilities) => {
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
    // Header actions include logist actions + xml split button + export/download + invoice split button + close button
    expect(buttons).toHaveLength(11)

    await buttons[0].trigger('click')
    expect(registerHeaderActionsMock.validateRegisterSw).toHaveBeenCalled()

    await buttons[1].trigger('click')
    if (capabilities.hasHistoricActions) {
      expect(registerHeaderActionsMock.validateRegisterSwEx).toHaveBeenCalled()
    } else {
      expect(registerHeaderActionsMock.validateRegisterSwEx).not.toHaveBeenCalled()
    }

    await buttons[2].trigger('click')
    expect(registerHeaderActionsMock.validateRegisterFc).toHaveBeenCalled()

    await buttons[3].trigger('click')
    expect(registerHeaderActionsMock.lookupFeacnCodes).toHaveBeenCalled()

    await buttons[4].trigger('click')
    if (capabilities.hasHistoricActions) {
      expect(registerHeaderActionsMock.lookupFeacnCodesEx).toHaveBeenCalled()
    } else {
      expect(registerHeaderActionsMock.lookupFeacnCodesEx).not.toHaveBeenCalled()
    }

    const actionMenus = wrapper.findAllComponents({ name: 'ActionButton2L' })
    const xmlExportMenu = actionMenus.find(
      (component) => component.props('tooltipText') === 'Выгрузить XML накладные'
    )
    expect(xmlExportMenu).toBeTruthy()
    const xmlOptions = xmlExportMenu.props('options')
    const ordinaryOption = xmlOptions.find((option) => option.label === 'Без акциза и нотификаций')
    const exciseOption = xmlOptions.find((option) => option.label === 'С акцизом')
    const notificationsOption = xmlOptions.find((option) => option.label === 'С нотификациями')

    expect(ordinaryOption).toBeTruthy()
    expect(exciseOption).toBeTruthy()
    expect(notificationsOption).toBeTruthy()

    await ordinaryOption.action()
    expect(registerHeaderActionsMock.exportAllXmlOrdinary).toHaveBeenCalled()

    await exciseOption.action()
    expect(registerHeaderActionsMock.exportAllXmlExcise).toHaveBeenCalled()

    await notificationsOption.action()
    expect(registerHeaderActionsMock.exportAllXmlNotifications).toHaveBeenCalled()

    await buttons[6].trigger('click')
    expect(registerHeaderActionsMock.downloadRegister).toHaveBeenCalled()

    // The close button is the last button (index 10); clicking it should emit 'close' from the list
    await buttons[10].trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('wires parcel multi-select composable', async () => {
    useParcelMultiSelectMock.mockClear()

    mount(Component, {
      props: { registerId: 11 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    expect(useParcelMultiSelectMock).toHaveBeenCalledTimes(1)
  })

  it('hides header actions when user lacks permissions', async () => {
    stores.auth.isSrLogistPlus.value = false
    stores.auth.isShiftLeadPlus.value = false

    const wrapper = mount(Component, {
      props: { registerId: 2 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    const buttons = wrapper.findAll('.header-actions .action-button-stub')
    // When user lacks logist role the first group is hidden, leaving xml split + export/download/invoice/close actions
    expect(buttons).toHaveLength(5)
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

  it('shows previousDTagComment and hides feacnLookup for reimport customs procedures', async () => {
    if (!capabilities.hasPreviousDTagComment) return
    stores.registers.item.customsProcedureCode = 2
    stores.registers.ops.customsProcedures = [{ value: 2, charCode: 'ИМ60', name: 'Реимпорт', isRe: true, isExport: false }]

    const wrapper = mount(Component, {
      props: { registerId: 4 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    const headerKeys = wrapper.vm.headers.map((header) => header.key)
    expect(headerKeys).toContain('previousDTagComment')
    expect(headerKeys).not.toContain('feacnLookup')
  })

  it('shows feacnLookup and hides previousDTagComment for non-reimport customs procedures', async () => {
    if (!capabilities.hasPreviousDTagComment) return
    stores.registers.item.customsProcedureCode = 3
    stores.registers.ops.customsProcedures = [{ value: 3, charCode: 'ЭК10', name: 'Экспорт', isRe: false, isExport: true }]

    const wrapper = mount(Component, {
      props: { registerId: 5 },
      global: { stubs: vuetifyStubs }
    })

    await resolveAll()

    const headerKeys = wrapper.vm.headers.map((header) => header.key)
    expect(headerKeys).toContain('feacnLookup')
    expect(headerKeys).not.toContain('previousDTagComment')
  })
})
