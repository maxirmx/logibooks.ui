/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { vuetifyStubs, resolveAll } from './helpers/test-utils.js'
import { CheckStatusCode, FCCheckStatus, SWCheckStatus } from '@/helpers/check.status.code.js'

let WbrNParcelsList

const loadParcels = vi.fn().mockResolvedValue()
const navigateToEditParcel = vi.fn()
const handleFellowsClick = vi.fn()
const triggerLoad = vi.fn()
const stopFilterSync = vi.fn()
const restoreSelectedParcelIdSnapshot = vi.fn()
const stopRegisterHeaderActions = vi.fn()
const stopMultiSelect = vi.fn()
const updateSelectedParcelIds = vi.fn()
const scrollToSelectedItem = vi.fn()
const handleRowClick = vi.fn()
const handleRowContextMenu = vi.fn()
let parcelMultiSelectOptions = null

const mockItems = ref([])
const mockLoading = ref(false)
const mockTotalCount = ref(1)
const mockParcelError = ref(null)
const mockAlert = ref(null)

const parcelsPerPage = ref(10)
const parcelsSortBy = ref([])
const parcelsPage = ref(1)
const parcelsStatus = ref(null)
const parcelsCheckStatusSw = ref(null)
const parcelsCheckStatusFc = ref(null)
const parcelsHideLegacyRestrictions = ref(false)
const parcelsTnved = ref('')
const parcelsNumber = ref('')
const parcelsProductName = ref('')
const selectedParcelId = ref(null)
const selectedParcelIds = ref(new Set([10, 11]))
const lastClickedId = ref(null)

const registerItem = {
  id: 7,
  fileName: 'wbrn.xlsx',
  dealNumber: 'D-7',
  customsProcedureCode: 1,
  registerType: 2097154,
  customsFee: 689,
  customsDuty: 750
}
const registerOps = {
  customsProcedures: [
    { value: 1, isRe: false },
    { value: 2, isRe: true }
  ],
  transportationTypes: []
}
const getRegisterById = vi.fn().mockResolvedValue()
const ensureOpsLoaded = vi.fn().mockResolvedValue()

const parcelStatuses = [
  { id: 5, title: 'На проверке' },
  { id: 8, title: 'Выпущена' }
]
const ensureParcelStatusesLoaded = vi.fn().mockResolvedValue()
const ensureStopWordsLoaded = vi.fn().mockResolvedValue()
const ensureKeyWordsLoaded = vi.fn().mockResolvedValue()
const ensureFeacnOrdersLoaded = vi.fn().mockResolvedValue()
const bulkAssignTnved = vi.fn().mockResolvedValue()
const alertError = vi.fn()
const alertClear = vi.fn()

const headerActions = {
  validateRegisterSw: vi.fn(),
  validateRegisterSwEx: vi.fn(),
  validateRegisterFc: vi.fn(),
  lookupFeacnCodes: vi.fn(),
  lookupFeacnCodesEx: vi.fn(),
  exportAllXmlOrdinary: vi.fn(),
  exportAllXmlExcise: vi.fn(),
  exportAllXmlNotifications: vi.fn(),
  downloadRegister: vi.fn(),
  downloadAdditionalRestrictions: vi.fn(),
  downloadTechdoc: vi.fn(),
  freezeCheckStatus: vi.fn().mockResolvedValue(),
  freezeTnVedOrder: vi.fn().mockResolvedValue(),
  calculateCustomCharges: vi.fn().mockResolvedValue(),
  cancelValidation: vi.fn(),
}

let routeQuery = {}

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

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: () => ({ query: routeQuery })
  }
})

vi.mock('@/router', () => ({
  default: {
    push: vi.fn(),
    replace: vi.fn()
  }
}))

vi.mock('@/helpers/parcels.list.helpers.js', async () => {
  const actual = await vi.importActual('@/helpers/parcels.list.helpers.js')
  return {
    ...actual,
    loadParcels,
    navigateToEditParcel,
    getRowPropsForParcel: (data) => ({ class: data?.item?.id === selectedParcelId.value ? 'selected-parcel-row' : '' }),
    filterGenericTemplateHeadersForParcel: (headers) => headers.filter(header => ![
      'frozenOrder',
      'checkStatus',
      'tnVed',
      'feacnLookup',
      'productLink',
      'weightKg',
      'quantity',
      'unitPrice',
      'shk',
      'statusId',
      'dTag',
      'customsFee',
      'customsDuty',
      'previousDTagComment'
    ].includes(header.key)),
    getFeacnCodesForKeywords: (ids) => (ids || []).map(id => `TN-${id}`),
    getFrozenOrderSortDir: (sortBy) => sortBy?.find(item => item.key === 'frozenOrder')?.order ?? null
  }
})

vi.mock('@/helpers/parcel.number.ext.helpers.js', () => ({
  handleFellowsClick
}))

vi.mock('@/helpers/register.actions.js', () => ({
  useRegisterHeaderActions: () => ({
    validationState: ref(null),
    progressPercent: ref(0),
    actionDialog: ref({ open: false }),
    generalActionsDisabled: ref(false),
    ...headerActions,
    stop: stopRegisterHeaderActions
  })
}))

vi.mock('@/composables/useDebouncedFilterSync.js', () => ({
  useDebouncedFilterSync: () => ({
    triggerLoad,
    stop: stopFilterSync
  })
}))

vi.mock('@/composables/useParcelSelectionRestore.js', () => ({
  useParcelSelectionRestore: () => ({
    restoreSelectedParcelIdSnapshot
  })
}))

vi.mock('@/composables/useParcelMultiSelect.js', () => ({
  useParcelMultiSelect: (options) => {
    parcelMultiSelectOptions = options
    return {
      selectedParcelIds,
      lastClickedId,
      handleRowClick,
      handleRowContextMenu,
      updateSelectedParcelIds,
      scrollToSelectedItem,
      getRowProps: (data) => ({ class: data?.item?.id === selectedParcelId.value ? 'selected-parcel-row' : '' }),
      stop: stopMultiSelect
    }
  }
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    items: mockItems,
    loading: mockLoading,
    totalCount: mockTotalCount,
    error: mockParcelError,
    bulkAssignTnved
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: registerItem,
    ops: registerOps,
    getById: getRegisterById,
    ensureOpsLoaded,
    getTransportationDocument: vi.fn(() => 'CMR')
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    parcelStatuses,
    ensureLoaded: ensureParcelStatusesLoaded,
    getStatusTitle: vi.fn(id => `Status ${id}`)
  })
}))

vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => ({
    ensureLoaded: ensureStopWordsLoaded
  })
}))

vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => ({
    ensureLoaded: ensureKeyWordsLoaded
  })
}))

vi.mock('@/stores/feacn.orders.store.js', () => ({
  useFeacnOrdersStore: () => ({
    ensureLoaded: ensureFeacnOrdersLoaded
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    parcels_per_page: parcelsPerPage,
    parcels_sort_by: parcelsSortBy,
    parcels_page: parcelsPage,
    parcels_status: parcelsStatus,
    parcels_check_status_sw: parcelsCheckStatusSw,
    parcels_check_status_fc: parcelsCheckStatusFc,
    parcels_hide_legacy_restrictions: parcelsHideLegacyRestrictions,
    parcels_tnved: parcelsTnved,
    parcels_number: parcelsNumber,
    parcels_product_name: parcelsProductName,
    selectedParcelId
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    error: alertError,
    clear: alertClear
  })
}))

const sampleParcel = {
  id: 10,
  registerId: 7,
  shk: 'SHK-N-1',
  article: '29817781',
  checkStatus: new CheckStatusCode({ fc: FCCheckStatus.NoIssues, sw: SWCheckStatus.NoIssues }).value,
  tnVed: '6403999300',
  keyWordIds: [3],
  productName: 'Wildberries new product',
  productLink: 'www.wildberries.ru/catalog/29817781/detail.aspx',
  productCountryName: 'Китай',
  weightKg: 1.25,
  quantity: 2,
  unitPrice: 19.5,
  currency: 'CNY',
  lastName: 'Ivanov',
  firstName: 'Ivan',
  patronymic: 'Ivanovich',
  recipientCountryName: 'Узбекистан',
  recipientCity: 'Ташкент',
  recipientAddress: 'ул. Навои, 1',
  passportNumber: 'AA1234567',
  statusId: 5,
  dTag: 'DT-1',
  customsFee: 689,
  customsDuty: 750,
  previousDTagComment: 'previous comment'
}

const globalStubs = {
  ...vuetifyStubs,
  'v-data-table-server': {
    name: 'v-data-table-server',
    props: ['items', 'headers', 'loading', 'itemsLength', 'itemsPerPage', 'page', 'sortBy', 'itemsPerPageOptions', 'rowProps'],
    emits: ['update:itemsPerPage', 'update:page', 'update:sortBy', 'click:row', 'contextmenu:row'],
    template: `
      <div class="v-data-table-stub" data-testid="v-data-table">
        <button data-testid="table-update-items-per-page" @click="$emit('update:itemsPerPage', 100)"></button>
        <button data-testid="table-update-page" @click="$emit('update:page', 4)"></button>
        <button data-testid="table-update-sort" @click="$emit('update:sortBy', [{ key: 'shk', order: 'asc' }])"></button>
        <button data-testid="table-click-row" @click="$emit('click:row', {}, { item: items[0] })"></button>
        <button data-testid="table-context-row" @click="$emit('contextmenu:row', {}, { item: items[0] })"></button>
        <div v-for="header in headers" :key="header.key" class="v-data-table-header-cell">
          <slot :name="'header.' + header.key" :column="header">{{ header.title }}</slot>
        </div>
        <div v-for="(item, i) in items" :key="i" class="v-data-table-row">
          <div v-for="header in headers" :key="header.key" class="v-data-table-cell">
            <slot :name="'item.' + header.key" :item="item">{{ item[header.key] }}</slot>
          </div>
        </div>
      </div>
    `
  },
  RegisterHeadingWithStats: {
    props: ['heading'],
    template: '<div data-testid="register-heading">{{ heading }}</div>'
  },
  RegisterHeaderActionsBar: {
    emits: [
      'validate-sw',
      'validate-sw-ex',
      'validate-fc',
      'lookup',
      'lookup-ex',
      'export-ordinary',
      'export-excise',
      'export-notifications',
      'download',
      'download-additional-restrictions',
      'download-techdoc',
      'calculate-custom-charges',
      'bulk-change-parcel-status',
      'freeze-check-status',
      'freeze-tnved-order',
      'close'
    ],
    template: `
      <div data-testid="register-header-actions">
        <button data-testid="validate-sw" @click="$emit('validate-sw')"></button>
        <button data-testid="validate-sw-ex" @click="$emit('validate-sw-ex')"></button>
        <button data-testid="validate-fc" @click="$emit('validate-fc')"></button>
        <button data-testid="lookup" @click="$emit('lookup')"></button>
        <button data-testid="lookup-ex" @click="$emit('lookup-ex')"></button>
        <button data-testid="export-ordinary" @click="$emit('export-ordinary')"></button>
        <button data-testid="export-excise" @click="$emit('export-excise')"></button>
        <button data-testid="export-notifications" @click="$emit('export-notifications')"></button>
        <button data-testid="download" @click="$emit('download')"></button>
        <button data-testid="download-additional-restrictions" @click="$emit('download-additional-restrictions')"></button>
        <button data-testid="download-techdoc" @click="$emit('download-techdoc')"></button>
        <button data-testid="calculate-custom-charges" @click="$emit('calculate-custom-charges')"></button>
        <button data-testid="bulk-status" @click="$emit('bulk-change-parcel-status')"></button>
        <button data-testid="freeze-check-status" @click="$emit('freeze-check-status')"></button>
        <button data-testid="freeze-tnved-order" @click="$emit('freeze-tnved-order')"></button>
        <button data-testid="close-list" @click="$emit('close')"></button>
      </div>
    `
  },
  ParcelFilterSelectors: {
    props: ['statusOptions', 'checkStatusOptionsSw', 'checkStatusOptionsFc'],
    emits: [
      'update:parcelsStatus',
      'update:parcelsCheckStatusSw',
      'update:parcelsCheckStatusFc',
      'update:parcelsHideLegacyRestrictions',
      'update:localTnvedSearch',
      'update:localParcelNumberSearch',
      'update:localProductNameSearch'
    ],
    template: `
      <div data-testid="parcel-filter-selectors">
        {{ statusOptions.length }} {{ checkStatusOptionsSw.length }} {{ checkStatusOptionsFc.length }}
        <button data-testid="update-parcels-status" @click="$emit('update:parcelsStatus', 5)"></button>
        <button data-testid="update-parcels-check-status-sw" @click="$emit('update:parcelsCheckStatusSw', 16)"></button>
        <button data-testid="update-parcels-check-status-fc" @click="$emit('update:parcelsCheckStatusFc', 16)"></button>
        <button data-testid="update-hide-legacy" @click="$emit('update:parcelsHideLegacyRestrictions', true)"></button>
        <button data-testid="update-tnved-search" @click="$emit('update:localTnvedSearch', '6403')"></button>
        <button data-testid="update-number-search" @click="$emit('update:localParcelNumberSearch', 'SHK')"></button>
        <button data-testid="update-product-search" @click="$emit('update:localProductNameSearch', 'boots')"></button>
      </div>
    `
  },
  ClickableCell: {
    props: ['item', 'displayValue', 'cellClass'],
    emits: ['click'],
    template: '<button type="button" :class="cellClass" :title="displayValue" @click="$emit(\'click\', item)"><slot>{{ displayValue }}</slot></button>'
  },
  FeacnCodeCurrent: {
    props: ['item', 'feacnCodes'],
    emits: ['click'],
    template: '<button type="button" data-testid="feacn-current" @click="$emit(\'click\', item)">{{ item.tnVed }} {{ feacnCodes.join(\',\') }}</button>'
  },
  FeacnCodeSelector: {
    props: ['item'],
    template: '<span data-testid="feacn-selector">lookup {{ item.id }}</span>'
  },
  ParcelNumberExt: {
    props: ['item', 'fieldName'],
    emits: ['click', 'fellows'],
    template: '<button type="button" data-testid="parcel-number-ext" @click="$emit(\'click\', item)"><span>{{ item[fieldName] }}</span><span data-testid="fellows" @click.stop="$emit(\'fellows\', item)">fellows</span></button>'
  },
  CorrectedWeightDisplay: {
    props: ['weight'],
    template: '<span data-testid="corrected-weight">{{ Number(weight).toFixed(3) }}</span>'
  },
  ActionButton: {
    props: ['item', 'disabled'],
    emits: ['click'],
    template: '<button type="button" data-testid="row-action" :disabled="disabled" @click="$emit(\'click\', item)"><slot /></button>'
  },
  'font-awesome-icon': {
    props: ['icon'],
    template: '<i data-testid="fa-icon" :data-icon="icon"></i>'
  },
  PaginationFooter: {
    emits: ['update:itemsPerPage', 'update:page'],
    template: '<div data-testid="pagination-footer"><button data-testid="update-items-per-page" @click="$emit(\'update:itemsPerPage\', 25)"></button><button data-testid="update-page" @click="$emit(\'update:page\', 2)"></button></div>'
  },
  RegisterActionsDialogs: {
    props: ['validationState', 'progressPercent', 'actionDialog'],
    template: '<div data-testid="register-actions-dialogs"></div>'
  },
  AssignTnvedDialog: {
    props: ['show', 'selectedIds'],
    emits: ['confirm', 'update:show'],
    template: '<div data-testid="assign-tnved-dialog" :data-show="String(show)" :data-selected="selectedIds.join(\',\')"><button type="button" data-testid="assign-confirm" @click="$emit(\'confirm\', selectedIds, \'6403999300\')"></button><button type="button" data-testid="assign-close" @click="$emit(\'update:show\', false)"></button></div>'
  },
  ParcelStatusBulkChangeDialog: {
    props: ['show', 'registerId', 'register', 'disabled'],
    emits: ['updated', 'update:show'],
    template: '<div data-testid="parcel-status-bulk-dialog" :data-show="String(show)" :data-register-id="registerId" :data-register-type="register?.registerType"><button type="button" data-testid="bulk-updated" @click="$emit(\'updated\')"></button><button type="button" data-testid="bulk-close" @click="$emit(\'update:show\', false)"></button></div>'
  }
}

function resetState() {
  vi.clearAllMocks()
  mockItems.value = [{ ...sampleParcel }]
  mockLoading.value = false
  mockTotalCount.value = 1
  mockParcelError.value = null
  mockAlert.value = null
  parcelsPerPage.value = 10
  parcelsSortBy.value = []
  parcelsPage.value = 1
  parcelsStatus.value = null
  parcelsCheckStatusSw.value = null
  parcelsCheckStatusFc.value = null
  parcelsHideLegacyRestrictions.value = false
  parcelsTnved.value = ''
  parcelsNumber.value = ''
  parcelsProductName.value = ''
  selectedParcelId.value = null
  selectedParcelIds.value = new Set([10, 11])
  lastClickedId.value = null
  parcelMultiSelectOptions = null
  registerItem.customsProcedureCode = 1
  registerItem.fileName = 'wbrn.xlsx'
  registerItem.dealNumber = 'D-7'
  registerItem.customsFee = 689
  registerItem.customsDuty = 750
  routeQuery = {}
  restoreSelectedParcelIdSnapshot.mockReturnValue(null)
  ensureOpsLoaded.mockResolvedValue()
  ensureParcelStatusesLoaded.mockResolvedValue()
  ensureStopWordsLoaded.mockResolvedValue()
  ensureKeyWordsLoaded.mockResolvedValue()
  ensureFeacnOrdersLoaded.mockResolvedValue()
  headerActions.freezeCheckStatus.mockResolvedValue()
  headerActions.freezeTnVedOrder.mockResolvedValue()
  loadParcels.mockResolvedValue()
  bulkAssignTnved.mockResolvedValue()
}

describe('WbrNParcels_List.vue', () => {
  beforeAll(async () => {
    WbrNParcelsList = (await import('@/lists/WbrNParcels_List.vue')).default
  })

  beforeEach(resetState)

  it('defines WbrN regular list headers and excludes hidden backend-owned fields', () => {
    const wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    const headerKeys = wrapper.vm.headers.map(header => header.key)
    expect(headerKeys).toEqual([
      'frozenOrder',
      'id',
      'shk',
      'checkStatus',
      'tnVed',
      'feacnLookup',
      'productName',
      'productLink',
      'article',
      'productCountryName',
      'weightKg',
      'unitPrice',
      'currency',
      'quantity',
      'lastName',
      'firstName',
      'patronymic',
      'passportNumber',
      'statusId',
      'dTag',
      'customsFee',
      'customsDuty'
    ])
    expect(headerKeys).not.toContain('countryCode')
    expect(headerKeys).not.toContain('paymentAmount')
    expect(headerKeys).not.toContain('paymentCurrency')
    const customsFeeHeader = wrapper.vm.headers.find(header => header.key === 'customsFee')
    expect(customsFeeHeader).toMatchObject({
      title: 'Сбор, руб',
      sortable: false,
      align: 'end',
      width: '120px'
    })
    const customsDutyHeader = wrapper.vm.headers.find(header => header.key === 'customsDuty')
    expect(customsDutyHeader).toMatchObject({
      title: 'Пошлина, руб',
      sortable: false,
      align: 'end',
      width: '120px'
    })
  })

  it('hides WbrN customs charge columns when register values are missing', () => {
    registerItem.customsFee = null
    registerItem.customsDuty = 750

    let wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    let headerKeys = wrapper.vm.headers.map(header => header.key)
    expect(headerKeys).not.toContain('customsFee')
    expect(headerKeys).toContain('customsDuty')
    wrapper.unmount()

    registerItem.customsFee = 689
    registerItem.customsDuty = null
    wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    headerKeys = wrapper.vm.headers.map(header => header.key)
    expect(headerKeys).toContain('customsFee')
    expect(headerKeys).not.toContain('customsDuty')
  })

  it('renders WbrN article, raw product country, split recipient fields, and product link', () => {
    const wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    const text = wrapper.text()
    expect(text).toContain('SHK-N-1')
    expect(text).toContain('29817781')
    expect(text).toContain('Wildberries new product')
    expect(text).toContain('Китай')
    expect(text).toContain('Ivanov')
    expect(text).toContain('Ivan')
    expect(text).toContain('Ivanovich')
    expect(text).toContain('689.00')
    expect(text).toContain('750.00')
    expect(wrapper.get('a.product-link-in-list').attributes('href')).toBe('https://www.wildberries.ru/catalog/29817781/detail.aspx')
  })

  it('loads supporting stores and restores selected parcel state on mount', async () => {
    routeQuery = { selectedParcelId: '10' }
    restoreSelectedParcelIdSnapshot.mockReturnValue(10)

    mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    await resolveAll()

    expect(selectedParcelId.value).toBe(10)
    expect(ensureOpsLoaded).toHaveBeenCalled()
    expect(ensureParcelStatusesLoaded).toHaveBeenCalled()
    expect(ensureFeacnOrdersLoaded).toHaveBeenCalled()
    expect(ensureStopWordsLoaded).toHaveBeenCalled()
    expect(ensureKeyWordsLoaded).toHaveBeenCalled()
    expect(getRegisterById).toHaveBeenCalledWith(7)
    expect(updateSelectedParcelIds).toHaveBeenCalled()
    expect(scrollToSelectedItem).toHaveBeenCalled()
  })

  it('supports WbrN header actions, bulk status refresh, close, and assignment flow', async () => {
    const wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    await wrapper.get('[data-testid="validate-sw"]').trigger('click')
    await wrapper.get('[data-testid="validate-sw-ex"]').trigger('click')
    await wrapper.get('[data-testid="validate-fc"]').trigger('click')
    await wrapper.get('[data-testid="lookup"]').trigger('click')
    await wrapper.get('[data-testid="lookup-ex"]').trigger('click')
    await wrapper.get('[data-testid="export-ordinary"]').trigger('click')
    await wrapper.get('[data-testid="export-excise"]').trigger('click')
    await wrapper.get('[data-testid="export-notifications"]').trigger('click')
    await wrapper.get('[data-testid="download"]').trigger('click')
    await wrapper.get('[data-testid="download-additional-restrictions"]').trigger('click')
    await wrapper.get('[data-testid="download-techdoc"]').trigger('click')
    await wrapper.get('[data-testid="calculate-custom-charges"]').trigger('click')
    await wrapper.get('[data-testid="freeze-check-status"]').trigger('click')
    await wrapper.get('[data-testid="freeze-tnved-order"]').trigger('click')

    expect(headerActions.validateRegisterSw).toHaveBeenCalled()
    expect(headerActions.validateRegisterSwEx).toHaveBeenCalled()
    expect(headerActions.validateRegisterFc).toHaveBeenCalled()
    expect(headerActions.lookupFeacnCodes).toHaveBeenCalled()
    expect(headerActions.lookupFeacnCodesEx).toHaveBeenCalled()
    expect(headerActions.exportAllXmlOrdinary).toHaveBeenCalled()
    expect(headerActions.exportAllXmlExcise).toHaveBeenCalled()
    expect(headerActions.exportAllXmlNotifications).toHaveBeenCalled()
    expect(headerActions.downloadRegister).toHaveBeenCalled()
    expect(headerActions.downloadAdditionalRestrictions).toHaveBeenCalled()
    expect(headerActions.downloadTechdoc).toHaveBeenCalled()
    expect(headerActions.calculateCustomCharges).toHaveBeenCalled()
    expect(headerActions.freezeCheckStatus).toHaveBeenCalled()
    expect(headerActions.freezeTnVedOrder).toHaveBeenCalled()
    expect(getRegisterById).toHaveBeenCalledWith(7)

    await wrapper.get('[data-testid="bulk-status"]').trigger('click')
    expect(wrapper.get('[data-testid="parcel-status-bulk-dialog"]').attributes('data-show')).toBe('true')
    loadParcels.mockClear()
    await wrapper.get('[data-testid="bulk-updated"]').trigger('click')
    await resolveAll()
    expect(loadParcels).toHaveBeenCalledWith(7, expect.any(Object), expect.any(Object), expect.any(Object))

    await wrapper.get('[data-testid="assign-confirm"]').trigger('click')
    await resolveAll()
    expect(bulkAssignTnved).toHaveBeenCalledWith([10, 11], '6403999300')
    expect(selectedParcelIds.value.size).toBe(0)
    expect(selectedParcelId.value).toBeNull()

    await wrapper.get('[data-testid="close-list"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('edits parcels and opens fellow lookup by SHK', async () => {
    const wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    await wrapper.get('[data-testid="row-action"]').trigger('click')
    expect(selectedParcelId.value).toBe(10)
    expect(navigateToEditParcel).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ id: 10, shk: 'SHK-N-1' }),
      'Редактирование посылки',
      { registerId: 7 }
    )

    await wrapper.get('[data-testid="fellows"]').trigger('click')
    expect(handleFellowsClick).toHaveBeenCalledWith(7, 'SHK-N-1')
  })

  it('switches headers for reimport procedure and builds compact large-page options', () => {
    registerItem.customsProcedureCode = 2
    mockTotalCount.value = 5000
    parcelsPage.value = 300

    const wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    const headerKeys = wrapper.vm.headers.map(header => header.key)
    expect(headerKeys).not.toContain('feacnLookup')
    expect(headerKeys).toContain('previousDTagComment')
    expect(wrapper.text()).toContain('previous comment')
    expect(wrapper.vm.pageOptions.length).toBeLessThan(200)
    expect(wrapper.vm.pageOptions.map(option => option.value)).toEqual(
      expect.arrayContaining([1, 10, 290, 300, 310, 491, 500])
    )
  })

  it('renders empty product links, alert clearing, and frozen-order sort icons', async () => {
    mockItems.value = [{ ...sampleParcel, productLink: '' }]
    mockAlert.value = { type: 'alert-danger', message: 'WbrN list alert' }
    parcelsSortBy.value = [{ key: 'frozenOrder', order: 'asc' }]

    const wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    expect(wrapper.text()).toContain('WbrN list alert')
    expect(wrapper.text()).toContain('-')
    expect(wrapper.get('[data-icon="fa-solid fa-arrow-down-1-9"]').exists()).toBe(true)
    loadParcels.mockClear()
    await wrapper.get('[data-testid="freeze-tnved-order"]').trigger('click')
    await resolveAll()
    expect(loadParcels).toHaveBeenCalledWith(7, expect.any(Object), expect.any(Object), expect.any(Object))

    parcelsSortBy.value = [{ key: 'frozenOrder', order: 'desc' }]
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-icon="fa-solid fa-arrow-up-9-1"]').exists()).toBe(true)

    parcelsSortBy.value = []
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-icon="fa-solid fa-arrows-to-eye"]').exists()).toBe(true)

    await wrapper.get('.alert .close').trigger('click')
    expect(alertClear).toHaveBeenCalled()
  })

  it('clamps the current page when filters reduce max page', async () => {
    mockTotalCount.value = 100
    parcelsPage.value = 10

    mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    mockTotalCount.value = 5
    await resolveAll()

    expect(parcelsPage.value).toBe(1)
  })

  it('wires filter, pagination, dialog visibility, and multi-select callbacks', async () => {
    registerItem.customsProcedureCode = null
    const wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    expect(wrapper.vm.headers.map(header => header.key)).not.toContain('previousDTagComment')
    expect(parcelMultiSelectOptions.getBaseRowClass({ item: sampleParcel })).toBe('')

    parcelMultiSelectOptions.onContextMenu()
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="assign-tnved-dialog"]').attributes('data-show')).toBe('true')
    await wrapper.get('[data-testid="assign-close"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="assign-tnved-dialog"]').attributes('data-show')).toBe('false')

    wrapper.vm.runningAction = true
    await wrapper.get('[data-testid="assign-confirm"]').trigger('click')
    await resolveAll()
    expect(bulkAssignTnved).not.toHaveBeenCalled()
    wrapper.vm.runningAction = false

    await wrapper.get('[data-testid="update-parcels-status"]').trigger('click')
    await wrapper.get('[data-testid="update-parcels-check-status-sw"]').trigger('click')
    await wrapper.get('[data-testid="update-parcels-check-status-fc"]').trigger('click')
    await wrapper.get('[data-testid="update-hide-legacy"]').trigger('click')
    await wrapper.get('[data-testid="update-tnved-search"]').trigger('click')
    await wrapper.get('[data-testid="update-number-search"]').trigger('click')
    await wrapper.get('[data-testid="update-product-search"]').trigger('click')
    await wrapper.get('[data-testid="table-update-items-per-page"]').trigger('click')
    await wrapper.get('[data-testid="table-update-page"]').trigger('click')
    await wrapper.get('[data-testid="table-update-sort"]').trigger('click')
    await wrapper.get('[data-testid="table-click-row"]').trigger('click')
    await wrapper.get('[data-testid="table-context-row"]').trigger('click')
    await wrapper.get('[data-testid="update-items-per-page"]').trigger('click')
    await wrapper.get('[data-testid="update-page"]').trigger('click')

    expect(parcelsStatus.value).toBe(5)
    expect(parcelsCheckStatusSw.value).toBe(16)
    expect(parcelsCheckStatusFc.value).toBe(16)
    expect(parcelsHideLegacyRestrictions.value).toBe(true)
    expect(wrapper.vm.localTnvedSearch).toBe('6403')
    expect(wrapper.vm.localParcelNumberSearch).toBe('SHK')
    expect(wrapper.vm.localProductNameSearch).toBe('boots')
    expect(parcelsPerPage.value).toBe(25)
    expect(parcelsPage.value).toBe(2)
    expect(parcelsSortBy.value).toEqual([{ key: 'shk', order: 'asc' }])
    expect(handleRowClick).toHaveBeenCalledWith({}, { item: sampleParcel })
    expect(handleRowContextMenu).toHaveBeenCalledWith({}, { item: sampleParcel })

    await wrapper.get('[data-testid="bulk-status"]').trigger('click')
    expect(wrapper.get('[data-testid="parcel-status-bulk-dialog"]').attributes('data-show')).toBe('true')
    await wrapper.get('[data-testid="bulk-close"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="parcel-status-bulk-dialog"]').attributes('data-show')).toBe('false')
  })

  it('reports initialization errors without leaving the component loading forever', async () => {
    ensureKeyWordsLoaded.mockRejectedValueOnce(new Error('keywords failed'))

    const wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })
    await resolveAll()

    expect(alertError).toHaveBeenCalledWith('Ошибка при инициализации компонента')
    expect(wrapper.vm.isInitializing).toBe(false)
  })

  it('stops list watchers and header actions on unmount', () => {
    const wrapper = mount(WbrNParcelsList, {
      props: { registerId: 7 },
      global: { stubs: globalStubs }
    })

    wrapper.unmount()

    expect(stopMultiSelect).toHaveBeenCalled()
    expect(stopRegisterHeaderActions).toHaveBeenCalled()
    expect(stopFilterSync).toHaveBeenCalled()
  })
})
