/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import RegistersList from '@/lists/Registers_List.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID, GTC_COMPANY_ID } from '@/helpers/company.constants.js'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'
import { vuetifyStubs } from './helpers/test-utils.js'
import ActionButton from '@/components/ActionButton.vue'
import RegisterStatusInlineEditor from '@/components/RegisterStatusInlineEditor.vue'
import router from '@/router'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { formatDate } from '@/helpers/date.formatters.js'
import {
  createAirportsById,
  createTransportationTypesById,
  getAirportIata,
  getCountryDisplayName,
  isAviaTransportation
} from '@/helpers/warehouse.registers.table.helpers.js'

let lastRegisterActions = null

vi.mock('@/helpers/register.actions.js', async () => {
  const actual = await vi.importActual('@/helpers/register.actions.js')
  return {
    ...actual,
    createRegisterActionHandlers: vi.fn((...args) => {
      const result = actual.createRegisterActionHandlers(...args)
      result.stopPolling = vi.fn(result.stopPolling)
      lastRegisterActions = result
      return result
    })
  }
})

const mockItems = ref([])
const mockCompanies = ref([])
const mockOrderStatuses = ref([])
const mockCountries = ref([])
const mockOps = ref({
  customsProcedures: [],
  transportationTypes: []
})
const mockAirports = ref([])
const getAll = vi.fn()
const getAirportsAll = vi.fn()
const uploadFn = vi.fn()
const setOrderStatusesFn = vi.fn()
const setRegisterStatusFn = vi.fn()
const getCompaniesAll = vi.fn()
const getOrderStatusesAll = vi.fn()
const ensureOrderStatusesLoadedFn = vi.fn().mockResolvedValue()
const ensureRegisterStatusesLoadedFn = vi.fn().mockResolvedValue()
const mockRegisterStatuses = ref([
  { id: 2, title: 'Register Status 2' },
  { id: 5, title: 'Register Status 5' }
])
const getRegisterStatusByIdFn = vi.fn((id) => id
  ? { id, title: `Register Status ${id}`, icon: 'svg:very-delivered', bkColor: '#00AA00', fgColor: '#FFFFFF' }
  : null
)
const getCountriesAll = vi.fn()
const countriesEnsureLoadedFn = vi.fn().mockResolvedValue(mockCountries.value)
const ensureOpsLoadedFn = vi.fn().mockResolvedValue()
const generateFn = vi.fn()
const alertSuccessFn = vi.fn()
const alertErrorFn = vi.fn()
const alertClearFn = vi.fn()
const mockAlert = ref(null)
const validateFn = vi.fn()
const getValidationProgressFn = vi.fn()
const cancelValidationFn = vi.fn()
const removeFn = vi.fn()
const confirmMock = vi.fn()
const mockIsShiftLeadPlus = ref(false)
const mockIsSrLogistPlus = ref(false)

beforeEach(() => {
  vi.clearAllMocks()
  lastRegisterActions = null
})

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.getAll && store.upload && store.setParcelStatuses) {
        // registers store
        return { items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0), ops: mockOps }
      } else if (store.getAll && !store.upload && store.companies) {
        // companies store
        return { companies: mockCompanies }
      } else if (store.getAll && store.parcelStatuses) {
        // parcel statuses store
        return { parcelStatuses: mockOrderStatuses }
      } else if (store.getAll && store.countries) {
        // countries store
        return { countries: mockCountries }
      } else if (store.airports !== undefined && store.getAll === getAirportsAll) {
        // airports store
        return { airports: mockAirports }
      } else if (store.alert !== undefined) {
        return { alert: store.alert }
      } else {
        // auth store or other stores - return safe defaults
        return {
          registers_per_page: ref(10),
          registers_search: ref(''),
          registers_sort_by: ref([{ key: 'id', order: 'asc' }]),
          registers_page: ref(1),
          registers_wh_per_page: ref(25),
          registers_wh_search: ref('warehouse search'),
          registers_wh_sort_by: ref([{ key: 'warehouseArrivalDate', order: 'asc' }]),
          registers_wh_page: ref(3),
          alert: ref(null),
          isShiftLeadPlus: mockIsShiftLeadPlus,
          isSrLogistPlus: mockIsSrLogistPlus,
          isWhManagerPlus: ref(false),
          hasWhRole: ref(false)
        }
      }
    }
  }
})

const mockItem = ref({})
const uploadFile = ref(null)
const registersStore = {
  getAll,
  upload: uploadFn,
  setParcelStatuses: setOrderStatusesFn,
  setRegisterStatus: setRegisterStatusFn,
  validate: validateFn,
  getValidationProgress: getValidationProgressFn,
  cancelValidation: cancelValidationFn,
  remove: removeFn,
  generate: generateFn,
  items: mockItems,
  item: mockItem,
  uploadFile,
  loading: ref(false),
  error: ref(null),
  totalCount: ref(0),
  ops: mockOps,
  ensureOpsLoaded: ensureOpsLoadedFn,
  getOpsLabel: vi.fn((list, value) => {
    const num = Number(value)
    const match = list?.find(item => Number(item.value) === num)
    return match ? match.name : String(value)
  }),
  getTransportationDocument: vi.fn(id => `Doc ${id}`)
}

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => registersStore
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    getAll: getOrderStatusesAll,
    ensureLoaded: ensureOrderStatusesLoadedFn,
    parcelStatuses: mockOrderStatuses
  })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({
    getAll: getCompaniesAll,
    companies: mockCompanies
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    countries: mockCountries,
    getAll: getCountriesAll,
    ensureLoaded: countriesEnsureLoadedFn,
    getCountryShortName: vi.fn(code => `Country ${code}`)
  })
}))

vi.mock('@/stores/airports.store.js', () => ({
  useAirportsStore: () => ({
    airports: mockAirports,
    getAll: getAirportsAll
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    getWarehouseName: vi.fn(id => id ? `Warehouse ${id}` : 'Не указан')
  })
}))

vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => ({
    ensureLoaded: ensureRegisterStatusesLoadedFn,
    registerStatuses: mockRegisterStatuses,
    getStatusById: getRegisterStatusByIdFn,
    getStatusTitle: vi.fn(id => id ? `Status ${id}` : 'Не указан')
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    clear: alertClearFn,
    success: alertSuccessFn,
    error: alertErrorFn
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    registers_per_page: ref(10),
    registers_search: ref(''),
    registers_sort_by: ref([{ key: 'id', order: 'asc' }]),
    registers_page: ref(1),
    registers_wh_per_page: ref(25),
    registers_wh_search: ref('warehouse search'),
    registers_wh_sort_by: ref([{ key: 'warehouseArrivalDate', order: 'asc' }]),
    registers_wh_page: ref(3),
    isShiftLeadPlus: mockIsShiftLeadPlus,
    isSrLogistPlus: mockIsSrLogistPlus,
    isWhManagerPlus: ref(false),
    hasWhRole: ref(false)
  })
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/l2/ParcelStatusBulkChangeDialog.vue', () => ({
  default: {
    name: 'ParcelStatusBulkChangeDialog',
    props: ['show', 'registerId', 'register', 'statusOptions', 'disabled'],
    emits: ['update:show', 'updated'],
    template: '<div data-testid="parcel-status-bulk-dialog" :data-show="String(show)" :data-register-id="registerId" :data-register-type="register?.registerType"><button type="button" data-testid="parcel-status-bulk-dialog-updated" @click="$emit(\'updated\')"></button></div>'
  }
}))

function getTableHeaders(wrapper) {
  return wrapper.findComponent({ name: 'v-data-table-server' }).props('headers')
}

describe('Registers_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = []
    mockCompanies.value = []
    mockOrderStatuses.value = []
    mockRegisterStatuses.value = [
      { id: 2, title: 'Register Status 2' },
      { id: 5, title: 'Register Status 5' }
    ]
    mockCountries.value = []
    mockAirports.value = []
    mockOps.value = { customsProcedures: [], transportationTypes: [] }
    registersStore.error = ref(null)
    mockAlert.value = null
    mockIsShiftLeadPlus.value = false
    mockIsSrLogistPlus.value = false
    getAirportsAll.mockClear()
    ensureOrderStatusesLoadedFn.mockClear()
    ensureRegisterStatusesLoadedFn.mockClear()
    setRegisterStatusFn.mockReset()
    getRegisterStatusByIdFn.mockClear()
    ensureOpsLoadedFn.mockClear()
  })

  it('reports store error via alertStore when loadRegisters fails', async () => {
    getAll.mockImplementationOnce(() => {
      registersStore.error.value = 'load registers failed'
      return Promise.resolve()
    })

    mount(RegistersList, { global: { stubs: vuetifyStubs } })
    await flushPromises()

    expect(alertErrorFn).toHaveBeenCalledWith('load registers failed')
  })

  it('reports Error object store error as message string via alertStore', async () => {
    getAll.mockImplementationOnce(() => {
      registersStore.error.value = new Error('load registers failed')
      return Promise.resolve()
    })

    mount(RegistersList, { global: { stubs: vuetifyStubs } })
    await flushPromises()

    expect(alertErrorFn).toHaveBeenCalledWith('load registers failed')
  })

  describe('getCustomerName function', () => {
    let wrapper

    beforeEach(() => {
      // Set up mock companies data
      mockCompanies.value = [
        { id: 1, name: 'ООО "РВБ"', shortName: 'РВБ' },
        { id: 2, name: 'ООО "Интернет решения"', shortName: null },
        { id: 3, name: 'ООО "Длинное название компании"', shortName: '' }
      ]

      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('returns shortName when available', () => {
      const customerName = wrapper.vm.getCustomerName(1)
      expect(customerName).toBe('РВБ')
    })

    it('returns name when shortName is null', () => {
      const customerName = wrapper.vm.getCustomerName(2)
      expect(customerName).toBe('ООО "Интернет решения"')
    })

    it('returns name when shortName is empty string', () => {
      const customerName = wrapper.vm.getCustomerName(3)
      expect(customerName).toBe('ООО "Длинное название компании"')
    })

    it('returns "Неизвестно" for non-existent customer ID', () => {
      const customerName = wrapper.vm.getCustomerName(999)
      expect(customerName).toBe('Неизвестно')
    })

    it('returns "Неизвестно" for null customer ID', () => {
      const customerName = wrapper.vm.getCustomerName(null)
      expect(customerName).toBe('Неизвестно')
    })

    it('returns "Неизвестно" for undefined customer ID', () => {
      const customerName = wrapper.vm.getCustomerName(undefined)
      expect(customerName).toBe('Неизвестно')
    })

    it('returns "Неизвестно" when a company has no usable display name', () => {
      mockCompanies.value = [{ id: 4, shortName: '', name: '' }]
      const customerName = wrapper.vm.getCustomerName(4)
      expect(customerName).toBe('Неизвестно')
    })

    it('returns "Неизвестно" when companies array is empty', () => {
      mockCompanies.value = []
      const customerName = wrapper.vm.getCustomerName(1)
      expect(customerName).toBe('Неизвестно')
    })
  })

  describe('getCountryDisplayName', () => {
    it('appends airport code for aviation transportation', () => {
      mockCountries.value = [
        { isoNumeric: 643, nameRuShort: 'Россия' },
        { isoNumeric: 840, nameRuShort: 'США' }
      ]
      mockOps.value = {
        customsProcedures: [],
        transportationTypes: [
          { value: 0, name: 'Авиа', document: 'AWB', isAvia: true }
        ]
      }
      mockAirports.value = [
        { id: 10, codeIata: 'SVO' },
        { id: 20, codeIata: 'JFK' }
      ]

      const item = {
        transportationTypeCode: 0,
        origCountryCode: '643',
        destCountryCode: '840',
        departureAirportId: 10,
        arrivalAirportId: 20
      }
      const transportationTypesById = createTransportationTypesById(mockOps.value)
      const airportsById = createAirportsById(mockAirports.value)

      expect(getCountryDisplayName(
        item,
        item.origCountryCode,
        item.departureAirportId,
        mockCountries.value,
        transportationTypesById,
        airportsById
      )).toBe('Россия (SVO)')
      expect(getCountryDisplayName(
        item,
        item.destCountryCode,
        item.arrivalAirportId,
        mockCountries.value,
        transportationTypesById,
        airportsById
      )).toBe('США (JFK)')
    })

    it('returns country name without code when not aviation or missing airport', () => {
      mockCountries.value = [
        { isoNumeric: 36, nameRuShort: 'Австралия' }
      ]
      mockOps.value = {
        customsProcedures: [],
        transportationTypes: [
          { value: 1, name: 'Авто', document: 'CMR', isAvia: false }
        ]
      }
      mockAirports.value = [
        { id: 30, codeIata: 'SYD' }
      ]

      const item = {
        transportationTypeCode: 1,
        origCountryCode: '036',
        departureAirportId: 30
      }
      const transportationTypesById = createTransportationTypesById(mockOps.value)
      const airportsById = createAirportsById(mockAirports.value)

      expect(getCountryDisplayName(
        item,
        item.origCountryCode,
        item.departureAirportId,
        mockCountries.value,
        transportationTypesById,
        airportsById
      )).toBe('Австралия')
    })

    it('covers country and airport fallbacks', () => {
      mockCountries.value = [
        { isoNumeric: 36, nameRuOfficial: 'Австралийский Союз' }
      ]
      mockOps.value = {
        customsProcedures: [],
        transportationTypes: [
          { value: 2, name: 'Авиа', document: 'AWB', isAvia: true }
        ]
      }
      mockAirports.value = []

      let transportationTypesById = createTransportationTypesById(mockOps.value)
      let airportsById = createAirportsById(mockAirports.value)

      expect(getCountryDisplayName({}, null, null, mockCountries.value, transportationTypesById, airportsById)).toBe('Неизвестно')
      expect(getCountryDisplayName({ transportationTypeCode: 1 }, 643, null, mockCountries.value, transportationTypesById, airportsById)).toBe('Россия')
      expect(getCountryDisplayName({ transportationTypeCode: 1 }, 999, null, mockCountries.value, transportationTypesById, airportsById)).toBe(999)
      expect(getCountryDisplayName({ transportationTypeCode: 1 }, 36, null, mockCountries.value, transportationTypesById, airportsById)).toBe('Австралийский Союз')

      mockCountries.value = [{ isoNumeric: 156 }]
      expect(getCountryDisplayName({ transportationTypeCode: 1 }, 156, null, mockCountries.value, transportationTypesById, airportsById)).toBe(156)

      mockCountries.value = [{ isoNumeric: 36, nameRuOfficial: 'Австралийский Союз' }]
      expect(getCountryDisplayName({ transportationTypeCode: 2 }, 36, null, mockCountries.value, transportationTypesById, airportsById)).toBe('Австралийский Союз')

      mockOps.value = { customsProcedures: [], transportationTypes: null }
      mockAirports.value = null
      transportationTypesById = createTransportationTypesById(mockOps.value)
      airportsById = createAirportsById(mockAirports.value)
      expect(isAviaTransportation({ transportationTypeCode: 2 }, transportationTypesById)).toBe(false)
      expect(getAirportIata(0, airportsById)).toBeNull()
      expect(getAirportIata(10, airportsById)).toBeNull()
    })
  })

  describe('component integration', () => {
    it('loads paperwork registers explicitly', async () => {
      mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      await flushPromises()

      expect(ensureRegisterStatusesLoadedFn).toHaveBeenCalled()
      expect(getAll).toHaveBeenCalledWith({ mode: OP_MODE_PAPERWORK })
    })

    it('displays customer names correctly when items and companies are present', async () => {
      // Set up mock companies
      mockCompanies.value = [
        { id: 1, name: 'ООО "РВБ"', shortName: 'РВБ' },
        { id: 2, name: 'ООО "Интернет решения"', shortName: null }
      ]

      // Set up mock items with customer IDs
      mockItems.value = [
        {
          id: 1,
          fileName: 'register1.csv',
          customerId: 1,
          ordersTotal: 10
        },
        {
          id: 2,
          fileName: 'register2.csv',
          customerId: 2,
          ordersTotal: 5
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      await wrapper.vm.$nextTick()

      // Test that getCustomerName works with the mock data
      expect(wrapper.vm.getCustomerName(1)).toBe('РВБ')
      expect(wrapper.vm.getCustomerName(2)).toBe('ООО "Интернет решения"')
    })

    it('reports initialization failures', async () => {
      countriesEnsureLoadedFn.mockRejectedValueOnce(new Error('countries failed'))

      mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      await flushPromises()

      expect(alertErrorFn).toHaveBeenCalledWith('countries failed')
    })

    it('reports fallback initialization error text for non-error failures', async () => {
      countriesEnsureLoadedFn.mockRejectedValueOnce('countries failed')

      mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      await flushPromises()

      expect(alertErrorFn).toHaveBeenCalledWith('Ошибка при загрузке данных')
    })

    it('stops initialization work after unmounting during initial load', async () => {
      let resolveStatuses
      ensureOrderStatusesLoadedFn.mockImplementationOnce(() => new Promise((resolve) => {
        resolveStatuses = resolve
      }))

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
      await wrapper.vm.$nextTick()

      wrapper.unmount()
      resolveStatuses()
      await flushPromises()

      expect(countriesEnsureLoadedFn).not.toHaveBeenCalled()
    })
  })

  describe('navigation functions', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('navigates to parcels when openParcels is called', async () => {
      const item = { id: 123 }
      const router = (await import('@/router')).default

      wrapper.vm.openParcels(item)
      expect(router.push).toHaveBeenCalledWith('/registers/123/parcels?mode=modePaperwork')
    })

  })

  describe('table cell interactions', () => {
    it('opens parcels when dealNumber cell is clicked', async () => {
      mockItems.value = [
        {
          id: 1,
          dealNumber: 'D-1',
          invoiceNumber: 'INV-1'
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      const router = (await import('@/router')).default
      await wrapper.vm.$nextTick()
      const cell = wrapper.find('.open-parcels-link')
      await cell.trigger('click')
      expect(router.push).toHaveBeenCalledWith('/registers/1/parcels?mode=modePaperwork')
    })

    it('opens inline register-status selector when status action button is clicked', async () => {
      mockIsSrLogistPlus.value = true
      mockItems.value = [
        {
          id: 7,
          statusId: 2
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      const router = (await import('@/router')).default
      await wrapper.vm.$nextTick()

      const statusIconButton = wrapper.find('.register-status-action-button')
      expect(statusIconButton.exists()).toBe(true)
      expect(statusIconButton.attributes('title')).toBe('Register Status 2')

      await statusIconButton.trigger('click')
      expect(getRegisterStatusByIdFn).toHaveBeenCalledWith(2)
      expect(router.push).not.toHaveBeenCalledWith('/register/edit/7?mode=modePaperwork')
      expect(wrapper.find('[data-testid="v-select"]').exists()).toBe(true)
    })

    it('applies inline register status changes in paperwork mode', async () => {
      mockIsSrLogistPlus.value = true
      setRegisterStatusFn.mockResolvedValue()
      getAll.mockResolvedValue()
      mockItems.value = [
        {
          id: 7,
          statusId: 2
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      await flushPromises()
      await wrapper.vm.$nextTick()
      await wrapper.find('.register-status-action-button').trigger('click')
      await wrapper.vm.$nextTick()

      wrapper.vm.setSelectedRegisterStatusId(7, 5)
      await wrapper.vm.$nextTick()

      const inlineEditor = wrapper.findComponent(RegisterStatusInlineEditor)
      await inlineEditor.vm.$emit('apply', 5)
      await flushPromises()

      expect(setRegisterStatusFn).toHaveBeenCalledWith(7, 5)
      expect(getAll).toHaveBeenCalledWith({ mode: OP_MODE_PAPERWORK })
      expect(alertSuccessFn).toHaveBeenCalledWith('Статус партии успешно изменен')
    })

    it('renders bookmark marker for lookup-by-article registers', async () => {
      mockItems.value = [
        {
          id: 1,
          dealNumber: 'D-1',
          lookupByArticle: true
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: {
            ...vuetifyStubs,
            'font-awesome-icon': {
              template: '<i v-bind="$attrs" data-testid="fa-icon"></i>',
              props: ['icon'],
              inheritAttrs: false
            }
          }
        }
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.find('.bookmark-icon').exists()).toBe(true)
    })

    it('edits register when sender cell is clicked', async () => {
      mockItems.value = [
        {
          id: 2,
          senderId: 10
        }
      ]
      mockCompanies.value = [{ id: 10, name: 'Sender' }]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      const router = (await import('@/router')).default
      await wrapper.vm.$nextTick()
      const cell = wrapper.find('.edit-register-link')
      await cell.trigger('click')
      expect(router.push).toHaveBeenCalledWith('/register/edit/2?mode=modePaperwork')
    })

    it('renders release weight as a route to actual weight when real weight is set', async () => {
      mockItems.value = [
        {
          id: 3,
          totalWeightKg: 12.345,
          totalWeightKgToRelease: 10,
          realWeightKg: 5
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: {
            ...vuetifyStubs,
            'font-awesome-icon': {
              template: '<i v-bind="$attrs" :data-icon="icon" data-testid="fa-icon"></i>',
              props: ['icon'],
              inheritAttrs: false
            }
          }
        }
      })

      await wrapper.vm.$nextTick()

      const weightCell = wrapper.find('[data-testid="register-weight-cell"]')
      expect(weightCell.findAll('.weight-line').at(0).text()).toBe('12.345')

      const route = weightCell.find('.weight-real-route')
      expect(route.exists()).toBe(true)
      expect(route.findAll('span').map(span => span.text())).toEqual(['10.000', '5.000'])
      const arrow = route.find('[data-icon="fa-solid fa-arrow-right"]')
      expect(arrow.exists()).toBe(true)
      expect(arrow.classes()).toContain('arrow-icon')
    })

    it('keeps the plain release weight line when real weight is not set or negative', async () => {
      mockItems.value = [
        {
          id: 4,
          totalWeightKg: 12.345,
          totalWeightKgToRelease: 10,
          realWeightKg: null
        },
        {
          id: 5,
          totalWeightKg: 20,
          totalWeightKgToRelease: 15,
          realWeightKg: -1
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      await wrapper.vm.$nextTick()

      const weightCells = wrapper.findAll('[data-testid="register-weight-cell"]')
      expect(weightCells).toHaveLength(2)
      expect(weightCells[0].find('.weight-real-route').exists()).toBe(false)
      expect(weightCells[0].findAll('.weight-line').map(line => line.text())).toEqual(['12.345', '10.000'])
      expect(weightCells[1].find('.weight-real-route').exists()).toBe(false)
      expect(weightCells[1].findAll('.weight-line').map(line => line.text())).toEqual(['20.000', '15.000'])
    })
  })

  describe('file upload functionality', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    describe('Upload functionality', () => {
      beforeEach(() => {
        // Set up mock companies data for upload customers
        mockCompanies.value = [
          { id: OZON_COMPANY_ID, name: 'ООО "Интернет решения"', shortName: 'Озон' },
          { id: WBR_COMPANY_ID, name: 'ООО "РВБ"', shortName: 'РВБ' },
          { id: 3, name: 'Other Company', shortName: 'Other' }
        ]
      })

      it('starts upload when customer is selected through menu', async () => {
        const mockClick = vi.fn()
        wrapper.vm.fileInput = { click: mockClick }

        await wrapper.vm.startRegisterUpload(OZON_COMPANY_ID)

        expect(wrapper.vm.selectedRegisterType).toBe(OZON_COMPANY_ID)
        expect(mockClick).toHaveBeenCalled()
      })

      it('keeps selected upload type when no file input is mounted', async () => {
        wrapper.vm.fileInput = null

        await wrapper.vm.startRegisterUpload(OZON_COMPANY_ID)

        expect(wrapper.vm.selectedRegisterType).toBe(OZON_COMPANY_ID)
        expect(alertErrorFn).not.toHaveBeenCalled()
      })

      it('shows error when trying to start upload without customer', async () => {
        await wrapper.vm.startRegisterUpload(null)

        expect(alertErrorFn).toHaveBeenCalledWith('Не выбран тип реестра для загрузки')
      })

      it('handles file selection with array input for OZON', async () => {
        const file = new File(['data'], 'test.xlsx')
        wrapper.vm.selectedRegisterType = OZON_COMPANY_ID

        await wrapper.vm.fileSelected([file])

        expect(registersStore.item.fileName).toBe('test.xlsx')
        expect(registersStore.item.registerType).toBe(OZON_COMPANY_ID)
        expect(registersStore.item.companyId).toBe(OZON_COMPANY_ID)
        expect(registersStore.uploadFile).toBe(file)
        expect(router.push).toHaveBeenCalledWith('/register/load')
      })

      it('handles file selection with single file input for WBR', async () => {
        const file = new File(['data'], 'test.xlsx')
        wrapper.vm.selectedRegisterType = WBR2_REGISTER_ID

        await wrapper.vm.fileSelected(file)

        expect(registersStore.item.fileName).toBe('test.xlsx')
        expect(registersStore.item.registerType).toBe(WBR2_REGISTER_ID)
        expect(registersStore.item.companyId).toBe(WBR_COMPANY_ID)
        expect(registersStore.uploadFile).toBe(file)
        expect(router.push).toHaveBeenCalledWith('/register/load')
      })

      it('handles empty file selection', async () => {
        wrapper.vm.selectedRegisterType = WBR_COMPANY_ID

        await wrapper.vm.fileSelected(null)
        expect(router.push).not.toHaveBeenCalled()

        await wrapper.vm.fileSelected([])
        expect(router.push).not.toHaveBeenCalled()
      })

      it('shows error when trying to upload without selected customer', async () => {
        const file = new File(['data'], 'test.xlsx')
        wrapper.vm.selectedRegisterType = null

        await wrapper.vm.fileSelected(file)

        expect(alertErrorFn).toHaveBeenCalledWith('Не выбран тип реестра для загрузки')
        expect(router.push).not.toHaveBeenCalled()
      })

      it('clears file input after selection', async () => {
        const file = new File(['data'], 'test.xlsx')
        const mockFileInput = { value: null }
        wrapper.vm.fileInput = mockFileInput
        wrapper.vm.selectedRegisterType = OZON_COMPANY_ID

        await wrapper.vm.fileSelected(file)

        expect(mockFileInput.value).toBeNull()
      })
    })

    describe('uploadMenuOptions computed property', () => {
      it('returns filtered menu options for upload', () => {
        mockCompanies.value = [
          { id: OZON_COMPANY_ID, name: 'ООО "Интернет решения"', shortName: 'Озон' },
          { id: WBR_COMPANY_ID, name: 'ООО "РВБ"', shortName: 'РВБ' },
          { id: 3, name: 'Other Company', shortName: 'Other' }
        ]

        const options = wrapper.vm.uploadMenuOptions

        expect(options).toHaveLength(3)
        expect(options.map((option) => option.label)).toEqual([
          'Озон',
          'РВБ',
          'Импорт и реэкспорт (тест)'
        ])
        expect(options.every((option) => typeof option.action === 'function')).toBe(true)
      })

      it('returns static import/re-export option when no companies loaded', () => {
        mockCompanies.value = []
        const options = wrapper.vm.uploadMenuOptions
        expect(options).toHaveLength(1)
        expect(options[0].label).toBe('Импорт и реэкспорт (тест)')
        expect(typeof options[0].action).toBe('function')
      })

      it('returns empty array when companies is null', () => {
        mockCompanies.value = null
        const options = wrapper.vm.uploadMenuOptions
        expect(options).toEqual([])
      })

      it('provides menu options that trigger upload', async () => {
        const mockClick = vi.fn()
        wrapper.vm.fileInput = { click: mockClick }

        mockCompanies.value = [
          { id: OZON_COMPANY_ID, name: 'ООО "Интернет решения"', shortName: 'Озон' },
          { id: WBR_COMPANY_ID, name: 'ООО "РВБ"', shortName: 'РВБ' },
          { id: 3, name: 'Other Company', shortName: 'Other' }
        ]

        await wrapper.vm.$nextTick()

        const options = wrapper.vm.uploadMenuOptions
        expect(options).toHaveLength(3)

        const [firstOption] = options
        expect(firstOption.label).toBe('Озон')

        await firstOption.action()

        expect(wrapper.vm.selectedRegisterType).toBe(OZON_COMPANY_ID)
        expect(mockClick).toHaveBeenCalled()
      })

      it('provides static import/re-export menu option that triggers upload', async () => {
        const mockClick = vi.fn()
        wrapper.vm.fileInput = { click: mockClick }
        mockCompanies.value = []

        await wrapper.vm.$nextTick()

        const [option] = wrapper.vm.uploadMenuOptions
        expect(option.label).toBe('Импорт и реэкспорт (тест)')

        await option.action()

        expect(wrapper.vm.selectedRegisterType).toBe(GTC_COMPANY_ID)
        expect(mockClick).toHaveBeenCalled()
      })

      it('keeps upload enabled when only the static import/re-export option is available', async () => {
        mockCompanies.value = []
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.isUploadDisabled).toBe(false)
      })
    })
  })

  describe('delete functionality', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('shows confirmation dialog when delete is clicked', async () => {
      confirmMock.mockResolvedValue(true)
      const item = { id: 1, fileName: 'reg.xlsx' }

      await wrapper.vm.deleteRegister(item)

      expect(confirmMock).toHaveBeenCalledWith({
        title: 'Подтверждение',
        confirmationText: 'Удалить',
        cancellationText: 'Не удалять',
        dialogProps: {
          width: '30%',
          minWidth: '250px'
        },
        confirmationButtonProps: {
          color: 'orange-darken-3'
        },
        content: 'Удалить реестр "' + item.fileName + '" ?'
      })
    })

    it('calls remove when deletion is confirmed', async () => {
      confirmMock.mockResolvedValue(true)
      const item = { id: 2, fileName: 'file.xlsx' }

      await wrapper.vm.deleteRegister(item)

      expect(removeFn).toHaveBeenCalledWith(item.id)
    })

    it('does not call remove when deletion is cancelled', async () => {
      confirmMock.mockResolvedValue(false)
      const item = { id: 3, fileName: 'file.xlsx' }

      await wrapper.vm.deleteRegister(item)

      expect(removeFn).not.toHaveBeenCalled()
    })

    it('does not open confirmation while another action is running', async () => {
      wrapper.vm.runningAction = true

      await wrapper.vm.deleteRegister({ id: 5, fileName: 'busy.xlsx' })

      expect(confirmMock).not.toHaveBeenCalled()
      expect(removeFn).not.toHaveBeenCalled()
    })

    it('handles delete error', async () => {
     
      confirmMock.mockResolvedValue(true)
      removeFn.mockRejectedValueOnce(new Error('Network error'))
      const item = { id: 4, fileName: 'file.xlsx' }

      await wrapper.vm.deleteRegister(item)

      expect(removeFn).toHaveBeenCalledWith(item.id)
    })

    it('handles delete errors without a message', async () => {
      confirmMock.mockResolvedValue(true)
      removeFn.mockRejectedValueOnce({})

      await wrapper.vm.deleteRegister({ id: 6, fileName: 'file.xlsx' })

      expect(alertErrorFn).toHaveBeenCalledWith('Ошибка при удалении реестра')
    })
  })

  describe('computed properties', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('calculates progressPercent correctly', () => {
      // Test with zero total
      wrapper.vm.validationState.total = 0
      wrapper.vm.validationState.processed = 0
      expect(wrapper.vm.progressPercent).toBe(0)

      // Test with negative total
      wrapper.vm.validationState.total = -1
      wrapper.vm.validationState.processed = 10
      expect(wrapper.vm.progressPercent).toBe(0)

      // Test with normal values
      wrapper.vm.validationState.total = 100
      wrapper.vm.validationState.processed = 50
      expect(wrapper.vm.progressPercent).toBe(50)

      // Test with values that need rounding
      wrapper.vm.validationState.total = 3
      wrapper.vm.validationState.processed = 1
      expect(wrapper.vm.progressPercent).toBe(33) // 33.33 rounded to 33

      // Test with complete progress
      wrapper.vm.validationState.total = 100
      wrapper.vm.validationState.processed = 100
      expect(wrapper.vm.progressPercent).toBe(100)
    })
  })

  describe('sortable headers', () => {
    it('marks paperwork visible columns as sortable', () => {
      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      const sortableByKey = Object.fromEntries(
        getTableHeaders(wrapper).map(header => [header.key, header.sortable])
      )

      expect(sortableByKey.actions).toBe(false)
      expect(sortableByKey.registerStatusIcon).toBeUndefined()
      expect(sortableByKey.dealNumber).toBe(true)
      expect(sortableByKey.invoice).toBe(true)
      expect(sortableByKey.countries).toBe(true)
      expect(sortableByKey.senderRecipient).toBe(true)
      expect(sortableByKey.parcelsTotal).toBe(true)
      expect(sortableByKey.weight).toBe(true)
      expect(sortableByKey.price).toBe(true)
      expect(sortableByKey.date).toBe(true)
      expect(sortableByKey.statusId).toBeUndefined()
      expect(sortableByKey.warehouseId).toBeUndefined()
      expect(sortableByKey.warehouseArrivalDate).toBeUndefined()
    })

    it('aligns numeric headers with numeric cells', () => {
      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      const headersByKey = Object.fromEntries(
        getTableHeaders(wrapper).map(header => [header.key, header])
      )

      expect(headersByKey.parcelsTotal.align).toBe('end')
      expect(headersByKey.weight.align).toBe('end')
      expect(headersByKey.price.align).toBe('end')
      expect(headersByKey.parcelsTotal.width).toBe('150px')
      expect(headersByKey.weight.width).toBe('220px')
      expect(headersByKey.price.width).toBe('240px')
    })

    it('does not render warehouse-only actions', () => {
      mockItems.value = [{ id: 1, warehouseId: 10 }]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      const actionTooltips = wrapper.findAllComponents(ActionButton).map(button =>
        String(button.props('tooltipText') || '')
      )

      expect(actionTooltips).not.toContain('Создать задание на сканирование')
      expect(actionTooltips).not.toContain('Стикеры не в реестре')
      expect(wrapper.text()).not.toContain('Создать реестр возврата')
    })

    it('keeps check-status tooltip for paperwork parcels totals', () => {
      mockItems.value = [{
        id: 1,
        parcelsTotal: 3,
        placesTotal: 1,
        parcelsByCheckStatus: {
          [CheckStatusCode.NoIssues.value]: 3
        },
        parcelsByCheckStatusProjection: {
          30: 3
        }
      }]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      expect(wrapper.text()).toContain('Ок стоп слова, Ок ТН ВЭД: 3')
      expect(wrapper.text()).not.toContain('Проверено: 3')
    })

    it('renders delete action for shift leads', () => {
      mockIsShiftLeadPlus.value = true
      mockItems.value = [{ id: 1, fileName: 'reg.xlsx' }]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      const actionTooltips = wrapper.findAllComponents(ActionButton).map(button =>
        String(button.props('tooltipText') || '')
      )

      expect(actionTooltips).toContain('Удалить реестр')
    })

    it('updates search and table controls through rendered v-model bindings', async () => {
      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      await flushPromises()
      await wrapper.find('[data-testid="v-text-field"] input').setValue('new paperwork search')
      expect(wrapper.vm.localSearch).toBe('new paperwork search')

      const table = wrapper.findComponent({ name: 'v-data-table-server' })
      table.vm.$emit('update:itemsPerPage', 75)
      table.vm.$emit('update:page', 5)
      table.vm.$emit('update:sortBy', [{ key: 'price', order: 'desc' }])
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.registers_per_page).toBe(75)
      expect(wrapper.vm.registers_page).toBe(5)
      expect(wrapper.vm.registers_sort_by).toEqual([{ key: 'price', order: 'desc' }])
    })

    it('opens parcel status bulk dialog and refreshes after dialog updates', async () => {
      mockItems.value = [{ id: 1, registerType: OZON_COMPANY_ID }]
      mockIsSrLogistPlus.value = true
      getAll.mockResolvedValue()

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      await flushPromises()
      const actionButtons = wrapper.findAllComponents(ActionButton)
      const bulkButton = actionButtons.find(button =>
        button.props('tooltipText') === 'Выбрать посылки и изменить статус'
      )

      await bulkButton.find('button').trigger('click')
      await wrapper.vm.$nextTick()

      const dialog = wrapper.find('[data-testid="parcel-status-bulk-dialog"]')
      expect(dialog.attributes('data-show')).toBe('true')
      expect(dialog.attributes('data-register-id')).toBe('1')
      expect(dialog.attributes('data-register-type')).toBe(String(OZON_COMPANY_ID))

      await wrapper.find('[data-testid="parcel-status-bulk-dialog-updated"]').trigger('click')
      await flushPromises()

      expect(getAll).toHaveBeenCalledWith({ mode: OP_MODE_PAPERWORK })
    })

    it('shows and clears alert messages', async () => {
      mockAlert.value = { type: 'alert-danger', message: 'Visible alert' }

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      expect(wrapper.text()).toContain('Visible alert')

      await wrapper.find('.close').trigger('click')

      expect(alertClearFn).toHaveBeenCalled()
    })

    it('passes the current sort model to the server table', async () => {
      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      expect(wrapper.findComponent({ name: 'v-data-table-server' }).props('sortBy')).toEqual([
        { key: 'id', order: 'asc' }
      ])

      wrapper.vm.registers_sort_by = [{ key: 'price', order: 'desc' }]
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent({ name: 'v-data-table-server' }).props('sortBy')).toEqual([
        { key: 'price', order: 'desc' }
      ])
    })

    it('shows a sort icon for sorted custom multiline headers', async () => {
      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      wrapper.vm.registers_sort_by = [{ key: 'weight', order: 'desc' }]
      await wrapper.vm.$nextTick()

      const icon = wrapper.find('[data-testid="v-icon"][data-icon="$sortDesc"]')
      expect(icon.exists()).toBe(true)
      expect(icon.classes()).toContain('register-sort-icon')
    })
  })

  describe('component lifecycle', () => {
    it('cleans up polling on unmount', () => {
      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      expect(lastRegisterActions).toBeTruthy()
      const stopSpy = lastRegisterActions.stopPolling

      // Unmount component
      wrapper.unmount()

      expect(stopSpy).toHaveBeenCalled()
    })
  })

})

describe('formatInvoiceDate function', () => {
  it('formats a valid date string correctly in dd.MM.yyyy format', () => {
    // Test with ISO format string
    const isoDate = '2025-07-27T12:34:56'
    expect(formatDate(isoDate)).toBe('27.07.2025')
    
    // Test with different date
    const anotherDate = '2023-01-05'
    expect(formatDate(anotherDate)).toBe('05.01.2023')
  })
  
  it('handles single-digit day and month with padding', () => {
    // Test with single-digit day
    const singleDigitDay = '2025-07-03'
    expect(formatDate(singleDigitDay)).toBe('03.07.2025')
    
    // Test with single-digit month
    const singleDigitMonth = '2025-03-15'
    expect(formatDate(singleDigitMonth)).toBe('15.03.2025')
    
    // Test with both single-digit day and month
    const bothSingleDigit = '2025-02-09'
    expect(formatDate(bothSingleDigit)).toBe('09.02.2025')
  })
  
  it('returns empty string for null or undefined input', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
  })
  
  it('returns original string for invalid date input', () => {
    const invalidDate = 'not-a-date'
    expect(formatDate(invalidDate)).toBe(invalidDate)
    
    const anotherInvalidDate = '2025/13/45'  // invalid month and day
    expect(formatDate(anotherInvalidDate)).toBe(anotherInvalidDate)
  })
  
  it('handles different date formats correctly', () => {
    // Testing with more reliable date format MM/DD/YYYY (US)
    expect(formatDate('07/27/2025')).toBe('27.07.2025')
    
    // Date object directly
    const dateObj = new Date(2025, 6, 27)  // Month is 0-indexed
    expect(formatDate(dateObj)).toBe('27.07.2025')
    
    // Date with time component
    const dateWithTime = new Date('2025-07-27T15:30:45')
    expect(formatDate(dateWithTime)).toBe('27.07.2025')
  })
})
