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

const mockItems = ref([])
const mockCompanies = ref([])
const mockCountries = ref([])
const mockTransportationTypes = ref([])
const mockCustomsProcedures = ref([])
const mockAirports = ref([])
const mockOrderStatuses = ref([])
const mockGlobalOpMode = ref('modeWarehouse')

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
  totalCount: ref(0)
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
        return { items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0) }
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
      if (store.types !== undefined) {
        return { types: mockTransportationTypes }
      }
      if (store.procedures !== undefined) {
        return { procedures: mockCustomsProcedures }
      }
      if (store.airports !== undefined) {
        return { airports: mockAirports }
      }
      if (store.alert !== undefined) {
        return { alert: store.alert }
      }
      if (store.globalOpMode !== undefined) {
        return { globalOpMode: store.globalOpMode }
      }
      return {
        registers_per_page: ref(10),
        registers_search: ref(''),
        registers_sort_by: ref([{ key: 'id', order: 'asc' }]),
        registers_page: ref(1),
        isShiftLeadPlus: ref(true),
        isSrLogistPlus: ref(true)
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

vi.mock('@/stores/transportation.types.store.js', () => ({
  useTransportationTypesStore: () => ({
    types: mockTransportationTypes,
    getAll: vi.fn(),
    ensureLoaded: vi.fn().mockResolvedValue(),
    getDocument: vi.fn(id => `Doc ${id}`)
  })
}))

vi.mock('@/stores/customs.procedures.store.js', () => ({
  useCustomsProceduresStore: () => ({
    procedures: mockCustomsProcedures,
    getAll: vi.fn(),
    ensureLoaded: vi.fn().mockResolvedValue(),
    getName: vi.fn(id => `Proc ${id}`)
  })
}))

vi.mock('@/stores/airports.store.js', () => ({
  useAirportsStore: () => ({
    airports: mockAirports,
    getAll: getAirportsAll
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
    isSrLogistPlus: ref(true)
  })
}))

vi.mock('@/stores/op.mode.store.js', () => ({
  useOpModeStore: () => ({
    globalOpMode: mockGlobalOpMode
  }),
  OP_MODE_PAPERWORK: 'modePaperwork',
  OP_MODE_WAREHOUSE: 'modeWarehouse'
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
      global: {
        stubs: vuetifyStubs
      }
    })
  }

  beforeEach(() => {
    mockGlobalOpMode.value = 'modeWarehouse'
    mockItems.value = [{ id: 1 }]
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

    expect(hasEdit).toBe(false)
    expect(hasDelete).toBe(false)

    const hasWarehouseTooltip = actionButtons.some(button =>
      String(button.props('tooltipText') || '').includes('в партии')
    )
    expect(hasWarehouseTooltip).toBe(true)
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

    expect(bulkStatusButton).toBeDefined()
    expect(bulkStatusButton.props('tooltipText')).toContain('в партии')
  })
})
