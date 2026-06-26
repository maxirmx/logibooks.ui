/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import RegistersWhList from '@/lists/Registers_WhList.vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { vuetifyStubs } from './helpers/test-utils.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import {
  createAirportsById,
  createTransportationTypesById,
  createWarehouseRegisterHeaders,
  formatZoneCount,
  getAirportIata,
  getCountryDisplayName,
  isReturnRegister,
  isAviaTransportation
} from '@/helpers/warehouse.registers.table.helpers.js'

const mockItems = ref([])
const mockCompanies = ref([])
const mockCountries = ref([])
const mockOps = ref({ customsProcedures: [], transportationTypes: [] })
const mockAirports = ref([])
const mockOrderStatuses = ref([])
const getAll = vi.fn()
const getCompaniesAll = vi.fn()
const getAirportsAll = vi.fn()
const ensureParcelStatusesLoadedFn = vi.fn().mockResolvedValue()
const countriesEnsureLoadedFn = vi.fn().mockResolvedValue()
const warehousesEnsureLoadedFn = vi.fn().mockResolvedValue()
const alertErrorFn = vi.fn()
const alertSuccessFn = vi.fn()
const alertClearFn = vi.fn()
const mockAlert = ref(null)
const mockWhPerPage = ref(25)
const mockWhSearch = ref('warehouse search')
const mockWhSortBy = ref([{ key: 'warehouseArrivalDate', order: 'asc' }])
const mockWhPage = ref(3)
const mockIsShiftLeadPlus = ref(true)
const mockIsSrLogistPlus = ref(true)
const mockIsWhManagerPlus = ref(true)
const mockHasWhRole = ref(true)
const confirmMock = vi.fn()

const registersStore = {
  getAll,
  remove: vi.fn(),
  setParcelStatuses: vi.fn(),
  items: mockItems,
  item: ref({}),
  uploadFile: ref(null),
  loading: ref(false),
  error: ref(null),
  totalCount: ref(0),
  ops: mockOps,
  ensureOpsLoaded: vi.fn().mockResolvedValue(),
  getOpsLabel: vi.fn((list, value) => {
    const num = Number(value)
    const match = list?.find(item => Number(item.value) === num)
    return match ? match.name : String(value)
  }),
  getTransportationDocument: vi.fn(id => `Doc ${id}`)
}

vi.mock('@/helpers/register.actions.js', () => ({
  createRegisterActionHandlers: () => ({
    validationState: ref({}),
    progressPercent: ref(0),
    stopPolling: vi.fn()
  })
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.items && store.uploadFile !== undefined) {
        return { items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0), ops: mockOps }
      }
      if (store.companies !== undefined) {
        return { companies: mockCompanies }
      }
      if (store.parcelStatuses !== undefined) {
        return { parcelStatuses: mockOrderStatuses }
      }
      if (store.countries !== undefined) {
        return { countries: mockCountries }
      }
      if (store.airports !== undefined) {
        return { airports: mockAirports }
      }
      if (store.alert !== undefined) {
        return { alert: store.alert }
      }
      return {
        registers_per_page: ref(10),
        registers_search: ref(''),
        registers_sort_by: ref([{ key: 'id', order: 'asc' }]),
        registers_page: ref(1),
        registers_wh_per_page: mockWhPerPage,
        registers_wh_search: mockWhSearch,
        registers_wh_sort_by: mockWhSortBy,
        registers_wh_page: mockWhPage,
        isShiftLeadPlus: mockIsShiftLeadPlus,
        isSrLogistPlus: mockIsSrLogistPlus,
        isWhManagerPlus: mockIsWhManagerPlus,
        hasWhRole: mockHasWhRole
      }
    }
  }
})

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => registersStore
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    getAll: vi.fn(),
    ensureLoaded: ensureParcelStatusesLoadedFn,
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
    getAll: vi.fn(),
    ensureLoaded: countriesEnsureLoadedFn
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
    ensureLoaded: warehousesEnsureLoadedFn,
    getWarehouseName: vi.fn(id => id ? `Warehouse ${id}` : 'Не указан')
  })
}))

vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    getStatusById: vi.fn(id => id
      ? { id, title: `Status ${id}`, icon: 'fa-solid fa-circle-check', bkColor: '#00AA00', fgColor: '#FFFFFF' }
      : null
    ),
    getStatusTitle: vi.fn(id => id ? `Status ${id}` : 'Не указан')
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    clear: alertClearFn,
    error: alertErrorFn,
    success: alertSuccessFn
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    registers_per_page: ref(10),
    registers_search: ref(''),
    registers_sort_by: ref([{ key: 'id', order: 'asc' }]),
    registers_page: ref(1),
    registers_wh_per_page: mockWhPerPage,
    registers_wh_search: mockWhSearch,
    registers_wh_sort_by: mockWhSortBy,
    registers_wh_page: mockWhPage,
    isShiftLeadPlus: mockIsShiftLeadPlus,
    isSrLogistPlus: mockIsSrLogistPlus,
    isWhManagerPlus: mockIsWhManagerPlus,
    hasWhRole: mockHasWhRole
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

describe('Registers_WhList.vue', () => {
  const createWrapper = () => {
    return mount(RegistersWhList, {
      global: {
        stubs: vuetifyStubs
      }
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    mockItems.value = [{ id: 1 }]
    mockCompanies.value = []
    mockCountries.value = []
    mockAirports.value = []
    mockOps.value = { customsProcedures: [], transportationTypes: [] }
    registersStore.error = ref(null)
    registersStore.remove.mockReset()
    registersStore.remove.mockResolvedValue()
    mockWhPerPage.value = 25
    mockWhSearch.value = 'warehouse search'
    mockWhSortBy.value = [{ key: 'warehouseArrivalDate', order: 'asc' }]
    mockWhPage.value = 3
    mockIsShiftLeadPlus.value = true
    mockIsSrLogistPlus.value = true
    mockIsWhManagerPlus.value = true
    mockHasWhRole.value = true
    mockAlert.value = null
    confirmMock.mockReset()
    ensureParcelStatusesLoadedFn.mockClear()
    countriesEnsureLoadedFn.mockClear()
    warehousesEnsureLoadedFn.mockClear()
    const router = (await import('@/router')).default
    router.push.mockClear()
  })

  it('loads warehouse parties explicitly', async () => {
    createWrapper()
    await flushPromises()

    expect(getAll).toHaveBeenCalledWith({ mode: OP_MODE_WAREHOUSE })
  })

  it('reports store errors after loading warehouse parties', async () => {
    getAll.mockImplementationOnce(() => {
      registersStore.error.value = 'warehouse load failed'
      return Promise.resolve()
    })

    createWrapper()
    await flushPromises()

    expect(alertErrorFn).toHaveBeenCalledWith('warehouse load failed')
  })

  it('reports Error object store errors after loading warehouse parties', async () => {
    getAll.mockImplementationOnce(() => {
      registersStore.error.value = new Error('warehouse object load failed')
      return Promise.resolve()
    })

    createWrapper()
    await flushPromises()

    expect(alertErrorFn).toHaveBeenCalledWith('warehouse object load failed')
  })

  it('reports initialization failures', async () => {
    registersStore.ensureOpsLoaded.mockRejectedValueOnce(new Error('ops failed'))

    createWrapper()
    await flushPromises()

    expect(alertErrorFn).toHaveBeenCalledWith('ops failed')
  })

  it('reports fallback initialization error text for non-error failures', async () => {
    registersStore.ensureOpsLoaded.mockRejectedValueOnce('ops failed')

    createWrapper()
    await flushPromises()

    expect(alertErrorFn).toHaveBeenCalledWith('Ошибка при загрузке данных')
  })

  it('stops initialization work after unmounting during initial load', async () => {
    let resolveStatuses
    ensureParcelStatusesLoadedFn.mockImplementationOnce(() => new Promise((resolve) => {
      resolveStatuses = resolve
    }))

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    wrapper.unmount()
    resolveStatuses()
    await flushPromises()

    expect(registersStore.ensureOpsLoaded).not.toHaveBeenCalled()
    expect(getCompaniesAll).not.toHaveBeenCalled()
  })

  it('stops initialization work after unmounting while countries load', async () => {
    let resolveCountries
    countriesEnsureLoadedFn.mockImplementationOnce(() => new Promise((resolve) => {
      resolveCountries = resolve
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(countriesEnsureLoadedFn).toHaveBeenCalled()
    wrapper.unmount()
    resolveCountries()
    await flushPromises()

    expect(registersStore.ensureOpsLoaded).not.toHaveBeenCalled()
  })

  it('stops initialization work after unmounting while warehouse ops load', async () => {
    let resolveOps
    registersStore.ensureOpsLoaded.mockImplementationOnce(() => new Promise((resolve) => {
      resolveOps = resolve
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(registersStore.ensureOpsLoaded).toHaveBeenCalled()
    wrapper.unmount()
    resolveOps()
    await flushPromises()

    expect(warehousesEnsureLoadedFn).not.toHaveBeenCalled()
  })

  it('stops initialization work after unmounting while warehouses load', async () => {
    let resolveWarehouses
    warehousesEnsureLoadedFn.mockImplementationOnce(() => new Promise((resolve) => {
      resolveWarehouses = resolve
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(warehousesEnsureLoadedFn).toHaveBeenCalled()
    wrapper.unmount()
    resolveWarehouses()
    await flushPromises()

    expect(getCompaniesAll).not.toHaveBeenCalled()
  })

  it('uses warehouse labels and shows actions allowed by warehouse roles', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('h1').text()).toBe('Партии')
    expect(wrapper.find('.v-text-field-stub span').text()).toBe('Поиск по любой информации о партии')
    expect(wrapper.findComponent(ActionButton2L).exists()).toBe(false)
    expect(wrapper.find('[data-testid="v-file-input"]').exists()).toBe(false)

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const hasEdit = actionButtons.some(button =>
      String(button.props('tooltipText') || '').includes('Редактировать')
    )
    const hasDelete = actionButtons.some(button =>
      String(button.props('tooltipText') || '').includes('Удалить')
    )

    expect(hasEdit).toBe(true)
    expect(hasDelete).toBe(true)

    const hasWarehouseTooltip = actionButtons.some(button =>
      String(button.props('tooltipText') || '').includes('в партии')
    )
    expect(hasWarehouseTooltip).toBe(true)
  })

  it('hides warehouse register delete action below shift lead role', async () => {
    mockIsShiftLeadPlus.value = false

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const hasDelete = actionButtons.some(button =>
      String(button.props('tooltipText') || '').includes('Удалить')
    )

    expect(hasDelete).toBe(false)
  })

  it('uses confirmation workflow when deleting warehouse parties', async () => {
    confirmMock.mockResolvedValueOnce(true)
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const item = { id: 12, fileName: 'party.xlsx' }

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
      content: 'Удалить партию "party.xlsx" ?'
    })
    expect(registersStore.remove).toHaveBeenCalledWith(12)
  })

  it('does not delete warehouse party when confirmation is cancelled', async () => {
    confirmMock.mockResolvedValueOnce(false)
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    await wrapper.vm.deleteRegister({ id: 12, fileName: 'party.xlsx' })

    expect(registersStore.remove).not.toHaveBeenCalled()
  })

  it('reports warehouse party delete errors', async () => {
    confirmMock.mockResolvedValueOnce(true)
    registersStore.remove.mockRejectedValueOnce(new Error('delete failed'))
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    await wrapper.vm.deleteRegister({ id: 12, fileName: 'party.xlsx' })

    expect(alertErrorFn).toHaveBeenCalledWith('Ошибка при удалении партии: delete failed')
  })

  it('shows return-register action and routes to creation view', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.vm.$nextTick()

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const returnButton = actionButtons.find(button =>
      button.props('tooltipText') === 'Создать реестр возврата'
    )

    expect(returnButton).toBeTruthy()

    const router = (await import('@/router')).default
    await returnButton.find('button').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/register/return')
  })

  it('uses warehouse-specific table headers', async () => {
    const headers = createWarehouseRegisterHeaders()
    const headerKeys = headers.map(header => header.key)
    const headerTitles = headers.map(header => header.title)

    expect(headerKeys).toEqual([
      'actions',
      'dealNumber',
      'invoice',
      'countries',
      'senderRecipient',
      'parcelsTotal',
      'parcelsByZone',
      'statusId',
      'warehouseId',
      'warehouseArrivalDate'
    ])
    expect(headerTitles).toEqual([
      '',
      'Номер сделки',
      'ТСД',
      'Страны',
      'Отправитель/Получатель',
      'Товаров/Посылок',
      'Зоны',
      'Статус',
      'Склад',
      'Дата прибытия'
    ])
  })

  it('binds table controls to warehouse register list state', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent({ name: 'v-data-table-server' })

    expect(table.props('itemsPerPage')).toBe(25)
    expect(table.props('page')).toBe(3)
    expect(table.props('sortBy')).toEqual([
      { key: 'warehouseArrivalDate', order: 'asc' }
    ])
    expect(wrapper.vm.localSearch).toBe('warehouse search')
  })

  it('enables the register-status icon column on the warehouse table', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent({ name: 'WarehouseRegistersTable' })
    expect(table.props('showRegisterStatusIcon')).toBe(true)
  })

  it('falls back to empty local search when no warehouse search is persisted', async () => {
    mockWhSearch.value = ''

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.localSearch).toBe('')
  })

  it('updates search and table controls through rendered v-model bindings', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="v-text-field"] input').setValue('new warehouse search')
    expect(wrapper.vm.localSearch).toBe('new warehouse search')

    const table = wrapper.findComponent({ name: 'v-data-table-server' })
    table.vm.$emit('update:itemsPerPage', 75)
    table.vm.$emit('update:page', 5)
    table.vm.$emit('update:sortBy', [{ key: 'warehouseId', order: 'desc' }])
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.registers_per_page).toBe(75)
    expect(wrapper.vm.registers_page).toBe(5)
    expect(wrapper.vm.registers_sort_by).toEqual([{ key: 'warehouseId', order: 'desc' }])
  })

  it('marks warehouse visible columns as sortable', async () => {
    const sortableByKey = Object.fromEntries(
      createWarehouseRegisterHeaders().map(header => [header.key, header.sortable])
    )

    expect(sortableByKey.actions).toBe(false)
    expect(sortableByKey.dealNumber).toBe(true)
    expect(sortableByKey.invoice).toBe(true)
    expect(sortableByKey.countries).toBe(true)
    expect(sortableByKey.senderRecipient).toBe(true)
    expect(sortableByKey.parcelsTotal).toBe(true)
    expect(sortableByKey.parcelsByZone).toBe(false)
    expect(sortableByKey.statusId).toBe(true)
    expect(sortableByKey.warehouseId).toBe(true)
    expect(sortableByKey.warehouseArrivalDate).toBe(true)
  })

  it('aligns warehouse parcels header with numeric cells', async () => {
    const parcelsHeader = createWarehouseRegisterHeaders().find(header => header.key === 'parcelsTotal')

    expect(parcelsHeader.align).toBe('end')
    expect(parcelsHeader.width).toBe('150px')
  })

  it('renders warehouse zone distribution counts and hides zero values', async () => {
    mockItems.value = [{
      id: 57,
      parcelsByZone: {
        1: 3,
        10: 0,
        20: 12
      }
    }]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('.zone-distribution-row')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('Без зоны')
    expect(rows[0].text()).toContain('3')
    expect(rows[1].text()).toContain('Зеленая')
    expect(rows[1].text()).toContain('-')
    expect(rows[2].text()).toContain('Красная')
    expect(rows[2].text()).toContain('12')
    expect(formatZoneCount({}, 1)).toBe('-')
  })

  it('shows a sort icon for warehouse custom multiline headers', async () => {
    const wrapper = createWrapper()
    wrapper.vm.registers_sort_by = [{ key: 'warehouseArrivalDate', order: 'asc' }]
    await wrapper.vm.$nextTick()

    const icon = wrapper.find('[data-testid="v-icon"][data-icon="$sortAsc"]')
    expect(icon.exists()).toBe(true)
    expect(icon.classes()).toContain('register-sort-icon')
  })

  it('uses warehouse-specific nouns', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.registerNouns.genitivePluralCapitalized).toBe('Партий')
    expect(wrapper.vm.registerNouns.genitiveSingular).toBe('партии')
    expect(wrapper.vm.registerNouns.genitivePlural).toBe('партий')
  })

  it('uses warehouse-specific tooltips for bulk actions', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const bulkStatusButton = actionButtons.find(button =>
      String(button.props('tooltipText') || '').includes('партии')
    )

    expect(bulkStatusButton).toBeTruthy()
    expect(bulkStatusButton.props('tooltipText')).toContain('в партии')
  })

  it('covers country and airport display fallbacks', () => {
    let countries = [
      { isoNumeric: 36, nameRuOfficial: 'Австралийский Союз' },
      { isoNumeric: 840, nameRuShort: 'США' }
    ]
    const ops = {
      customsProcedures: [],
      transportationTypes: [
        { value: 2, name: 'Авиа', document: 'AWB', isAvia: true },
        { value: 3, name: 'Авто', document: 'CMR', isAvia: false }
      ]
    }
    const airports = [
      { id: 20, codeIata: 'JFK' }
    ]
    const transportationTypesById = createTransportationTypesById(ops)
    const airportsById = createAirportsById(airports)

    expect(getCountryDisplayName({}, null, null, countries, transportationTypesById, airportsById)).toBe('Неизвестно')
    expect(getCountryDisplayName({ transportationTypeCode: 3 }, 643, null, countries, transportationTypesById, airportsById)).toBe('Россия')
    expect(getCountryDisplayName({ transportationTypeCode: 3 }, 999, null, countries, transportationTypesById, airportsById)).toBe(999)
    expect(getCountryDisplayName({ transportationTypeCode: 3 }, 36, null, countries, transportationTypesById, airportsById)).toBe('Австралийский Союз')

    countries = [{ isoNumeric: 156 }]
    expect(getCountryDisplayName({ transportationTypeCode: 3 }, 156, null, countries, transportationTypesById, airportsById)).toBe(156)

    countries = [
      { isoNumeric: 36, nameRuOfficial: 'Австралийский Союз' },
      { isoNumeric: 840, nameRuShort: 'США' }
    ]
    expect(getCountryDisplayName({ transportationTypeCode: 2 }, 840, null, countries, transportationTypesById, airportsById)).toBe('США')
    expect(getCountryDisplayName({ transportationTypeCode: 2 }, 840, 20, countries, transportationTypesById, airportsById)).toBe('США (JFK)')
    expect(isAviaTransportation({ transportationTypeCode: 'invalid' }, transportationTypesById)).toBe(false)
    expect(isAviaTransportation({ transportationTypeCode: 99 }, transportationTypesById)).toBe(false)
    expect(getAirportIata(0, airportsById)).toBeNull()

    const emptyTransportationTypesById = createTransportationTypesById({ customsProcedures: [], transportationTypes: null })
    const emptyAirportsById = createAirportsById(null)
    expect(isAviaTransportation({ transportationTypeCode: 2 }, emptyTransportationTypesById)).toBe(false)
    expect(getAirportIata(20, emptyAirportsById)).toBeNull()
  })

  it('renders bulk edit controls and applies or cancels status changes', async () => {
    mockItems.value = [{ id: 1 }]
    registersStore.setParcelStatuses.mockResolvedValue()
    getAll.mockResolvedValue()

    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.vm.$nextTick()

    let actionButtons = wrapper.findAllComponents(ActionButton)
    let bulkButton = actionButtons.find(button =>
      String(button.props('tooltipText') || '').includes('Изменить статус')
    )

    await bulkButton.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="v-select"]').exists()).toBe(true)
    const select = wrapper.findComponent(vuetifyStubs['v-select'])
    select.vm.$emit('update:modelValue', 6)
    await wrapper.vm.$nextTick()

    actionButtons = wrapper.findAllComponents(ActionButton)
    const cancelButton = actionButtons.find(button =>
      button.props('tooltipText') === 'Отменить'
    )
    await cancelButton.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    actionButtons = wrapper.findAllComponents(ActionButton)
    bulkButton = actionButtons.find(button =>
      String(button.props('tooltipText') || '').includes('Изменить статус')
    )
    await bulkButton.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    wrapper.vm.setSelectedStatusId(1, 5)
    await wrapper.vm.$nextTick()

    actionButtons = wrapper.findAllComponents(ActionButton)
    const applyButton = actionButtons.find(button =>
      button.props('tooltipText') === 'Применить статус'
    )
    await applyButton.find('button').trigger('click')
    await flushPromises()

    expect(registersStore.setParcelStatuses).toHaveBeenCalledWith(1, 5)
    expect(getAll).toHaveBeenCalledWith({ mode: OP_MODE_WAREHOUSE })
    expect(wrapper.vm.isInEditMode(1)).toBe(false)
  })

  it('opens parcels with warehouse mode from row cells', async () => {
    mockItems.value = [{ id: 88, dealNumber: 'D-88' }]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const router = (await import('@/router')).default
    await wrapper.find('.open-parcels-link').trigger('click')

    expect(router.push).toHaveBeenCalledWith('/registers/88/parcels?mode=modeWarehouse')
  })

  it('renders bookmark marker for lookup-by-article warehouse parties', async () => {
    mockItems.value = [{ id: 88, dealNumber: 'D-88', lookupByArticle: true }]

    const wrapper = mount(RegistersWhList, {
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

  it('ignores missing items for guarded warehouse actions', async () => {
    const wrapper = createWrapper()
    const router = (await import('@/router')).default

    wrapper.vm.openUnregisteredParcels(null)
    wrapper.vm.openScanjobCreate(null)

    expect(router.push).not.toHaveBeenCalledWith(expect.stringContaining('unregistered-parcels'))
    expect(router.push).not.toHaveBeenCalledWith(expect.objectContaining({ path: '/scanjob/create' }))
  })

  it('shows and clears alert messages', async () => {
    mockAlert.value = { type: 'alert-danger', message: 'Visible warehouse alert' }

    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Visible warehouse alert')

    await wrapper.find('.close').trigger('click')

    expect(alertClearFn).toHaveBeenCalled()
  })

  it('cleans up watchers on unmount', () => {
    const wrapper = createWrapper()

    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('renders status, warehouse, and arrival date cells', async () => {
    mockItems.value = [{
      id: 55,
      statusId: 5,
      warehouseId: 12,
      warehouseArrivalDate: '2024-02-01'
    }]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Status 5')
    expect(wrapper.text()).toContain('Warehouse 12')
    expect(wrapper.text()).toContain('01.02.2024')
  })

  it('opens parcels from status, warehouse, and arrival date cells', async () => {
    mockItems.value = [{
      id: 55,
      statusId: 5,
      warehouseId: 12,
      warehouseArrivalDate: '2024-02-01'
    }]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const router = (await import('@/router')).default
    const expectedRoute = '/registers/55/parcels?mode=modeWarehouse'

    await wrapper.find('.status-panel').trigger('click')
    await wrapper.find('.warehouse-panel').trigger('click')
    await wrapper.find('.warehouse-arrival-panel').trigger('click')

    expect(router.push).toHaveBeenCalledTimes(3)
    expect(router.push).toHaveBeenNthCalledWith(1, expectedRoute)
    expect(router.push).toHaveBeenNthCalledWith(2, expectedRoute)
    expect(router.push).toHaveBeenNthCalledWith(3, expectedRoute)
  })

  it('renders return registers with blank invoice and return-only countries cell', async () => {
    const returnRegister = {
      id: 56,
      customsProcedureCode: 1,
      invoiceNumber: 'INV-56',
      invoiceDate: '2024-02-01',
      transportationTypeCode: 2,
      origCountryCode: 643,
      destCountryCode: 860
    }
    mockItems.value = [returnRegister]
    mockOps.value = {
      customsProcedures: [{ value: 1, name: 'Возврат' }],
      transportationTypes: [{ value: 2, name: 'Авиа', document: 'AWB', isAvia: true }]
    }
    mockCountries.value = [
      { isoNumeric: 860, nameRuShort: 'Узбекистан' }
    ]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(isReturnRegister(returnRegister)).toBe(true)
    expect(wrapper.find('.countries-panel').text()).toBe('Возврат')
    expect(wrapper.text()).not.toContain('INV-56')
    expect(wrapper.text()).not.toContain('AWB')
    expect(registersStore.getTransportationDocument).not.toHaveBeenCalled()
  })

  it('renders warehouse projection tooltip for parcels totals', async () => {
    mockItems.value = [{
      id: 56,
      parcelsTotal: 7,
      placesTotal: 2,
      parcelsByCheckStatus: {
        [CheckStatusCode.NoIssues.value]: 7
      },
      parcelsByCheckStatusProjection: {
        20: 2,
        30: 5
      }
    }]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Запрет: 2')
    expect(wrapper.text()).toContain('Проверено: 5')
    expect(wrapper.text()).not.toContain('Ок стоп слова')
  })

  it('navigates to edit register with warehouse mode in query', async () => {
    mockItems.value = [{ id: 42, senderId: 10 }]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const router = (await import('@/router')).default
    const cell = wrapper.find('.edit-register-link')
    await cell.trigger('click')
    expect(router.push).toHaveBeenCalledWith('/register/edit/42?mode=modeWarehouse')
  })

  it('navigates to unregistered parcels when rectangle list action is clicked', async () => {
    mockItems.value = [{ id: 77 }]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const unregisteredButton = actionButtons.find(button =>
      String(button.props('tooltipText') || '').includes('Стикеры не в реестре')
    )

    expect(unregisteredButton).toBeTruthy()

    const router = (await import('@/router')).default
    await unregisteredButton.find('button').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/registers/77/unregistered-parcels')
  })

  it('navigates to create scan job when barcode action is clicked', async () => {
    mockItems.value = [{ id: 7, warehouseId: 12, dealNumber: 'D-77' }]

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const barcodeButton = actionButtons.find(button =>
      String(button.props('tooltipText') || '').includes('Создать задание на сканирование')
    )

    expect(barcodeButton).toBeTruthy()

    const router = (await import('@/router')).default
    await barcodeButton.find('button').trigger('click')
    expect(router.push).toHaveBeenCalledWith({
      path: '/scanjob/create',
      query: {
        registerId: 7,
        warehouseId: 12,
        dealNumber: 'D-77'
      }
    })
  })
})
