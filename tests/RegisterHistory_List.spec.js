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
    loading: ref(false)
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
    loading: mockRefs.loading,
    getHistory: mocks.getHistory
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
  useAlertStore: () => ({ error: mocks.alertError })
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
    mocks.ensureStatuses.mockResolvedValue()
    mocks.ensureCountries.mockResolvedValue()
    mocks.getCompanies.mockResolvedValue()
    mocks.getAirports.mockResolvedValue()
    mocks.ensureWarehouses.mockResolvedValue()
    mocks.ensureOps.mockResolvedValue()
    mocks.getRegister.mockResolvedValue()
    mocks.getHistory.mockResolvedValue()
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
    expect(mocks.getHistory).toHaveBeenCalledWith(42, { page: 1, pageSize: 50 })
    expect(wrapper.text()).toContain('История изменений: Реестр DEAL-42 (Авианакладная INV-42)')
    expect(wrapper.text()).toContain('Иванов Иван')
    expect(wrapper.text()).toContain('Сохранение изменений')
    expect(wrapper.text()).toContain('Статус: Получен → На складе')
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
    expect(text).toContain('Склад: Склад Север → Склад Юг')
    expect(text).not.toContain('Контрагент: 11 → 5')
    expect(text).not.toContain(`Тип реестра: 1 → ${WBRN_REGISTER_ID}`)
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
})
