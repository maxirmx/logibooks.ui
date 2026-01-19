/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import WbrParcelsList from '@/lists/WbrParcels_List.vue'
import OzonParcelsList from '@/lists/OzonParcels_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const parcelsLoading = ref(false)
const parcelsItems = ref([])
const parcelsError = ref(null)
const parcelsTotal = ref(0)

const registersItem = ref({})
const proceduresRef = []
const parcelStatusesRef = []

const authStoreMock = {
  parcels_per_page: ref(10),
  parcels_sort_by: ref([{ key: 'id', order: 'asc' }]),
  parcels_page: ref(1),
  parcels_status: ref(null),
  parcels_check_status_sw: ref(null),
  parcels_check_status_fc: ref(null),
  parcels_tnved: ref(''),
  parcels_number: ref(''),
  selectedParcelId: ref(null),
  isSrLogistPlus: ref(false)
}

const createNoopStore = vi.hoisted(() => () => ({
  ensureLoaded: vi.fn().mockResolvedValue()
}))

const loadOrdersMock = vi.hoisted(() => vi.fn().mockResolvedValue())

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

vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  navigateToEditParcel: vi.fn(),
  validateParcelData: vi.fn(),
  approveParcelData: vi.fn(),
  getRowPropsForParcel: () => ({ class: '' }),
  filterGenericTemplateHeadersForParcel: () => [],
  exportParcelXmlData: vi.fn(),
  lookupFeacn: vi.fn(),
  getFeacnCodesForKeywords: vi.fn(),
  loadOrders: loadOrdersMock
}))

vi.mock('@/helpers/register.actions.js', () => ({
  useRegisterHeaderActions: () => ({
    validationState: ref({ show: false }),
    progressPercent: ref(0),
    actionDialog: ref({ show: false }),
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
  })
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    items: parcelsItems,
    loading: parcelsLoading,
    error: parcelsError,
    totalCount: parcelsTotal,
    getAll: vi.fn()
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    item: registersItem,
    getById: vi.fn().mockResolvedValue()
  })
}))

vi.mock('@/stores/customs.procedures.store.js', () => ({
  useCustomsProceduresStore: () => ({
    procedures: proceduresRef,
    ensureLoaded: vi.fn().mockResolvedValue(),
    getName: vi.fn()
  }),
  CustomsProcedureCodes: { Reimport: 12 }
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    parcelStatuses: parcelStatusesRef,
    ensureLoaded: vi.fn().mockResolvedValue(),
    getStatusTitle: vi.fn()
  })
}))

vi.mock('@/stores/key.words.store.js', () => ({ useKeyWordsStore: createNoopStore }))
vi.mock('@/stores/stop.words.store.js', () => ({ useStopWordsStore: createNoopStore }))
vi.mock('@/stores/feacn.orders.store.js', () => ({ useFeacnOrdersStore: createNoopStore }))
vi.mock('@/stores/countries.store.js', () => ({ useCountriesStore: createNoopStore }))
vi.mock('@/stores/transportation.types.store.js', () => ({
  useTransportationTypesStore: () => ({
    ensureLoaded: vi.fn().mockResolvedValue(),
    getDocument: vi.fn()
  })
}))
vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStoreMock
}))
vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: ref(null),
    error: vi.fn()
  })
}))

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

// Provide a minimal vue-router mock so components using `useRouter()`
// receive an injected router during mounting in tests.
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  }),
  createRouter: () => ({
    push: () => {},
    replace: () => {},
    beforeEach: () => {},
    afterEach: () => {}
  }),
  createWebHistory: () => ({})
}))

const textFieldStub = {
  name: 'v-text-field',
  template: '<div data-testid="v-text-field" :data-label="label"></div>',
  props: ['modelValue', 'label', 'disabled', 'density', 'style'],
  inheritAttrs: false
}

const baseMountOptions = {
  props: { registerId: 1 },
  global: {
    stubs: {
      ...defaultGlobalStubs,
      'v-text-field': textFieldStub
    }
  }
}

describe('Parcels list filters', () => {
  beforeEach(() => {
    parcelsLoading.value = false
    parcelsItems.value = []
    parcelsError.value = null
    parcelsTotal.value = 0
    authStoreMock.parcels_tnved.value = ''
    authStoreMock.parcels_number.value = ''
  })

  it('keeps WBR inputs enabled while loading to preserve focus', async () => {
    parcelsLoading.value = true

    const wrapper = mount(WbrParcelsList, baseMountOptions)
    await flushPromises()

    const tnvedField = wrapper.find('[data-label="ТН ВЭД"]')
    const numberField = wrapper.find('[data-label="Номер посылки"]')
    const textFields = wrapper.findAllComponents({ name: 'v-text-field' })
    const tnvedComponent = textFields.find((field) => field.props('label') === 'ТН ВЭД')
    const numberComponent = textFields.find((field) => field.props('label') === 'Номер посылки')

    expect(tnvedField.exists()).toBe(true)
    expect(numberField.exists()).toBe(true)

    expect(tnvedComponent?.props('disabled')).toBe(false)
    expect(numberComponent?.props('disabled')).toBe(false)
  })

  it('keeps Ozon inputs enabled while loading to preserve focus', async () => {
    parcelsLoading.value = true

    const wrapper = mount(OzonParcelsList, baseMountOptions)
    await flushPromises()

    const tnvedField = wrapper.find('[data-label="ТН ВЭД"]')
    const numberField = wrapper.find('[data-label="Номер посылки"]')
    const textFields = wrapper.findAllComponents({ name: 'v-text-field' })
    const tnvedComponent = textFields.find((field) => field.props('label') === 'ТН ВЭД')
    const numberComponent = textFields.find((field) => field.props('label') === 'Номер посылки')

    expect(tnvedField.exists()).toBe(true)
    expect(numberField.exists()).toBe(true)

    expect(tnvedComponent?.props('disabled')).toBe(false)
    expect(numberComponent?.props('disabled')).toBe(false)
  })
})
