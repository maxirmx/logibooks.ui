/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegistersList from '@/lists/Registers_List.vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { vuetifyStubs } from './helpers/test-utils.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const mockItems = ref([])
const mockCompanies = ref([])
const mockCountries = ref([])
const mockOps = ref({ customsProcedures: [], transportationTypes: [] })
const mockAirports = ref([])
const mockOrderStatuses = ref([])
const getAll = vi.fn()
const getCompaniesAll = vi.fn()
const getAirportsAll = vi.fn()

const registersStore = {
  getAll,
  remove: vi.fn(),
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
        isShiftLeadPlus: ref(true),
        isSrLogistPlus: ref(true),
        hasWhRole: ref(true)
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
    ensureLoaded: vi.fn().mockResolvedValue(),
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
    ensureLoaded: vi.fn().mockResolvedValue()
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
    ensureLoaded: vi.fn().mockResolvedValue(),
    getStatusTitle: vi.fn(id => id ? `Status ${id}` : 'Не указан')
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    clear: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    registers_per_page: ref(10),
    registers_search: ref(''),
    registers_sort_by: ref([{ key: 'id', order: 'asc' }]),
    registers_page: ref(1),
    isShiftLeadPlus: ref(true),
    isSrLogistPlus: ref(true),
    hasWhRole: ref(true)
  })
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => vi.fn()
}))

describe('Registers_List.vue in warehouse mode', () => {
  const createWrapper = () => {
    return mount(RegistersList, {
      props: {
        mode: OP_MODE_WAREHOUSE
      },
      global: {
        stubs: vuetifyStubs
      }
    })
  }

  beforeEach(async () => {
    mockItems.value = [{ id: 1 }]
    const router = (await import('@/router')).default
    router.push.mockClear()
  })

  it('uses warehouse labels and hides register actions', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('h1').text()).toBe('Партии')
    expect(wrapper.find('.v-text-field-stub span').text()).toBe('Поиск по любой информации о партии')
    expect(wrapper.findComponent(ActionButton2L).exists()).toBe(false)

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const hasEdit = actionButtons.some(button =>
      String(button.props('tooltipText') || '').includes('Редактировать')
    )
    const hasDelete = actionButtons.some(button =>
      String(button.props('tooltipText') || '').includes('Удалить')
    )

    expect(hasEdit).toBe(true)
    expect(hasDelete).toBe(false)

    const hasWarehouseTooltip = actionButtons.some(button =>
      String(button.props('tooltipText') || '').includes('в партии')
    )
    expect(hasWarehouseTooltip).toBe(true)
  })

  it('uses warehouse-specific table headers', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const headerKeys = wrapper.vm.headers.map(header => header.key)
    const headerTitles = wrapper.vm.headers.map(header => header.title)

    expect(headerKeys).toEqual([
      'actions',
      'dealNumber',
      'invoice',
      'countries',
      'senderRecipient',
      "statusId",
      "warehouseId",
      "warehouseArrivalDate"
    ])
    expect(headerTitles).toEqual([
      '',
      'Номер сделки',
      'ТСД',
      'Страны',
      'Отправитель/Получатель',
      'Статус',
      'Склад',
      'Дата прибытия'
    ])
  })

  it('uses warehouse-specific items-per-page text', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Access the component's computed property
    expect(wrapper.vm.registerNouns.genitivePluralCapitalized).toBe('Партий')
  })

  it('uses warehouse-specific loading text', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Access the component's computed property
    expect(wrapper.vm.registerNouns.genitiveSingular).toBe('партии')
  })

  it('uses warehouse-specific error messages', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    // Verify that the component uses warehouse-specific nouns by checking the computed property
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
      String(button.props('tooltipText') || '').includes('Посылки не в реестре')
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
