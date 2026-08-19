/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RegisterHistoryList from '@/lists/RegisterHistory_List.vue'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const mocks = vi.hoisted(() => ({
  canView: true,
  registerItem: {},
  ops: {},
  countries: [],
  companies: [],
  airports: [],
  warehouses: [],
  getHistory: vi.fn(),
  resetHistory: vi.fn(),
  ensureStatuses: vi.fn(),
  ensureCountries: vi.fn(),
  getCompanies: vi.fn(),
  getAirports: vi.fn(),
  ensureWarehouses: vi.fn(),
  ensureOps: vi.fn(),
  getRegister: vi.fn(),
  alertError: vi.fn(),
  routerPush: vi.fn()
}))

var mockRefs

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  const { ref } = await vi.importActual('vue')
  mockRefs = {
    items: ref([]),
    totalCount: ref(0),
    userOptions: ref([]),
    reasonOptions: ref([]),
    loading: ref(false),
    alert: ref(null)
  }
  return {
    ...actual,
    storeToRefs: () => mockRefs
  }
})

vi.mock('@/router', () => ({
  default: { push: mocks.routerPush }
}))

vi.mock('@/stores/register.history.store.js', () => ({
  useRegisterHistoryStore: () => ({
    items: mockRefs.items,
    totalCount: mockRefs.totalCount,
    userOptions: mockRefs.userOptions,
    reasonOptions: mockRefs.reasonOptions,
    loading: mockRefs.loading,
    getHistory: mocks.getHistory,
    reset: mocks.resetHistory
  })
}))

vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => ({
    ensureLoaded: mocks.ensureStatuses,
    getStatusById: (id) =>
      ({
        1: { id: 1, title: 'Получен' },
        2: { id: 2, title: 'На складе' }
      }[id] || null)
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    get item() {
      return mocks.registerItem
    },
    get ops() {
      return mocks.ops
    },
    getById: mocks.getRegister,
    ensureOpsLoaded: mocks.ensureOps,
    getOpsLabel: (list, value) =>
      list?.find((item) => Number(item.value) === Number(value))?.name || String(value),
    getTransportationDocument: () => 'Авианакладная'
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    get countries() {
      return mocks.countries
    },
    getCountryShortName: (value) => {
      if (Number(value) === 643) return 'Россия'
      const country = mocks.countries.find((item) => Number(item.isoNumeric) === Number(value))
      return country?.nameRuShort || country?.nameRuOfficial || value
    },
    ensureLoaded: mocks.ensureCountries
  })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({
    get companies() {
      return mocks.companies
    },
    getAll: mocks.getCompanies
  })
}))

vi.mock('@/stores/airports.store.js', () => ({
  useAirportsStore: () => ({
    get airports() {
      return mocks.airports
    },
    getAll: mocks.getAirports
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    get warehouses() {
      return mocks.warehouses
    },
    getWarehouseName: (value) =>
      mocks.warehouses.find((item) => Number(item.id) === Number(value))?.name || String(value),
    ensureLoaded: mocks.ensureWarehouses
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    get isShiftLeadPlus() {
      return mocks.canView
    }
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    get alert() {
      return mockRefs.alert.value
    },
    activePageHosts: 0,
    error: mocks.alertError,
    dismiss: (id) => {
      if (!mockRefs.alert.value || mockRefs.alert.value.id === id) mockRefs.alert.value = null
    },
    pause: vi.fn(),
    resume: vi.fn(),
    registerPageHost: vi.fn(),
    unregisterPageHost: vi.fn()
  })
}))

describe('RegisterHistory_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.canView = true
    mocks.registerItem = {
      id: 42,
      dealNumber: 'DEAL-42',
      invoiceNumber: 'INV-42',
      transportationTypeCode: 1
    }
    mocks.ops = {
      transportationTypes: [
        { value: 1, name: 'Авиа' },
        { value: 2, name: 'Авто' }
      ],
      customsProcedures: [
        { value: 10, name: 'Экспорт' },
        { value: 40, name: 'Выпуск для внутреннего потребления' }
      ],
      incoterms: [
        { value: 1, charCode: 'FCA', name: 'Франко перевозчик' },
        { value: 2, charCode: 'CPT', name: 'Перевозка оплачена до' }
      ]
    }
    mocks.companies = [
      { id: 1, shortName: 'Озон' },
      { id: 2, shortName: 'РВБ' },
      { id: 5, shortName: 'Новый контрагент' },
      { id: 11, shortName: 'Старый контрагент' }
    ]
    mocks.countries = [
      { isoNumeric: 268, nameRuShort: 'Грузия' },
      { isoNumeric: 860, nameRuShort: 'Узбекистан' }
    ]
    mocks.airports = [
      { id: 1, name: 'Шереметьево', codeIata: 'SVO' },
      { id: 2, name: 'Домодедово', codeIata: 'DME' }
    ]
    mocks.warehouses = [
      { id: 1, name: 'Склад Север' },
      { id: 2, name: 'Склад Юг' }
    ]
    mockRefs.items.value = [
      {
        id: 1,
        changedAt: '2026-07-30T12:00:00Z',
        userName: 'Иванов Иван',
        userEmail: 'ivan@example.com',
        reason: 'Сохранение изменений',
        changes: [
          {
            field: 'StatusId',
            oldValue: '1',
            newValue: '2'
          }
        ]
      }
    ]
    mockRefs.totalCount.value = 1
    mockRefs.userOptions.value = [
      { userId: 0, userName: 'Система', userEmail: '' },
      { userId: 7, userName: 'Иванов Иван', userEmail: 'ivan@example.com' }
    ]
    mockRefs.reasonOptions.value = ['Создание реестра', 'Сохранение изменений']
    mockRefs.alert.value = null
    mocks.ensureStatuses.mockResolvedValue()
    mocks.ensureCountries.mockResolvedValue()
    mocks.getCompanies.mockResolvedValue()
    mocks.getAirports.mockResolvedValue()
    mocks.ensureWarehouses.mockResolvedValue()
    mocks.ensureOps.mockResolvedValue()
    mocks.getRegister.mockResolvedValue()
    mocks.getHistory.mockResolvedValue()
    mocks.alertError.mockImplementation((error, options = {}) => {
      mockRefs.alert.value = {
        id: 1,
        severity: 'error',
        message: error?.message || options.fallback,
        action: options.action ?? null
      }
    })
  })

  it('loads and renders structured history for an authorized user', async () => {
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    expect(mocks.ensureStatuses).toHaveBeenCalled()
    expect(mocks.ensureCountries).toHaveBeenCalled()
    expect(mocks.getCompanies).toHaveBeenCalled()
    expect(mocks.getAirports).toHaveBeenCalled()
    expect(mocks.ensureWarehouses).toHaveBeenCalled()
    expect(mocks.ensureOps).toHaveBeenCalled()
    expect(mocks.getRegister).toHaveBeenCalledWith(42)
    expect(mocks.getHistory).toHaveBeenCalledWith(42, {
      page: 1,
      pageSize: 50,
      sortBy: 'changedAt',
      sortOrder: 'desc',
      userId: null,
      reason: null
    })
    expect(wrapper.text()).toContain('История изменений: Реестр DEAL-42 (Авианакладная INV-42)')
    expect(wrapper.text()).toContain('Иванов Иван')
    expect(wrapper.text()).toContain('Сохранение изменений')
    expect(wrapper.text()).toContain('Статус: Получен → На складе')
  })

  it('renders the collapsed event count before the newest event changes', async () => {
    mockRefs.items.value[0].eventCount = 3

    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    expect(wrapper.get('.history-event-count').text()).toBe('Количество изменений: 3')
    expect(wrapper.text().indexOf('Количество изменений: 3')).toBeLessThan(
      wrapper.text().indexOf('Статус: Получен → На складе')
    )
  })

  it.each([
    ['one', 1],
    ['missing', undefined],
    ['zero', 0],
    ['negative', -1],
    ['fractional', 2.5],
    ['string', '3'],
    ['null', null]
  ])('hides a non-grouped or invalid %s event count', async (_case, eventCount) => {
    mockRefs.items.value[0].eventCount = eventCount

    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    expect(wrapper.find('.history-event-count').exists()).toBe(false)
  })

  it('shows a collapsed event count when the newest event has no change details', async () => {
    mockRefs.items.value[0].eventCount = 4
    mockRefs.items.value[0].changes = []

    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    expect(wrapper.get('.history-event-count').text()).toBe('Количество изменений: 4')
    expect(wrapper.text()).toContain('Нет данных')
  })

  it('renders register-specific selectors and requests AND-combined filters from page one', async () => {
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    const selects = wrapper.findAllComponents({ name: 'v-select' })
    expect(selects).toHaveLength(2)
    expect(selects[0].props('label')).toBe('Пользователь')
    expect(selects[0].props('items')).toEqual([
      { title: 'Все пользователи', value: null },
      { title: 'Система', value: 0 },
      { title: 'Иванов Иван (ivan@example.com)', value: 7 }
    ])
    expect(selects[1].props('label')).toBe('Причина')
    expect(selects[1].props('items')).toEqual([
      { title: 'Все причины', value: null },
      { title: 'Создание реестра', value: 'Создание реестра' },
      { title: 'Сохранение изменений', value: 'Сохранение изменений' }
    ])

    const table = wrapper.findComponent({ name: 'v-data-table-server' })
    table.vm.$emit('update:page', 3)
    await flushPromises()
    selects[0].vm.$emit('update:modelValue', 0)
    selects[1].vm.$emit('update:modelValue', 'Сохранение изменений')
    await flushPromises()

    expect(mocks.getHistory).toHaveBeenLastCalledWith(42, {
      page: 1,
      pageSize: 50,
      sortBy: 'changedAt',
      sortOrder: 'desc',
      userId: 0,
      reason: 'Сохранение изменений'
    })
  })

  it('enables mandatory server sorting for date, user, and reason', async () => {
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    const table = wrapper.findComponent({ name: 'v-data-table-server' })
    expect(table.props('sortBy')).toEqual([{ key: 'changedAt', order: 'desc' }])
    expect(table.props('mustSort')).toBeDefined()
    expect(table.props('headers').map(({ key, sortable }) => ({ key, sortable }))).toEqual([
      { key: 'changedAt', sortable: true },
      { key: 'user', sortable: true },
      { key: 'reason', sortable: true },
      { key: 'changes', sortable: false }
    ])

    table.vm.$emit('update:sortBy', [{ key: 'user', order: 'asc' }])
    await flushPromises()

    expect(mocks.getHistory).toHaveBeenLastCalledWith(42, {
      page: 1,
      pageSize: 50,
      sortBy: 'user',
      sortOrder: 'asc',
      userId: null,
      reason: null
    })
  })

  it('shows one retryable page alert and retries the current criteria after a load failure', async () => {
    mocks.getHistory.mockRejectedValueOnce(new Error('История недоступна'))
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    const alert = wrapper.get('[data-testid="page-alert-region"]')
    expect(alert.text()).toContain('История недоступна')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(mocks.alertError).toHaveBeenCalledTimes(1)

    await alert.get('.page-alert-region__action').trigger('click')
    await flushPromises()

    expect(mocks.getHistory).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
  })

  it('does not report a stale failure after a newer filtered request succeeds', async () => {
    let rejectFirstRequest
    mocks.getHistory
      .mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            rejectFirstRequest = reject
          })
      )
      .mockResolvedValueOnce()
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await wrapper.vm.$nextTick()

    wrapper.vm.onReasonFilterChange('Создание реестра')
    await flushPromises()
    rejectFirstRequest(new Error('Устаревшая ошибка'))
    await flushPromises()

    expect(mocks.getHistory).toHaveBeenCalledTimes(2)
    expect(mocks.alertError).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
  })

  it('does not request or render history for unauthorized roles', async () => {
    mocks.canView = false
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    expect(mocks.getHistory).not.toHaveBeenCalled()
    expect(mocks.getRegister).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('доступна только администраторам и старшим смены')
    expect(wrapper.findComponent({ name: 'v-data-table-server' }).exists()).toBe(false)
  })

  it('uses the batch label in the header for warehouse context', async () => {
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42, mode: OP_MODE_WAREHOUSE },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    expect(wrapper.get('.primary-heading').text()).toBe(
      'История изменений: Партия DEAL-42 (Авианакладная INV-42)'
    )
  })

  it('uses an action button to return to the register list preserving the operation mode', async () => {
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42, mode: OP_MODE_WAREHOUSE },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    await wrapper.get('[data-testid="register-history-back"]').trigger('click')
    expect(mocks.routerPush).toHaveBeenCalledWith({
      path: '/registers',
      query: { mode: OP_MODE_WAREHOUSE }
    })
  })

  it('shows the standard list spinner while the history page is loading', async () => {
    let resolveHistory
    mocks.getHistory.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveHistory = resolve
        })
    )

    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="register-history-spinner"]').classes()).toEqual(
      expect.arrayContaining(['spinner-border', 'spinner-border-m'])
    )
    expect(
      wrapper.get('[data-testid="register-history-back"]').attributes('disabled')
    ).toBeDefined()

    resolveHistory()
    await flushPromises()

    expect(wrapper.find('[data-testid="register-history-spinner"]').exists()).toBe(false)
    expect(
      wrapper.get('[data-testid="register-history-back"]').attributes('disabled')
    ).toBeUndefined()
  })

  it('renders reference changes as text instead of identifiers', async () => {
    mockRefs.items.value[0].changes = [
      { field: 'CompanyId', oldValue: '1', newValue: '2' },
      { field: 'RegisterType', oldValue: '1', newValue: String(WBRN_REGISTER_ID) },
      { field: 'StatusId', oldValue: '1', newValue: '2' },
      { field: 'TheOtherCompanyId', oldValue: '11', newValue: '5' },
      { field: 'TheOtherCountryCode', oldValue: '860', newValue: '268' },
      { field: 'DepartureAirportId', oldValue: '1', newValue: '2' },
      { field: 'TransportationTypeCode', oldValue: '1', newValue: '2' },
      { field: 'CustomsProcedureCode', oldValue: '10', newValue: '40' },
      { field: 'IncotermsCode', oldValue: '2', newValue: '1' },
      { field: 'WarehouseId', oldValue: '1', newValue: '2' }
    ]

    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Компания: Озон → РВБ')
    expect(text).toContain('Тип реестра: Озон → РВБ новый формат')
    expect(text).toContain('Статус: Получен → На складе')
    expect(text).toContain('Контрагент: Старый контрагент → Новый контрагент')
    expect(text).toContain('Страна: Узбекистан → Грузия')
    expect(text).toContain('Аэропорт отправления: Шереметьево (SVO) → Домодедово (DME)')
    expect(text).toContain('Тип транспорта: Авиа → Авто')
    expect(text).toContain('Таможенная процедура: Экспорт → Выпуск для внутреннего потребления')
    expect(text).toContain(
      'Условия поставки: CPT — Перевозка оплачена до → FCA — Франко перевозчик'
    )
    expect(text).toContain('Склад: Склад Север → Склад Юг')
    expect(text).not.toContain('Контрагент: 11 → 5')
    expect(text).not.toContain(`Тип реестра: 1 → ${WBRN_REGISTER_ID}`)
  })

  it('renders inspection count and transit changes with user-facing labels and values', async () => {
    mockRefs.items.value[0].changes = [
      { field: 'InspectionsCount', oldValue: null, newValue: '12' },
      { field: 'WithTransit', oldValue: false, newValue: true }
    ]

    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Количество досмотренных посылок: не указано → 12')
    expect(text).toContain('Транзит: Нет → Да')
    expect(text).not.toContain('InspectionsCount')
    expect(text).not.toContain('WithTransit')
  })

  it('uses descriptive fallbacks for references that no longer exist', async () => {
    mockRefs.items.value[0].changes = [
      { field: 'StatusId', oldValue: '999', newValue: null },
      { field: 'DepartureAirportId', oldValue: '999', newValue: '0' }
    ]

    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Статус: Неизвестный статус → не указано')
    expect(wrapper.text()).toContain('Аэропорт отправления: Неизвестный аэропорт → не указано')
    expect(wrapper.text()).not.toContain('999')
  })

  it('renders the Ozon weight update summary without empty old-value arrows', async () => {
    mockRefs.items.value[0].reason = 'Обновление веса посылок из файла реестра'
    mockRefs.items.value[0].changes = [
      { field: 'OzonWeightUpdateProcessedRows', oldValue: null, newValue: '12' },
      { field: 'OzonWeightUpdateUpdatedParcels', oldValue: null, newValue: '4' },
      { field: 'OzonWeightUpdateUnchangedParcels', oldValue: null, newValue: '5' },
      { field: 'OzonWeightUpdateSkippedRows', oldValue: null, newValue: '1' },
      { field: 'OzonWeightUpdateUnmatchedRows', oldValue: null, newValue: '2' },
      { field: 'OzonWeightUpdateSupersededRows', oldValue: null, newValue: '3' },
      { field: 'TotalWeightKg', oldValue: '10.5', newValue: '11.75' }
    ]

    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Обновление веса посылок из файла реестра')
    expect(text).toContain('Обработано строк файла: 12')
    expect(text).toContain('Обновлено посылок: 4')
    expect(text).toContain('Посылок без изменения веса: 5')
    expect(text).toContain('Пропущено строк: 1')
    expect(text).toContain('Строк без совпадений: 2')
    expect(text).toContain('Переопределено последующими строками: 3')
    expect(text).not.toContain('Обработано строк файла: не указано → 12')
    expect(text).toContain('Общий вес: 10.500 → 11.750')
  })
})
