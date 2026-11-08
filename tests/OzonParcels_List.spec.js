/* @vitest-environment jsdom */
// Copyright (C) 2026

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import { navigateToEditParcel } from '@/helpers/parcels.list.helpers.js'
import OzonParcels_List from '@/lists/OzonParcels_List.vue'
import CustomsChargeDisplay from '@/components/CustomsChargeDisplay.vue'
import {
  CUSTOMS_PROCEDURE_IMPORT,
  CUSTOMS_PROCEDURE_REEXPORT
} from '@/helpers/customs.procedure.helpers.js'
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
const mockBulkAssignTnved = vi.fn().mockResolvedValue(true)
const mockUpdateWeightsFromFile = vi.fn()
const mockGetRegister = vi.fn().mockResolvedValue()
const mockRefreshCachedDetail = vi.fn().mockResolvedValue(undefined)
const alertSuccess = vi.fn()
const alertError = vi.fn()

const parcelsPerPage = ref(100)
const parcelsSortBy = ref([])
const parcelsPage = ref(1)
const mockRegisterItem = ref({ dealNumber: 'D-1' })
const mockCustomsProcedures = [
  { value: CUSTOMS_PROCEDURE_REEXPORT, isRe: true },
  { value: CUSTOMS_PROCEDURE_IMPORT, isRe: false }
]

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
    loadParcels: vi.fn().mockResolvedValue(true),
    getRowPropsForParcel: vi.fn(() => ({ class: '' })),
    navigateToEditParcel: vi.fn(),
    validateParcelData: vi.fn().mockResolvedValue(),
    filterGenericTemplateHeadersForParcel: vi.fn(() => []),
    getFeacnCodesForKeywords: vi.fn().mockResolvedValue()
  }
})

vi.mock('@/helpers/register.actions.js', async (importOriginal) => ({
  ...(await importOriginal()),
  useRegisterHeaderActions: () => ({
    validationState: ref(null),
    progressPercent: ref(0),
    actionDialog: ref(null),
    xmlDialog: { cancellable: false },
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
    downloadAdditionalRestrictions: vi.fn(),
    downloadTechdoc: vi.fn(),
    freezeCheckStatus: vi.fn().mockResolvedValue(true),
    freezeTnVedOrder: vi.fn().mockResolvedValue(),
    refreshCustomsChargeDetails: vi.fn().mockResolvedValue(undefined),
    calculateCustomsCharges: vi.fn().mockResolvedValue(),
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
  formatWeight: vi.fn((v) => String(v)),
  formatPrice: vi.fn((v) => String(v))
}))

vi.mock('@/helpers/url.helpers.js', () => ({
  ensureHttps: vi.fn((v) => v)
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
    totalCount: mockTotalCount,
    refreshCachedDetail: mockRefreshCachedDetail,
    bulkAssignTnved: mockBulkAssignTnved
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    getStatusTitle: vi.fn((id) => `Status ${id}`),
    parcelStatuses: []
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    get item() {
      return mockRegisterItem.value
    },
    ops: { customsProcedures: mockCustomsProcedures, transportationTypes: [] },
    getById: mockGetRegister,
    updateWeightsFromFile: mockUpdateWeightsFromFile,
    ensureOpsLoaded: vi.fn().mockResolvedValue(),
    getTransportationDocument: vi.fn(() => 'Документ')
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isSrLogistPlus: true,
    parcels_per_page: parcelsPerPage,
    parcels_sort_by: parcelsSortBy,
    parcels_page: parcelsPage,
    parcels_status: ref(null),
    parcels_check_status_sw: ref(null),
    parcels_check_status_fc: ref(null),
    parcels_passport_check_status: ref(null),
    parcels_hide_legacy_restrictions: ref(false),
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
    success: alertSuccess,
    error: alertError,
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
    getCountryAlpha2: vi.fn((code) => code)
  })
}))

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

const globalStubs = {
  ...vuetifyStubs,
  RegisterHeadingWithStats: { template: '<div data-testid="register-heading"></div>' },
  RegisterHeaderActionsBar: {
    name: 'RegisterHeaderActionsBar',
    props: ['showWeightUpdate', 'disabled', 'mutationDisabled', 'loading'],
    emits: ['update-weights-from-file'],
    template:
      '<button data-testid="register-header-actions" @click="$emit(\'update-weights-from-file\')"></button>'
  },
  PaginationFooter: { template: '<div data-testid="pagination-footer"></div>' },
  RegisterActionsDialogs: { template: '<div></div>' },
  AssignTnvedDialog: { template: '<div></div>' },
  ActionDialog: {
    name: 'ActionDialog',
    props: ['actionDialog'],
    template: '<div data-testid="weight-action-dialog">{{ actionDialog?.title }}</div>'
  },
  ErrorDialog: {
    name: 'ErrorDialog',
    props: ['show', 'title', 'message', 'missingHeaders', 'missingColumns'],
    emits: ['close'],
    template:
      '<div data-testid="weight-error-dialog" :data-show="String(show)">{{ message }}<button @click="$emit(\'close\')"></button></div>'
  },
  ParcelStatusBulkChangeDialog: { template: '<div></div>' },
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
    mockBulkAssignTnved.mockResolvedValue(true)
    mockUpdateWeightsFromFile.mockResolvedValue({
      processedRows: 4,
      skippedRows: 0,
      unmatchedRows: 1,
      supersededRows: 0,
      updatedParcels: 2,
      unchangedParcels: 1,
      totalWeightKgBefore: 3,
      totalWeightKgAfter: 4
    })
    mockGetRegister.mockResolvedValue()
    selectedParcelId.value = null
    mockRegisterItem.value = { dealNumber: 'D-1' }
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

  it('uses the register snapshot already loaded by the page', () => {
    expect(mockGetRegister).not.toHaveBeenCalled()
    expect(wrapper.vm.registerLoading).toBe(false)
  })

  it('shows saved group amounts with the shared action icon style in both clickable charge cells', async () => {
    wrapper.unmount()
    mockRegisterItem.value = { dealNumber: 'D-1', customsFee: 1231, customsDuty: 800 }
    const item = { id: 10, registerId: 1, postingNumber: 'P-10', customsFee: 0, customsDuty: 0,
      customsChargeGroup: { customsFee: 1231, customsDuty: 800 } }
    mockItems.value = [item]
    wrapper = mount(OzonParcels_List, {
      props: { registerId: 1 },
      global: {
        plugins: [createPinia()],
        stubs: { ...globalStubs, ClickableCell: false, 'font-awesome-icon': true,
          'v-tooltip': { template: '<div><slot name="activator" :props="{}" /></div>' } }
      }
    })
    await resolveAll()
    const displays = wrapper.findAllComponents(CustomsChargeDisplay)
    expect(displays.map(display => display.props('field'))).toEqual(['customsFee', 'customsDuty'])
    expect(displays[0].text().replace(/\s/g, '')).toBe('1231')
    expect(displays[1].text().replace(/\s/g, '')).toBe('800')
    for (const display of displays) {
      const icon = display.get('[role="img"] .button-o-c')
      expect(icon.attributes('icon')).toBe('fa-solid fa-comment-dots')
      expect(icon.attributes('size')).toBe('1x')
    }
    await displays[0].trigger('click')
    expect(navigateToEditParcel).toHaveBeenCalledWith(expect.anything(), item, 'Редактирование посылки',
      expect.objectContaining({ registerId: 1 }))
  })
  it('returns a handled list failure and skips the cached detail after bulk assignment', async () => {
    const { loadParcels } = await import('@/helpers/parcels.list.helpers.js')
    loadParcels.mockResolvedValueOnce(false)
    expect(await wrapper.vm.loadParcelsWrapper()).toBe(false)
    loadParcels.mockResolvedValueOnce(false)
    await wrapper.vm.handleAssignTnvedConfirm([1], '1234567890')
    expect(mockRefreshCachedDetail).not.toHaveBeenCalled()
    expect(alertError).not.toHaveBeenCalled()
  })
  it('reports parcels skipped by a read-only mutation lock', async () => {
    mockBulkAssignTnved.mockResolvedValue({
      updatedCount: 1,
      skippedReadOnlyCount: 2
    })

    await wrapper.vm.handleAssignTnvedConfirm([1, 2, 3], '1234567890')

    expect(alertSuccess).toHaveBeenCalledWith(
      'ТН ВЭД обновлен для 1 посылок. Пропущено из-за запрета изменений: 2'
    )
  })

  it('does not open or submit bulk assignment for a read-only register', async () => {
    mockRegisterItem.value = { dealNumber: 'D-1', readOnly: true }
    wrapper.vm.showAssignTnvedDialog = false

    wrapper.vm.handleRowContextMenu({ preventDefault: vi.fn() }, { item: mockItems.value[0] })
    await wrapper.vm.handleAssignTnvedConfirm([1], '1234567890')

    expect(wrapper.vm.showAssignTnvedDialog).toBe(false)
    expect(mockBulkAssignTnved).not.toHaveBeenCalled()
  })

  it('resets running flag when bulk assignment fails', async () => {
    mockBulkAssignTnved.mockRejectedValueOnce(new Error('failed'))
    wrapper.vm.showAssignTnvedDialog = true

    await wrapper.vm.handleAssignTnvedConfirm([1], '1234567890')

    expect(alertError).toHaveBeenCalledWith('failed')
    expect(wrapper.vm.runningAction).toBe(false)
    expect(wrapper.vm.showAssignTnvedDialog).toBe(true)
  })

  it('opens the register file picker directly from the header', async () => {
    const input = wrapper.get('[data-testid="ozon-weight-update-file-input"]')
    const click = vi.spyOn(input.element, 'click').mockImplementation(() => {})

    await wrapper.get('[data-testid="register-header-actions"]').trigger('click')

    expect(click).toHaveBeenCalledTimes(1)
  })

  it('shows import errors exactly once and allows the same file to be selected again', async () => {
    const file = new File(['data'], 'broken.xlsx')
    const firstInput = { files: [file], value: 'broken.xlsx' }
    const error = Object.assign(new Error('Некорректный файл'), {
      data: {
        msg: 'Некорректный файл',
        missingHeaders: ['Вес'],
        missingColumns: ['Артикул']
      }
    })
    mockUpdateWeightsFromFile.mockRejectedValueOnce(error)

    await wrapper.vm.onWeightUpdateFileSelected({ target: firstInput })
    await wrapper.vm.$nextTick()

    const errorDialog = wrapper.findComponent({ name: 'ErrorDialog' })
    expect(errorDialog.props('show')).toBe(true)
    expect(errorDialog.props('message')).toBe('Некорректный файл')
    expect(errorDialog.props('missingHeaders')).toEqual(['Вес'])
    expect(errorDialog.props('missingColumns')).toEqual(['Артикул'])
    expect(alertError).not.toHaveBeenCalled()
    expect(firstInput.value).toBe('')

    const retryInput = { files: [file], value: 'broken.xlsx' }
    await wrapper.vm.onWeightUpdateFileSelected({ target: retryInput })
    expect(mockUpdateWeightsFromFile).toHaveBeenCalledTimes(2)
    expect(retryInput.value).toBe('')
  })

  it('blocks the file picker and upload for a read-only register', async () => {
    mockRegisterItem.value = { dealNumber: 'D-1', readOnly: true }
    await wrapper.vm.$nextTick()
    const input = wrapper.get('[data-testid="ozon-weight-update-file-input"]')
    const click = vi.spyOn(input.element, 'click').mockImplementation(() => {})

    await wrapper.get('[data-testid="register-header-actions"]').trigger('click')
    await wrapper.vm.onWeightUpdateFileSelected({
      target: { files: [new File(['data'], 'weights.xlsx')], value: 'weights.xlsx' }
    })

    expect(click).not.toHaveBeenCalled()
    expect(mockUpdateWeightsFromFile).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'RegisterHeaderActionsBar' }).props('mutationDisabled')).toBe(
      true
    )
  })

  it('shows INN and combined passport columns for import and reexport registers', async () => {
    for (const customsProcedureCode of [CUSTOMS_PROCEDURE_IMPORT, CUSTOMS_PROCEDURE_REEXPORT]) {
      wrapper.unmount()
      mockRegisterItem.value = { dealNumber: 'D-1', customsProcedureCode }
      wrapper = mount(OzonParcels_List, {
        props: { registerId: 1 },
        global: { plugins: [createPinia()], stubs: globalStubs }
      })

      await resolveAll()

      const table = wrapper.findComponent({ name: 'v-data-table-server' })
      const keys = table.props('headers').map((header) => header.key)

      expect(keys).toEqual(expect.arrayContaining(['inn', 'passport']))
      expect(keys).not.toContain('passportSeries')
      expect(keys).not.toContain('passportIssueDate')
      expect(keys).not.toContain('passportIssuedBy')
    }
  })

})
