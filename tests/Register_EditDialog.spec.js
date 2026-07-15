/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import RegisterEditDialog from '@/dialogs/Register_EditDialog.vue'
import { defaultGlobalStubs, createMockStore } from './helpers/test-utils.js'
import router from '@/router'
import { resolveAll } from './helpers/test-utils'
import { WBR_COMPANY_ID, WBR2_REGISTER_ID, WBRN_REGISTER_ID, GTC_COMPANY_ID, OZON_COMPANY_ID } from '@/helpers/company.constants.js'
import { formatDate } from '@/helpers/date.formatters.js'
import { CUSTOMS_PROCEDURE_RETURN } from '@/helpers/customs.procedure.helpers.js'

// No need to mock vuetify-use-dialog anymore since we use custom ErrorDialog
const CUSTOMS_PROCEDURE_EXPORT = 10
const CUSTOMS_PROCEDURE_IMPORT = 40
const CUSTOMS_PROCEDURE_GTC_IMPORT = 3

const baseRegisterItem = {
  id: 1,
  fileName: 'r.csv',
  companyId: 2,
  registerType: 2,
  dealNumber: 'D1',
  customsProcedureCode: CUSTOMS_PROCEDURE_IMPORT,
  transportationTypeCode: 1,
  theOtherCompanyId: null,
  theOtherCountryCode: null,
  departureAirportId: 0,
  arrivalAirportId: 0,
  warehouseId: 0,
  date: '2024-01-01',
  lookupByArticle: false
}
const mockItem = ref({ ...baseRegisterItem })
const getById = vi.fn(() => Promise.resolve())
const update = vi.fn(() => Promise.resolve())
const upload = vi.fn(() => Promise.resolve())
const getAll = vi.fn(() => Promise.resolve())
const registerItems = ref([])

const mockOps = ref({
  customsProcedures: [
    { value: CUSTOMS_PROCEDURE_RETURN, charCode: '01', name: 'Возврат', isExport: false, isGtc: false },
    { value: CUSTOMS_PROCEDURE_EXPORT, charCode: 'ЭК10', name: 'Экспорт', isExport: true, isGtc: false },
    { value: CUSTOMS_PROCEDURE_IMPORT, charCode: 'ИМ40', name: 'Импорт', isExport: false, isGtc: false },
    { value: CUSTOMS_PROCEDURE_GTC_IMPORT, charCode: 'ГТК1', name: 'ГТК Импорт', isExport: false, isGtc: true }
  ],
  transportationTypes: [
    { value: 1, name: 'Авто', document: 'CMR', isAvia: false },
    { value: 0, name: 'Авиа', document: 'AWB', isAvia: true }
  ],
  initialRegisterStatusId: 1
})

const registersStore = createMockStore({
  item: mockItem,
  items: registerItems,
  getById,
  getAll,
  update,
  upload,
  uploadFile: ref(null),
  ops: mockOps,
  ensureOpsLoaded: vi.fn(() => Promise.resolve()),
  getTransportationDocument: vi.fn((id) => {
    const type = mockOps.value.transportationTypes.find(t => t.value === id)
    return type ? type.document : `[Тип ${id}]`
  }),
  isExportProcedure: vi.fn((id) => {
    const proc = mockOps.value.customsProcedures.find(p => p.value === id)
    return proc?.charCode === 'ЭК10'
  })
})
const countriesStore = createMockStore({
  countries: ref([
    { id: 1, isoNumeric: 840, nameRuOfficial: 'США' },
    { id: 2, isoNumeric: 643, nameRuOfficial: 'Россия' },
    { id: 3, isoNumeric: 860, nameRuOfficial: 'Узбекистан' }
  ]),
  ensureLoaded: vi.fn()
})
const companiesStore = createMockStore({
  companies: ref([
    { id: OZON_COMPANY_ID, shortName: 'Ozon' },
    { id: 2, shortName: 'My Company' },
    { id: 3, shortName: 'Partner' },
    { id: GTC_COMPANY_ID, shortName: 'GTC' }
  ]),
  getAll: vi.fn(() => Promise.resolve())
})
const baseAirports = [
  { id: 1, name: 'Шереметьево', codeIata: 'SVO' },
  { id: 2, name: 'Домодедово', codeIata: 'DME' }
]
const airportsStore = createMockStore({
  airports: ref([...baseAirports]),
  getAll: vi.fn(() => Promise.resolve())
})
const warehousesStore = createMockStore({
  warehouses: ref([
    { id: 10, name: 'Main Warehouse' },
    { id: 11, name: 'Secondary Warehouse' }
  ]),
  getAll: vi.fn(() => Promise.resolve()),
  ensureLoaded: vi.fn(() => Promise.resolve())
})
const registerStatusesStore = createMockStore({
  registerStatuses: [
    { id: 1, title: 'New', icon: 'svg:registered', bkColor: '#FFFFFF', fgColor: '#000000' },
    { id: 2, title: 'In Progress', icon: 'svg:in-transit', bkColor: '#FFEEDD', fgColor: '#111111' },
    { id: 3, title: 'Completed', icon: 'svg:very-delivered', bkColor: '#00AA00', fgColor: '#FFFFFF' }
  ],
  ensureLoaded: vi.fn(() => Promise.resolve()),
  getStatusById: vi.fn(id => registerStatusesStore.registerStatuses.find(status => status.id === id) || null),
  getStatusTitle: vi.fn(id => id ? `Status ${id}` : 'Unknown')
})
const mockIsAdmin = ref(true)
const mockIsShiftLead = ref(false)
const authStore = {
  isAdmin: mockIsAdmin,
  isShiftLead: mockIsShiftLead
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store === registersStore) {
        return {
          item: mockItem,
          uploadFile: registersStore.uploadFile,
          items: registersStore.items,
          ops: mockOps
        }
      }
      if (store === countriesStore) return { countries: countriesStore.countries }
      if (store === companiesStore) return { companies: companiesStore.companies }
      if (store === airportsStore) return { airports: airportsStore.airports }
      if (store === warehousesStore) return { warehouses: warehousesStore.warehouses }
      return {}
    }
  }
})

vi.mock('@/stores/registers.store.js', () => ({ 
  useRegistersStore: () => registersStore
}))
vi.mock('@/stores/countries.store.js', () => ({ useCountriesStore: () => countriesStore }))
vi.mock('@/stores/companies.store.js', () => ({ useCompaniesStore: () => companiesStore }))
vi.mock('@/stores/airports.store.js', () => ({ useAirportsStore: () => airportsStore }))
vi.mock('@/stores/warehouses.store.js', () => ({ useWarehousesStore: () => warehousesStore }))
vi.mock('@/stores/register.statuses.store.js', () => ({ useRegisterStatusesStore: () => registerStatusesStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authStore }))
vi.mock('@/router', () => ({ default: { push: vi.fn(() => Promise.resolve()) } }))

// Simple stubs for vee-validate components
const FormStub = {
  name: 'Form',
  template: '<form><slot :errors="{}" :isSubmitting="false" :values="{}" :setFieldValue="mockSetFieldValue" /></form>',
  setup() {
    const mockSetFieldValue = () => {
      // Mock implementation for tests
    }
    return { mockSetFieldValue }
  }
}

const realWeightErrorMessage = 'Фактический вес к оформлению должен быть больше 0'
const FormWithRealWeightErrorStub = {
  name: 'Form',
  template: '<form><slot :errors="{ realWeightKg: realWeightErrorMessage }" :isSubmitting="false" :values="{}" :setFieldValue="mockSetFieldValue" :handleSubmit="mockHandleSubmit" /></form>',
  setup() {
    return {
      realWeightErrorMessage,
      mockSetFieldValue: () => {},
      mockHandleSubmit: (submit) => submit
    }
  }
}
// Shared value map so multiple Field instances with same name stay in sync (checkbox + slot consumer)
const __fieldValueMap = {}
const FieldStub = {
  name: 'Field',
  props: ['name', 'id', 'type', 'as', 'readonly', 'disabled', 'value'],
  setup(props, { slots }) {
    const key = props.name || '__anon__'
    if (!__fieldValueMap[key]) {
      __fieldValueMap[key] = ref(props.type === 'checkbox' ? false : '')
    }
    const val = __fieldValueMap[key]

    function handleInput(e) {
      if (props.type === 'checkbox') {
        val.value = e.target.checked
      } else {
        val.value = e.target.value
      }
    }

    function handleChange(valueOrEvent) {
      if (valueOrEvent?.target) {
        handleInput(valueOrEvent)
      } else {
        val.value = valueOrEvent
      }
    }

    return { val, handleInput, handleChange, slots, props }
  },
  template: `
    <div>
      <template v-if="as === 'select'">
        <select :id="id || name" :disabled="disabled" @change="handleInput" :class="$attrs.class">
          <slot />
        </select>
      </template>
      <template v-else-if="$slots.default">
        <!-- Custom root provided (e.g. v-slot pattern); just expose value -->
        <slot
          :value="val.value"
          :field="{ value: val.value, name: props.name, id: props.id }"
          :handleChange="handleChange"
        />
      </template>
      <template v-else>
        <input v-if="type === 'checkbox'" type="checkbox" :id="id || name" :checked="val.value" :readonly="readonly" :disabled="disabled" :class="$attrs.class" @change="handleInput" />
        <input v-else :id="id || name" :type="type || 'text'" :value="val.value" :readonly="readonly" :disabled="disabled" :class="$attrs.class" @input="handleInput" />
      </template>
    </div>
  `
}

// Stub for ErrorDialog that immediately closes when shown to avoid blocking tests
const ErrorDialogStub = {
  name: 'ErrorDialog',
  props: ['show', 'title', 'message'],
  template: '<div />',
  watch: {
    show(newVal) {
      if (newVal) {
        this.$emit('close')
      }
    }
  },
  mounted() {
    if (this.show) this.$emit('close')
  }
}

function getGroupByLabel(wrapper, text) {
  return wrapper
    .findAll('.form-group')
    .find((g) => g.find('label').text().includes(text))
}

function getReportValue(wrapper, label) {
  const field = wrapper
    .findAll('.load-report-field')
    .find((g) => g.find('.label').text().includes(label))
  return field?.find('.load-report-value').text()
}

function getWeightValue(wrapper, label) {
  const field = wrapper
    .findAll('.weight-field')
    .find((g) => g.find('.label').text().includes(label))
  return field?.find('.weight-value').text()
}

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('Register_EditDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Object.keys(__fieldValueMap).forEach((key) => delete __fieldValueMap[key])
    // Create a fresh copy of baseRegisterItem to avoid reference issues
    mockItem.value = JSON.parse(JSON.stringify(baseRegisterItem))
    mockIsAdmin.value = true
    mockIsShiftLead.value = false
    registerItems.value = []
    airportsStore.airports.value = [...baseAirports]
    warehousesStore.warehouses.value = [
      { id: 10, name: 'Main Warehouse' },
      { id: 11, name: 'Secondary Warehouse' }
    ]
    mockOps.value = {
      customsProcedures: [
        { value: CUSTOMS_PROCEDURE_RETURN, charCode: '01', name: 'Возврат', isExport: false, isGtc: false },
        { value: CUSTOMS_PROCEDURE_EXPORT, charCode: 'ЭК10', name: 'Экспорт', isExport: true, isGtc: false },
        { value: CUSTOMS_PROCEDURE_IMPORT, charCode: 'ИМ40', name: 'Импорт', isExport: false, isGtc: false },
        { value: CUSTOMS_PROCEDURE_GTC_IMPORT, charCode: 'ГТК1', name: 'ГТК Импорт', isExport: false, isGtc: true }
      ],
      transportationTypes: [
        { value: 1, name: 'Авто', document: 'CMR', isAvia: false },
        { value: 0, name: 'Авиа', document: 'AWB', isAvia: true }
      ],
      initialRegisterStatusId: 1
    }
  })

  it('loads data and renders fields', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()
    expect(getById).toHaveBeenCalledWith(1)
    expect(countriesStore.ensureLoaded).toHaveBeenCalled()
    expect(registersStore.ensureOpsLoaded).toHaveBeenCalled()
    expect(airportsStore.getAll).toHaveBeenCalled()
    expect(warehousesStore.ensureLoaded).toHaveBeenCalled()
    expect(wrapper.find('#invoiceNumber').exists()).toBe(true)
    expect(wrapper.find('#customsProcedureCode').exists()).toBe(true)
    const departureSelect = wrapper.find('select#departureAirportId')
    expect(departureSelect.exists()).toBe(true)
    expect(departureSelect.element.disabled).toBe(true)
    const optionTexts = departureSelect.findAll('option').map((option) => option.text())
    expect(optionTexts).toContain('Не выбрано')
    expect(optionTexts).toContain('Шереметьево (SVO)')
    const arrivalSelect = wrapper.find('select#arrivalAirportId')
    expect(arrivalSelect.exists()).toBe(true)
    expect(wrapper.find('#warehouseId').exists()).toBe(true)
  })

  it('renders register status icons in the status selector', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      statusId: 2
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub,
          'v-select': {
            props: ['modelValue', 'items'],
            template: `
              <div id="statusId" data-testid="register-status-select">
                <slot
                  name="selection"
                  :item="{ raw: modelValue == null ? modelValue : String(modelValue) }"
                />
                <div v-for="option in items" :key="option.id" data-testid="register-status-option">
                  <slot name="item" :props="{}" :item="{ raw: String(option.id) }" />
                </div>
              </div>
            `
          }
        }
      }
    })
    await resolveAll()

    expect(wrapper.find('[data-testid="register-status-select"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('In Progress')
    expect(wrapper.text()).toContain('Completed')
    const statusIcons = wrapper.findAll('[data-testid="register-status-icon"]')
    expect(statusIcons).toHaveLength(4)
    expect(statusIcons[0].attributes('data-icon')).toBe('svg:in-transit')
    expect(statusIcons[0].attributes('data-icon-kind')).toBe('svg')
    expect(statusIcons[0].element.style.backgroundColor).toBe('rgb(255, 238, 221)')
    expect(statusIcons[0].element.style.color).toBe('rgb(17, 17, 17)')
    expect(statusIcons.slice(1).map(icon => icon.attributes('data-icon'))).toEqual([
      'svg:registered',
      'svg:in-transit',
      'svg:very-delivered'
    ])
  })

  it('enables airport selectors when aviation transport is selected', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeCode: 0,
      departureAirportId: 1,
      arrivalAirportId: 2
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const departureSelect = wrapper.find('select#departureAirportId')
    const arrivalSelect = wrapper.find('select#arrivalAirportId')
    expect(departureSelect.element.disabled).toBe(false)
    expect(arrivalSelect.element.disabled).toBe(false)
  })

  it('keeps transportation type set to 0 when ops load later', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeCode: 0
    }
    mockOps.value = {
      customsProcedures: [],
      transportationTypes: []
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    mockOps.value = {
      customsProcedures: [
        { value: CUSTOMS_PROCEDURE_RETURN, charCode: '01', name: 'Возврат', isRe: false, isExport: false, isGtc: false },
        { value: CUSTOMS_PROCEDURE_EXPORT, charCode: 'ЭК10', name: 'Экспорт', isRe: false, isExport: true, isGtc: false },
        { value: CUSTOMS_PROCEDURE_IMPORT, charCode: 'ИМ40', name: 'Импорт', isRe: true, isExport: false, isGtc: false },
        { value: CUSTOMS_PROCEDURE_GTC_IMPORT, charCode: 'ГТК1', name: 'ГТК Импорт', isGtc: true }
      ],
      transportationTypes: [
        { value: 1, name: 'Авто', document: 'CMR', isAvia: false },
        { value: 0, name: 'Авиа', document: 'AWB', isAvia: true }
      ]
    }

    await nextTick()

    expect(mockItem.value.transportationTypeCode).toBe(0)
  })

  it('renders warehouse selector for WBR2 register type', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: WBR2_REGISTER_ID
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    expect(warehousesStore.ensureLoaded).toHaveBeenCalled()
    const warehouseSelect = wrapper.find('select#warehouseId')
    expect(warehouseSelect.exists()).toBe(true)
    const optionTexts = warehouseSelect.findAll('option').map((option) => option.text())
    expect(optionTexts).toContain('Не задано')
    expect(optionTexts).toContain('Main Warehouse')
  })

  it('renders warehouse selector for WBRN register type', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: WBRN_REGISTER_ID
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    expect(warehousesStore.ensureLoaded).toHaveBeenCalled()
    const warehouseSelect = wrapper.find('select#warehouseId')
    expect(warehouseSelect.exists()).toBe(true)
  })

  it('renders warehouse selector for WBR register type', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: WBR_COMPANY_ID
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    expect(warehousesStore.ensureLoaded).toHaveBeenCalled()
    const warehouseSelect = wrapper.find('select#warehouseId')
    expect(warehouseSelect.exists()).toBe(true)
    const optionTexts = warehouseSelect.findAll('option').map((option) => option.text())
    expect(optionTexts).toContain('Не задано')
    expect(optionTexts).toContain('Main Warehouse')
  })

  it('formats upload and warehouse arrival dates like Registers_List', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: WBR_COMPANY_ID,
      date: '2024-01-01T23:30:00Z',
      warehouseArrivalDate: '2024-02-03T23:30:00Z'
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)

    expect(wrapper.find('#uploadDate').text()).toBe(formatDate(mockItem.value.date))
    expect(wrapper.find('#warehouseArrivalDate').attributes('type')).toBe('date')
    expect(wrapper.find('#warehouseArrivalDate').element.value).toBe(
      dialog.vm.formatDateInputValue(mockItem.value.warehouseArrivalDate)
    )
  })

  it('formats warehouse arrival value for native date selector', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: WBR_COMPANY_ID,
      warehouseArrivalDate: '2024-02-03T23:30:00Z'
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)

    expect(dialog.vm.formatDateInputValue('2024-02-04')).toBe('2024-02-04')
    expect(dialog.vm.formatDateInputValue('not-a-date')).toBe('')
  })

  it('renders warehouse selector for OZON register type', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: OZON_COMPANY_ID
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    expect(warehousesStore.ensureLoaded).toHaveBeenCalled()
    const warehouseSelect = wrapper.find('select#warehouseId')
    expect(warehouseSelect.exists()).toBe(true)
    const optionTexts = warehouseSelect.findAll('option').map((option) => option.text())
    expect(optionTexts).toContain('Не задано')
    expect(optionTexts).toContain('Main Warehouse')
  })

  it('switches recipient field on customs procedure change', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    let recipientGroup = getGroupByLabel(wrapper, 'Получатель')
    expect(recipientGroup.find('.readonly-field').exists()).toBe(true)

    const procSelect = wrapper.find('#customsProcedureCode')
    await procSelect.setValue(String(CUSTOMS_PROCEDURE_EXPORT))
    await procSelect.trigger('change')
    await nextTick()

    recipientGroup = getGroupByLabel(wrapper, 'Получатель')
    expect(recipientGroup.find('select#theOtherCompanyId').exists()).toBe(true)
  })

  it('normalizes empty customs procedure to the first available procedure and boolean flags', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    dialog.vm.handleProcedureChange({ target: { value: '' } })
    await nextTick()

    expect(dialog.vm.item.customsProcedureCode).toBe(CUSTOMS_PROCEDURE_EXPORT)
    expect(dialog.vm.isExport).toBe(true)
    expect(dialog.vm.isRe).toBe(false)
  })

  it('dynamically enables/disables airport selectors when transportation type changes', async () => {
    // Start with non-aviation transport (disabled airports)
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeCode: 1, // Non-aviation transport
      departureAirportId: 0,
      arrivalAirportId: 0
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    // Initially, airport selectors should be disabled for non-aviation transport
    let departureSelect = wrapper.find('select#departureAirportId')
    let arrivalSelect = wrapper.find('select#arrivalAirportId')
    expect(departureSelect.element.disabled).toBe(true)
    expect(arrivalSelect.element.disabled).toBe(true)

    // Change to aviation transport type (value: 0)
    const transportSelect = wrapper.find('#transportationTypeCode')
    await transportSelect.setValue('0')
    await transportSelect.trigger('change')
    await nextTick()

    // Airport selectors should now be enabled
    departureSelect = wrapper.find('select#departureAirportId')
    arrivalSelect = wrapper.find('select#arrivalAirportId')
    expect(departureSelect.element.disabled).toBe(false)
    expect(arrivalSelect.element.disabled).toBe(false)

    // Set some airport values while aviation transport is selected
    const dialog = wrapper.findComponent(RegisterEditDialog)
    dialog.vm.item.departureAirportId = 5
    dialog.vm.item.arrivalAirportId = 10
    await nextTick()

    // Change back to non-aviation transport
    await transportSelect.setValue('1')
    await transportSelect.trigger('change')
    await nextTick()

    // Airport selectors should be disabled again
    departureSelect = wrapper.find('select#departureAirportId')
    arrivalSelect = wrapper.find('select#arrivalAirportId')
    expect(departureSelect.element.disabled).toBe(true)
    expect(arrivalSelect.element.disabled).toBe(true)

    // Airport values should be preserved in item.value (not cleared)
    expect(dialog.vm.item.departureAirportId).toBe(5)
    expect(dialog.vm.item.arrivalAirportId).toBe(10)
  })

  it('submits airport ids when aviation transport is chosen', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeCode: 0,
      departureAirportId: 1,
      arrivalAirportId: 2
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit(
      {
        transportationTypeCode: '0',
        departureAirportId: '1',
        arrivalAirportId: '2'
      },
      { setErrors: vi.fn() }
    )
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      transportationTypeCode: 0,
      departureAirportId: 1,
      arrivalAirportId: 2
    }))
  })

  it('submits warehouseId for WBR2 register type', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: WBR2_REGISTER_ID,
      warehouseId: 11
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit(
      {
        warehouseId: '11'
      },
      { setErrors: vi.fn() }
    )
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      warehouseId: 11
    }))
  })

  it('returns to registers list with warehouse mode when mode prop is warehouse', async () => {
    mockItem.value = { ...baseRegisterItem }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" mode="modeWarehouse" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({}, { setErrors: vi.fn() })
    await resolveAll()

    expect(router.push).toHaveBeenCalledWith('/registers?mode=modeWarehouse')
  })

  it('uses warehouse-specific nouns for titles when mode is warehouse', async () => {
    mockItem.value = { ...baseRegisterItem }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" mode="modeWarehouse" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    // Warehouse mode uses "партии" instead of "реестре"
    expect(wrapper.find('h1').text()).toBe('Редактирование информации о партии')
  })

  it('uses paperwork-specific nouns for titles when mode is paperwork', async () => {
    mockItem.value = { ...baseRegisterItem }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" mode="modePaperwork" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    // Paperwork mode uses "реестре"
    expect(wrapper.find('h1').text()).toBe('Редактирование информации о реестре')
  })

  it('validates invoice number format only for aviation transport', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeCode: 0
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }

    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })

    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)

    await expect(
      dialog.vm.schema.validate({ transportationTypeCode: 0, invoiceNumber: '123-12345678', theOtherCountryCode: 840 })
    ).resolves.toBeDefined()

    await expect(
      dialog.vm.schema.validate({ transportationTypeCode: 0, invoiceNumber: '12-ABC', theOtherCountryCode: 840 })
    ).rejects.toThrow('Номер накладной для авиаперевозки должен быть в формате <три цифры>-<восемь цифр>')

    await expect(
      dialog.vm.schema.validate({ transportationTypeCode: 1, invoiceNumber: 'INVALID-FORMAT', theOtherCountryCode: 840 })
    ).resolves.toBeDefined()
  })

  it('validates that theOtherCountryCode is mandatory', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }

    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })

    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)

    // Should fail validation when theOtherCountryCode is null/missing
    await expect(
      dialog.vm.schema.validate({ theOtherCountryCode: null })
    ).rejects.toThrow('Необходимо выбрать страну')

    await expect(
      dialog.vm.schema.validate({ theOtherCountryCode: undefined })
    ).rejects.toThrow('Необходимо выбрать страну')

    // Should pass validation when theOtherCountryCode is provided
    await expect(
      dialog.vm.schema.validate({ theOtherCountryCode: 840 })
    ).resolves.toBeDefined()

    await expect(
      dialog.vm.schema.validate({ theOtherCountryCode: 643 })
    ).resolves.toBeDefined()
  })

  it('handles create mode with upload', async () => {
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockItem.value = { ...baseRegisterItem, fileName: 'test.xlsx', companyId: 2 }
    registerItems.value = []

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    expect(getById).not.toHaveBeenCalled()
    expect(getAll).not.toHaveBeenCalled()
    expect(wrapper.find('h1').text()).toBe('Загрузка реестра')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Загрузить')

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({}, { setErrors: () => {} })
    await resolveAll()
    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, mockItem.value.customsProcedureCode, true, false)
    expect(router.push).toHaveBeenCalledWith('/registers?mode=modePaperwork')
  })

  it('renders checkForDuplicates checkbox only in create mode', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const checkbox = wrapper.find('#checkForDuplicates')
    expect(checkbox.exists()).toBe(true)
    expect(wrapper.text()).toContain('Проверить на дубликаты')
  })

  it('does not render checkForDuplicates checkbox in edit mode before procedure changes', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    expect(wrapper.find('#checkForDuplicates').exists()).toBe(false)
  })

  it('hides Return procedure in create mode', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const optionTexts = wrapper
      .find('#customsProcedureCode')
      .findAll('option')
      .filter((option) => option.attributes('value') !== '')
      .map((option) => option.text())
    expect(optionTexts).not.toContain('Возврат')
  })

  it('hides Return procedure in edit mode without warehouse', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      warehouseId: 0
    }
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const optionTexts = wrapper
      .find('#customsProcedureCode')
      .findAll('option')
      .filter((option) => option.attributes('value') !== '')
      .map((option) => option.text())
    expect(optionTexts).not.toContain('Возврат')
  })

  it('offers Return procedure in edit mode with warehouse', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      warehouseId: 10
    }
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const optionTexts = wrapper
      .find('#customsProcedureCode')
      .findAll('option')
      .filter((option) => option.attributes('value') !== '')
      .map((option) => option.text())
    expect(optionTexts).toContain('Возврат')
  })

  it('does not offer empty warehouse while Return procedure is selected', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      customsProcedureCode: CUSTOMS_PROCEDURE_RETURN,
      warehouseId: 10
    }
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const optionTexts = wrapper
      .find('#warehouseId')
      .findAll('option')
      .map((option) => option.text())
    expect(optionTexts).not.toContain('Не задано')
    expect(optionTexts).toContain('Main Warehouse')
  })

  it('shows checked duplicate option and submits flag after changing to non-Return procedure', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      customsProcedureCode: CUSTOMS_PROCEDURE_IMPORT
    }
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(wrapper.find('#checkForDuplicates').exists()).toBe(false)

    dialog.vm.handleProcedureChange({ target: { value: String(CUSTOMS_PROCEDURE_EXPORT) } }, vi.fn())
    await nextTick()

    expect(wrapper.find('#checkForDuplicates').exists()).toBe(true)
    expect(dialog.vm.item.checkForDuplicates).toBe(true)

    update.mockClear()
    await dialog.vm.onSubmit(
      { customsProcedureCode: String(CUSTOMS_PROCEDURE_EXPORT) },
      { setErrors: vi.fn() }
    )
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      customsProcedureCode: CUSTOMS_PROCEDURE_EXPORT,
      checkForDuplicates: true
    }))
  })

  it('renders weight section only in edit mode with approved fields', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      totalWeightKg: 12.345,
      totalWeightKgToRelease: 10,
      realWeightKg: 5.5
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    expect(wrapper.find('[data-testid="register-deal-section-title"]').text()).toBe('Сделка')
    expect(wrapper.find('[data-testid="register-weight-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="register-weight-section"] .section-title').text()).toBe('Вес')
    expect(wrapper.findAll('.weight-field .label').map((label) => label.text())).toEqual([
      'Общий вес, кг:',
      'К оформлению, кг:',
      'Фактический к оформлению:',
      'Поправочный коэффициент:'
    ])
    expect(getWeightValue(wrapper, 'Общий вес, кг')).toBe('12.345')
    expect(getWeightValue(wrapper, 'К оформлению, кг')).toBe('10.000')
    expect(getWeightValue(wrapper, 'Поправочный коэффициент')).toBe('0.550')

    const realWeightInput = wrapper.find('#realWeightKg')
    expect(realWeightInput.exists()).toBe(true)
    expect(realWeightInput.attributes('type')).toBe('text')
    expect(realWeightInput.attributes('inputmode')).toBe('decimal')
    expect(realWeightInput.attributes('min')).toBeUndefined()
    expect(realWeightInput.attributes('step')).toBeUndefined()
    expect(realWeightInput.element.value).toBe('5.5')
  })

  it('does not render weight section in create mode', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    expect(wrapper.find('[data-testid="register-deal-section-title"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="register-weight-section"]').exists()).toBe(false)
  })

  it('places weight section before load report section', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      totalWeightKg: 12,
      totalWeightKgToRelease: 10,
      loadReport: {
        createdAt: '2026-06-10T12:30:15+03:00',
        processed: 10
      }
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const weightSection = wrapper.find('[data-testid="register-weight-section"]').element
    const loadReportSection = wrapper.find('[data-testid="register-load-report"]').element

    expect(Boolean(weightSection.compareDocumentPosition(loadReportSection) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it('submits numeric real weight in edit mode', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({ realWeightKg: '12.5' }, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      realWeightKg: 12.5
    }))
  })

  it('submits zero real weight when field is blank', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    const validatedValues = await dialog.vm.schema.validate({ realWeightKg: '', theOtherCountryCode: 840 })
    expect(validatedValues.realWeightKg).toBeNull()

    await dialog.vm.onSubmit(validatedValues, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      realWeightKg: 0
    }))
  })

  it('submits zero real weight when field is absent', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({}, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      realWeightKg: 0
    }))
  })

  it('submits zero real weight when field contains only whitespace', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await expect(
      dialog.vm.schema.validate({ realWeightKg: '   \t\n', theOtherCountryCode: 840 })
    ).resolves.toBeTruthy()

    await dialog.vm.onSubmit({ realWeightKg: '   \t\n' }, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      realWeightKg: 0
    }))
  })

  it('shows validation error for negative real weight', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormWithRealWeightErrorStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await expect(
      dialog.vm.schema.validate({ realWeightKg: -1, theOtherCountryCode: 840 })
    ).rejects.toThrow(realWeightErrorMessage)

    expect(wrapper.find('#realWeightKg').classes()).toContain('is-invalid')
    expect(wrapper.find('.alert-danger').text()).toContain(realWeightErrorMessage)
  })

  it('formats correction coefficient for empty zero and zero divisor cases', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      totalWeightKgToRelease: 0,
      realWeightKg: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)

    expect(getWeightValue(wrapper, 'Поправочный коэффициент')).toBe('1')
    expect(dialog.vm.formatCorrectionCoefficient(0)).toBe('1')
    expect(dialog.vm.formatCorrectionCoefficient(10)).toBe('—')
  })

  it('does not render load report controls when register has no load report', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    expect(wrapper.find('[data-testid="register-load-report"]').exists()).toBe(false)
    const reportButtons = wrapper
      .findAllComponents({ name: 'ActionButton' })
      .filter((button) => ['fa-solid fa-angles-down', 'fa-solid fa-angles-up'].includes(button.props('icon')))
    expect(reportButtons).toHaveLength(0)
  })

  it('renders load report collapsed by default and expands with approved labels', async () => {
    const createdAt = '2026-06-10T12:30:15+03:00'
    mockItem.value = {
      ...baseRegisterItem,
      loadReport: {
        createdAt,
        processed: 10,
        failed: -1,
        markedByPartner: 2,
        markedForExcise: 3,
        duplicates: 4,
        duplicate2ColorRejections: 5,
        markedForNotifications: 6,
        updated: 7
      }
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    expect(wrapper.find('[data-testid="register-load-report"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Отчёт о загрузке файла реестра')
    expect(wrapper.find('#register-load-report-body').exists()).toBe(false)

    let toggle = wrapper
      .findAllComponents({ name: 'ActionButton' })
      .find((button) => button.props('icon') === 'fa-solid fa-angles-down')
    expect(toggle).toBeTruthy()
    expect(toggle.props('tooltipText')).toBe('Показать отчет загрузки')

    await wrapper.find('[data-testid="register-load-report-toggle"]').trigger('click')
    await nextTick()

    expect(wrapper.find('#register-load-report-body').exists()).toBe(true)
    expect(wrapper.find('#register-load-report-body').classes()).toContain('form-row')
    expect(wrapper.findAll('.load-report-field .label').map((label) => label.text())).toEqual([
      'Обработано строк:',
      'Ошибочных строк:',
      'Исключено партнёром:',
      'Согласовано с акцизом:',
      'Согласовано с нотификацией:',
      'Дубликатов:',
      'С предшествующими:',
      'Время загрузки:'
    ])
    toggle = wrapper
      .findAllComponents({ name: 'ActionButton' })
      .find((button) => button.props('icon') === 'fa-solid fa-angles-up')
    expect(toggle).toBeTruthy()
    expect(toggle.props('tooltipText')).toBe('Скрыть отчет загрузки')

    expect(getReportValue(wrapper, 'Время загрузки')).toBe(new Date(createdAt).toLocaleTimeString('ru-RU'))
    expect(getReportValue(wrapper, 'Обработано строк')).toBe('10')
    expect(getReportValue(wrapper, 'Ошибочных строк')).toBe('—')
    expect(getReportValue(wrapper, 'Исключено партнёром')).toBe('2')
    expect(getReportValue(wrapper, 'Согласовано с акцизом')).toBe('3')
    expect(getReportValue(wrapper, 'Дубликатов')).toBe('4 (5)')
    expect(getReportValue(wrapper, 'Согласовано с нотификацией')).toBe('6')
    expect(getReportValue(wrapper, 'С предшествующими')).toBe('7')
    expect(wrapper.text()).not.toContain('Таблица с номерами колонок')
    expect(wrapper.text()).not.toContain('Неподтверждённых дубликатов')
    expect(wrapper.text()).not.toContain('Режим обновления')
    expect(wrapper.text()).not.toContain('Обновлено посылок')

    await wrapper.find('[data-testid="register-load-report-toggle"]').trigger('click')
    await nextTick()

    expect(wrapper.find('#register-load-report-body').exists()).toBe(false)
    toggle = wrapper
      .findAllComponents({ name: 'ActionButton' })
      .find((button) => button.props('icon') === 'fa-solid fa-angles-down')
    expect(toggle).toBeTruthy()
  })

  it('does not render load report controls for users without administrator or shift lead role', async () => {
    mockIsAdmin.value = false
    mockIsShiftLead.value = false
    mockItem.value = {
      ...baseRegisterItem,
      loadReport: {
        createdAt: '2026-06-10T12:30:15+03:00',
        processed: 10
      }
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    expect(wrapper.find('[data-testid="register-load-report"]').exists()).toBe(false)
    const reportButtons = wrapper
      .findAllComponents({ name: 'ActionButton' })
      .filter((button) => ['fa-solid fa-angles-down', 'fa-solid fa-angles-up'].includes(button.props('icon')))
    expect(reportButtons).toHaveLength(0)
  })

  it('renders load report controls for shift lead users', async () => {
    mockIsAdmin.value = false
    mockIsShiftLead.value = true
    mockItem.value = {
      ...baseRegisterItem,
      loadReport: {
        createdAt: '2026-06-10T12:30:15+03:00',
        processed: 10,
        duplicates: 4,
        duplicate2ColorRejections: 0
      }
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    expect(wrapper.find('[data-testid="register-load-report"]').exists()).toBe(true)
    const toggle = wrapper
      .findAllComponents({ name: 'ActionButton' })
      .find((button) => button.props('icon') === 'fa-solid fa-angles-down')
    expect(toggle).toBeTruthy()

    await wrapper.find('[data-testid="register-load-report-toggle"]').trigger('click')
    await nextTick()

    expect(getReportValue(wrapper, 'Дубликатов')).toBe('4')
  })

  it('passes checkForDuplicates=true to upload when provided', async () => {
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockItem.value = { ...baseRegisterItem, fileName: 'test.xlsx', companyId: 3, registerType: 3 }
    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({ checkForDuplicates: true }, { setErrors: () => {} })
    await resolveAll()

    expect(upload).toHaveBeenCalledWith(
      registersStore.uploadFile.value,
      mockItem.value.companyId,
      mockItem.value.customsProcedureCode,
      true,
      false
    )
  })

  it('handles create mode with upload result object', async () => {
    upload.mockResolvedValueOnce({ success: true, registerId: 42, ErrMsg: '' })
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockItem.value = { ...baseRegisterItem, fileName: 'test.xlsx', registerType: 2, companyId: 2 }
    registerItems.value = []
    const formValues = { dealNumber: 'D42', invoiceNumber: 'INV42' }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit(formValues, { setErrors: vi.fn() })
    await resolveAll()
    
    // Verify upload was called
    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, mockItem.value.customsProcedureCode, true, false)
    
    // Verify update was called with the Id from the Reference object and the sanitized form values
    expect(update).toHaveBeenCalledWith(42, expect.objectContaining({
      dealNumber: 'D42',
      invoiceNumber: 'INV42',
      transportationTypeCode: 1,
      departureAirportId: 0,
      arrivalAirportId: 0
    }))
    
    // Verify navigation occurred
    expect(router.push).toHaveBeenCalledWith('/registers?mode=modePaperwork')
  })

  it('keeps a structured upload error visible until the user closes it', async () => {
    const currencyError = 'В реестре указаны разные валюты: RUB, UZS. Загрузка реестра невозможна'
    upload.mockResolvedValueOnce({
      success: false,
      errMsg: currencyError,
      missingHeaders: [],
      missingColumns: []
    })
    registersStore.uploadFile.value = new File(['data'], 'mixed.xlsx')
    mockItem.value = { ...baseRegisterItem, fileName: 'mixed.xlsx', registerType: 2, companyId: 2 }

    const PersistentErrorDialog = {
      name: 'ErrorDialog',
      props: ['show', 'title', 'message', 'missingHeaders', 'missingColumns'],
      template: '<div data-testid="persistent-upload-error" v-if="show">{{ message }}</div>'
    }
    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: PersistentErrorDialog
        }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    const submission = dialog.vm.onSubmit({ checkForDuplicates: true }, { setErrors: vi.fn() })
    await resolveAll()

    const errorDialog = wrapper.findComponent(PersistentErrorDialog)
    expect(errorDialog.props('show')).toBe(true)
    expect(errorDialog.props('message')).toBe(currencyError)
    expect(wrapper.find('[data-testid="persistent-upload-error"]').text()).toBe(currencyError)
    expect(dialog.vm.actionDialogState.show).toBe(false)
    expect(update).not.toHaveBeenCalled()

    errorDialog.vm.$emit('close')
    await submission
    await resolveAll()

    expect(errorDialog.props('show')).toBe(false)
  })

  it('shows action dialog while upload is in progress', async () => {
    const deferred = createDeferred()
    upload.mockReturnValueOnce(deferred.promise)
    registersStore.uploadFile.value = new File(['data'], 'upload.xlsx')
    mockItem.value = { ...baseRegisterItem, fileName: 'upload.xlsx', companyId: 5 }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }

    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    const submitPromise = dialog.vm.onSubmit({}, { setErrors: () => {} })

    await nextTick()
    expect(dialog.vm.actionDialogState.show).toBe(true)

    deferred.resolve({})
    await submitPromise
    await nextTick()

    expect(dialog.vm.actionDialogState.show).toBe(false)
    expect(router.push).toHaveBeenCalledWith('/registers?mode=modePaperwork')
  })

  it('renders lookupByArticle checkbox with correct properties', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const lookupCheckbox = wrapper.find('#lookupByArticle')
    expect(lookupCheckbox.exists()).toBe(true)
    expect(lookupCheckbox.attributes('type')).toBe('checkbox')
    expect(lookupCheckbox.classes()).toContain('custom-checkbox-input')
    expect(lookupCheckbox.element.closest('.form-row')).not.toBeNull()
    expect(lookupCheckbox.element.closest('.form-group')).not.toBeNull()
    expect(lookupCheckbox.element.closest('.lookup-by-article-group')).toBeNull()

    const label = wrapper.find('.custom-checkbox')
    expect(label.exists()).toBe(true)
    const labelText = wrapper.find('.custom-checkbox-label')
    expect(labelText.text()).toBe('Использовать для подбора кода ТН ВЭД и анализа стоп-слов')
  })

  it('sets default value for lookupByArticle in create mode', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.lookupByArticle).toBe(false)
  })

  it.each([
    ['Ozon', OZON_COMPANY_ID, OZON_COMPANY_ID, CUSTOMS_PROCEDURE_IMPORT],
    ['WBR', WBR_COMPANY_ID, WBR_COMPANY_ID, CUSTOMS_PROCEDURE_IMPORT],
    ['WBR2', WBR2_REGISTER_ID, WBR_COMPANY_ID, CUSTOMS_PROCEDURE_IMPORT],
    ['WbrN', WBRN_REGISTER_ID, WBR_COMPANY_ID, CUSTOMS_PROCEDURE_IMPORT],
    ['GTC', GTC_COMPANY_ID, GTC_COMPANY_ID, CUSTOMS_PROCEDURE_GTC_IMPORT]
  ])('defaults missing transportation type to Auto for %s uploads', async (_label, registerType, companyId, customsProcedureCode) => {
    mockOps.value = {
      ...mockOps.value,
      transportationTypes: [
        { value: 0, name: 'Авиа', document: 'AWB', isAvia: true },
        { value: 1, name: 'Авто', document: 'CMR', isAvia: false }
      ]
    }
    mockItem.value = {
      ...baseRegisterItem,
      registerType,
      companyId,
      customsProcedureCode,
      transportationTypeCode: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.transportationTypeCode).toBe(1)
  })

  it('renders default transportation type and customs procedure in upload selectors', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      customsProcedureCode: null,
      transportationTypeCode: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.transportationTypeCode).toBe(1)
    expect(dialog.vm.item.customsProcedureCode).toBe(CUSTOMS_PROCEDURE_EXPORT)
    expect(wrapper.find('#transportationTypeCode').element.value).toBe('1')
    expect(wrapper.find('#customsProcedureCode').element.value).toBe(String(CUSTOMS_PROCEDURE_EXPORT))
    expect(wrapper.find('#customsProcedureCode option[value=""]').exists()).toBe(false)
    expect(wrapper.find('#customsProcedureCode option[value="0"]').exists()).toBe(false)
  })

  it('defaults zero customs procedure to the first filtered procedure for uploads', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      customsProcedureCode: 0
    }
    upload.mockResolvedValueOnce({ success: true, registerId: 42, errMsg: '' })

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.customsProcedureCode).toBe(CUSTOMS_PROCEDURE_EXPORT)
    expect(wrapper.find('#customsProcedureCode').element.value).toBe(String(CUSTOMS_PROCEDURE_EXPORT))

    await dialog.vm.onSubmit({ customsProcedureCode: 0, checkForDuplicates: true }, { setErrors: vi.fn() })
    await resolveAll()

    expect(upload).toHaveBeenCalledWith(
      registersStore.uploadFile.value,
      mockItem.value.registerType,
      CUSTOMS_PROCEDURE_EXPORT,
      true,
      false
    )
    expect(update).toHaveBeenCalledWith(42, expect.objectContaining({
      customsProcedureCode: CUSTOMS_PROCEDURE_EXPORT
    }))
  })

  it('defaults missing transportation type to Auto when transportation types load later', async () => {
    mockOps.value = {
      ...mockOps.value,
      transportationTypes: []
    }
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeCode: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    mockOps.value = {
      ...mockOps.value,
      transportationTypes: [
        { value: 0, name: 'Авиа', document: 'AWB', isAvia: true },
        { value: 1, name: 'Авто', document: 'CMR', isAvia: false }
      ]
    }
    await nextTick()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.transportationTypeCode).toBe(1)
  })

  it('renders default customs procedure when procedures load later', async () => {
    const customsProcedures = mockOps.value.customsProcedures
    mockOps.value = {
      ...mockOps.value,
      customsProcedures: []
    }
    mockItem.value = {
      ...baseRegisterItem,
      customsProcedureCode: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    mockOps.value = {
      ...mockOps.value,
      customsProcedures
    }
    await nextTick()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.customsProcedureCode).toBe(CUSTOMS_PROCEDURE_EXPORT)
    expect(wrapper.find('#customsProcedureCode').element.value).toBe(String(CUSTOMS_PROCEDURE_EXPORT))
  })

  it('defaults missing register status to the event-derived status for uploads', async () => {
    mockOps.value.initialRegisterStatusId = 2
    mockItem.value = {
      ...baseRegisterItem,
      statusId: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.statusId).toBe(2)
  })

  it('submits the unchanged event-derived status after upload', async () => {
    upload.mockResolvedValueOnce({ success: true, registerId: 42, errMsg: '' })
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockOps.value.initialRegisterStatusId = 2
    mockItem.value = {
      ...baseRegisterItem,
      statusId: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({}, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalledWith(42, expect.objectContaining({ statusId: 2 }))
  })

  it('submits a user-selected status instead of the event-derived default', async () => {
    upload.mockResolvedValueOnce({ success: true, registerId: 42, errMsg: '' })
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockOps.value.initialRegisterStatusId = 2
    mockItem.value = {
      ...baseRegisterItem,
      statusId: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    dialog.vm.handleRegisterStatusChange(3, vi.fn())
    await dialog.vm.onSubmit({}, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalledWith(42, expect.objectContaining({ statusId: 3 }))
  })

  it('does not fall back to the first status when operations omit the initial status', async () => {
    mockOps.value.initialRegisterStatusId = null
    mockItem.value = {
      ...baseRegisterItem,
      statusId: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.statusId).toBeNull()

    upload.mockResolvedValueOnce({ success: true, registerId: 42, errMsg: '' })
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    await dialog.vm.onSubmit({}, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalledWith(42, expect.objectContaining({ statusId: null }))
  })

  it('keeps existing register status for uploads', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      statusId: 2
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.statusId).toBe(2)
  })

  it('continues to submit the existing status in edit mode', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      statusId: 2
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({}, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ statusId: 2 }))
  })

  it('defaults missing country to Uzbekistan for WbrN uploads', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: WBRN_REGISTER_ID,
      companyId: WBR_COMPANY_ID,
      theOtherCountryCode: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.theOtherCountryCode).toBe(860)
  })

  it('defaults missing country to Uzbekistan when loaded', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      theOtherCountryCode: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.theOtherCountryCode).toBe(860)
  })

  it('keeps existing country when loaded', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      theOtherCountryCode: 840
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.theOtherCountryCode).toBe(840)
  })

  it('submits lookupByArticle value in form data', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      lookupByArticle: true
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit(
      {
        lookupByArticle: true,
        dealNumber: 'D123'
      },
      { setErrors: vi.fn() }
    )
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      lookupByArticle: true,
      dealNumber: 'D123'
    }))
  })

  it('handles errors in create mode with Reference object', async () => {
    // Mock upload success but update failure
  upload.mockResolvedValueOnce({ success: true, Success: true, registerId: 42, ErrMsg: '' })
    update.mockRejectedValueOnce(new Error('Update failed'))

    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockItem.value = { ...baseRegisterItem, fileName: 'test.xlsx', companyId: 2 }
    const formValues = { dealNumber: 'D42', invoiceNumber: 'INV42' }
    const setErrors = vi.fn()

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit(formValues, { setErrors })
    await resolveAll()

    // Verify upload was called
    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, mockItem.value.customsProcedureCode, true, false)
    

    // Update may be attempted; ensure at least the upload was triggered and the dialog flow completed
    // Verify navigation occurred (error dialog closes then navigation)
    expect(router.push).toHaveBeenCalledWith('/registers?mode=modePaperwork')

    expect(dialog.vm.actionDialogState.show).toBe(false)
  })

  it('handles update errors in edit mode', async () => {
    update.mockRejectedValueOnce(new Error('Update failed'))
    mockItem.value = { ...baseRegisterItem }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({ dealNumber: 'D-ERR' }, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/registers?mode=modePaperwork')
  })

  it('shows only GTC procedures when registerType is GTC_COMPANY_ID', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: GTC_COMPANY_ID,
      customsProcedureCode: 3
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const procSelect = wrapper.find('#customsProcedureCode')
    const options = procSelect.findAll('option').filter(o => o.attributes('value') !== '')
    const optionTexts = options.map(o => o.text())

    expect(optionTexts).toContain('ГТК Импорт')
    expect(optionTexts).not.toContain('Импорт')
    expect(optionTexts).not.toContain('Экспорт')
  })

  it('hides GTC procedures when registerType is not GTC_COMPANY_ID', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: 2,
      customsProcedureCode: CUSTOMS_PROCEDURE_IMPORT
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const procSelect = wrapper.find('#customsProcedureCode')
    const options = procSelect.findAll('option').filter(o => o.attributes('value') !== '')
    const optionTexts = options.map(o => o.text())

    expect(optionTexts).toContain('Импорт')
    expect(optionTexts).toContain('Экспорт')
    expect(optionTexts).not.toContain('ГТК Импорт')
  })

  it('shows import and reexport for Ozon when allowed by ops metadata and uses GTC company', async () => {
    mockOps.value = {
      ...mockOps.value,
      customsProcedures: [
        { value: 10, charCode: 'ЭК10', name: 'Экспорт', isExport: true, isGtc: false, allowedRegisterTypes: [OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID, WBRN_REGISTER_ID] },
        { value: 31, charCode: 'ЭК31', name: 'Реэкспорт', isExport: true, isRe: true, isGtc: true, allowedRegisterTypes: [OZON_COMPANY_ID, GTC_COMPANY_ID] },
        { value: 40, charCode: 'ИМ40', name: 'Импорт', isExport: false, isGtc: true, allowedRegisterTypes: [OZON_COMPANY_ID, GTC_COMPANY_ID] },
        { value: 60, charCode: 'ИМ60', name: 'Реимпорт', isExport: false, isRe: true, isGtc: false, allowedRegisterTypes: [OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID, WBRN_REGISTER_ID] }
      ]
    }
    mockItem.value = {
      ...baseRegisterItem,
      registerType: OZON_COMPANY_ID,
      companyId: OZON_COMPANY_ID,
      customsProcedureCode: 40
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    const procSelect = wrapper.find('#customsProcedureCode')
    const optionTexts = procSelect.findAll('option').filter(o => o.attributes('value') !== '').map(o => o.text())
    const dialog = wrapper.findComponent(RegisterEditDialog)

    expect(optionTexts).toEqual(['Экспорт', 'Реэкспорт', 'Импорт', 'Реимпорт'])
    expect(mockItem.value.companyId).toBe(GTC_COMPANY_ID)

    dialog.vm.handleProcedureChange({ target: { value: '31' } })
    await nextTick()

    expect(mockItem.value.customsProcedureCode).toBe(31)
    expect(mockItem.value.companyId).toBe(GTC_COMPANY_ID)
    expect(mockItem.value.senderId).toBe(GTC_COMPANY_ID)
  })

  it('defaults to first filtered procedure for GTC register in create mode', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      registerType: GTC_COMPANY_ID,
      customsProcedureCode: null
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub }
      }
    })
    await resolveAll()

    // Should default to the first GTC procedure (value: 3)
    expect(mockItem.value.customsProcedureCode).toBe(3)
  })
})
