/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
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
import { WBR2_REGISTER_ID } from '@/helpers/company.constants.js'

// No need to mock vuetify-use-dialog anymore since we use custom ErrorDialog

const baseRegisterItem = {
  id: 1,
  fileName: 'r.csv',
  companyId: 2,
  registerType: 2,
  dealNumber: 'D1',
  customsProcedureId: 1,
  transportationTypeId: 1,
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

const registersStore = createMockStore({
  item: mockItem,
  items: registerItems,
  getById,
  getAll,
  update,
  upload,
  uploadFile: ref(null)
})
const countriesStore = createMockStore({
  countries: ref([
    { id: 1, isoNumeric: 840, nameRuOfficial: 'США' },
    { id: 2, isoNumeric: 643, nameRuOfficial: 'Россия' }
  ]),
  ensureLoaded: vi.fn()
})
const transStore = createMockStore({
  types: [
    { id: 1, name: 'Авто', code: 1 },
    { id: 2, name: 'Авиа', code: 0 }
  ],
  ensureLoaded: vi.fn()
})
const procStore = createMockStore({
  procedures: [
    { id: 1, code: 11, name: 'Импорт' },
    { id: 2, code: 10, name: 'Экспорт' }
  ],
  ensureLoaded: vi.fn()
})
const companiesStore = createMockStore({
  companies: ref([
    { id: 2, shortName: 'My Company' },
    { id: 3, shortName: 'Partner' }
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
  getAll: vi.fn(() => Promise.resolve())
})

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store === registersStore) {
        return {
          item: mockItem,
          uploadFile: registersStore.uploadFile,
          items: registersStore.items
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

vi.mock('@/stores/registers.store.js', () => ({ useRegistersStore: () => registersStore }))
vi.mock('@/stores/countries.store.js', () => ({ useCountriesStore: () => countriesStore }))
vi.mock('@/stores/transportation.types.store.js', () => ({
  useTransportationTypesStore: () => transStore
}))
vi.mock('@/stores/customs.procedures.store.js', () => ({
  useCustomsProceduresStore: () => procStore
}))
vi.mock('@/stores/companies.store.js', () => ({ useCompaniesStore: () => companiesStore }))
vi.mock('@/stores/airports.store.js', () => ({ useAirportsStore: () => airportsStore }))
vi.mock('@/stores/warehouses.store.js', () => ({ useWarehousesStore: () => warehousesStore }))
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

    return { val, handleInput, slots }
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
        <slot :value="val.value" />
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
    // Create a fresh copy of baseRegisterItem to avoid reference issues
    mockItem.value = JSON.parse(JSON.stringify(baseRegisterItem))
    registerItems.value = []
    airportsStore.airports.value = [...baseAirports]
    warehousesStore.warehouses.value = [
      { id: 10, name: 'Main Warehouse' },
      { id: 11, name: 'Secondary Warehouse' }
    ]
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
    expect(transStore.ensureLoaded).toHaveBeenCalled()
    expect(procStore.ensureLoaded).toHaveBeenCalled()
    expect(airportsStore.getAll).toHaveBeenCalled()
    expect(warehousesStore.getAll).not.toHaveBeenCalled()
    expect(wrapper.find('#invoiceNumber').exists()).toBe(true)
    expect(wrapper.find('#customsProcedureId').exists()).toBe(true)
    const departureSelect = wrapper.find('select#departureAirportId')
    expect(departureSelect.exists()).toBe(true)
    expect(departureSelect.element.disabled).toBe(true)
    const optionTexts = departureSelect.findAll('option').map((option) => option.text())
    expect(optionTexts).toContain('Не выбрано')
    expect(optionTexts).toContain('Шереметьево (SVO)')
    const arrivalSelect = wrapper.find('select#arrivalAirportId')
    expect(arrivalSelect.exists()).toBe(true)
    expect(wrapper.find('#warehouseId').exists()).toBe(false)
  })

  it('enables airport selectors when aviation transport is selected', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeId: 2,
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

  it('renders warehouse selector only for WBR2 register type', async () => {
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

    expect(warehousesStore.getAll).toHaveBeenCalled()
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

    const procSelect = wrapper.find('#customsProcedureId')
    await procSelect.setValue('2')
    await procSelect.trigger('change')
    await nextTick()

    recipientGroup = getGroupByLabel(wrapper, 'Получатель')
    expect(recipientGroup.find('select#theOtherCompanyId').exists()).toBe(true)
  })

  it('dynamically enables/disables airport selectors when transportation type changes', async () => {
    // Start with non-aviation transport (disabled airports)
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeId: 1, // Non-aviation transport
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

    // Change to aviation transport type (id: 2, code: 0)
    const transportSelect = wrapper.find('#transportationTypeId')
    await transportSelect.setValue('2')
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
      transportationTypeId: 2,
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
        transportationTypeId: '2',
        departureAirportId: '1',
        arrivalAirportId: '2'
      },
      { setErrors: vi.fn() }
    )
    await resolveAll()

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      transportationTypeId: 2,
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

  it('validates invoice number format only for aviation transport', async () => {
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeId: 2
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
      dialog.vm.schema.validate({ transportationTypeId: 2, invoiceNumber: '123-12345678' })
    ).resolves.toBeDefined()

    await expect(
      dialog.vm.schema.validate({ transportationTypeId: 2, invoiceNumber: '12-ABC' })
    ).rejects.toThrow('Номер накладной для авиаперевозки должен быть в формате <три цифры>-<восемь цифр>')

    await expect(
      dialog.vm.schema.validate({ transportationTypeId: 1, invoiceNumber: 'INVALID-FORMAT' })
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
    expect(getAll).toHaveBeenCalled()
    expect(wrapper.find('h1').text()).toBe('Загрузка реестра')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Загрузить')

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({}, { setErrors: () => {} })
    await resolveAll()
    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, 0, false)
    expect(router.push).toHaveBeenCalledWith('/registers')
  })

  it('still renders create dialog when register list fetch fails', async () => {
    const loadError = new Error('load failed')
    getAll.mockRejectedValueOnce(loadError)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const Parent = {
        template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
        components: { RegisterEditDialog }
      }
      const wrapper = mount(Parent, {
        global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
      })

      await resolveAll()

      expect(getAll).toHaveBeenCalled()
      expect(wrapper.find('h1').text()).toBe('Загрузка реестра')
      const selector = wrapper.find('select#transferRegisterId')
      expect(selector.exists()).toBe(true)
      expect(selector.findAll('option')).toHaveLength(1)
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  it('renders transfer register selector with generated names', async () => {
    registerItems.value = [
      { id: 10, dealNumber: 'D-100', fileName: 'reg-100.xlsx', registerType: 2, companyId: 2 },
      { id: 11, dealNumber: '', fileName: 'reg-empty.xlsx', registerType: 2, companyId: 2 }
    ]

    const Parent = {
      template: '<Suspense><RegisterEditDialog :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } }
    })

    await resolveAll()

    const selector = wrapper.find('select#transferRegisterId')
    expect(selector.exists()).toBe(true)

    const optionTexts = selector.findAll('option').map((option) => option.text())
    expect(optionTexts).toContain('Не выбрано')
    expect(optionTexts).toContain('Реестр для сделки D-100')
    expect(optionTexts).toContain('Реестр для сделки без номера (файл: reg-empty.xlsx)')
  })

  it('passes selected register id to upload when provided', async () => {
    registerItems.value = [
      { id: 20, dealNumber: 'D-200', fileName: 'reg-200.xlsx', companyId: 3, registerType: 3 }
    ]
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

    const selector = wrapper.find('select#transferRegisterId')
    await selector.setValue('20')

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({}, { setErrors: () => {} })
    await resolveAll()

    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, 20, false)
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
    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, 0, false)
    
    // Verify update was called with the Id from the Reference object and the sanitized form values
    expect(update).toHaveBeenCalledWith(42, expect.objectContaining({
      dealNumber: 'D42',
      invoiceNumber: 'INV42',
      transportationTypeId: 1,
      departureAirportId: 0,
      arrivalAirportId: 0
    }))
    
    // Verify navigation occurred
    expect(router.push).toHaveBeenCalledWith('/registers')
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
    expect(router.push).toHaveBeenCalledWith('/registers')
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
    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, 0, false)
    

    // Update may be attempted; ensure at least the upload was triggered and the dialog flow completed
    // Verify navigation occurred (error dialog closes then navigation)
    expect(router.push).toHaveBeenCalledWith('/registers')

    expect(dialog.vm.actionDialogState.show).toBe(false)
  })
})
