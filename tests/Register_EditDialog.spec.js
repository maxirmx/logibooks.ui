/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import * as Yup from 'yup'
import { createPinia, setActivePinia } from 'pinia'
import RegisterEditDialog from '@/dialogs/Register_EditDialog.vue'
import { rememberRegisterUploadDraft, getRegisterUploadDraft, clearRegisterUploadDraft } from '@/helpers/register.upload.recovery.js'
import { defaultGlobalStubs, createMockStore } from './helpers/test-utils.js'
import router from '@/router'
import { resolveAll } from './helpers/test-utils'
import {
  WBR_COMPANY_ID,
  WBRN_REGISTER_ID,
  GTC_COMPANY_ID,
  OZON_COMPANY_ID
} from '@/helpers/company.constants.js'
import { CUSTOMS_PROCEDURE_RETURN } from '@/helpers/customs.procedure.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'

enableAutoUnmount(afterEach)
afterEach(() => {
  clearRegisterUploadDraft(42)
  clearRegisterUploadDraft(1)
})

const restrictionConfirm = vi.hoisted(() => vi.fn())
vi.mock('@/composables/useAppConfirm.js', () => ({ useAppConfirm: () => restrictionConfirm }))
const CUSTOMS_PROCEDURE_EXPORT = 10
const CUSTOMS_PROCEDURE_IMPORT = 40
const CUSTOMS_PROCEDURE_GTC_IMPORT = 3

const baseRegisterItem = {
  id: 1,
  fileName: 'r.csv',
  companyId: 2,
  registerType: 2,
  dealNumber: 'D1',
  customerOrderNumber: 'ORDER-001',
  customsProcedureCode: CUSTOMS_PROCEDURE_IMPORT,
  incotermsCode: 2,
  transportationTypeCode: 1,
  theOtherCompanyId: null,
  theOtherCountryCode: null,
  departureAirportId: 0,
  arrivalAirportId: 0,
  warehouseId: 0,
  date: '2024-01-01',
  lookupByArticle: false,
  cargoPlacesTotal: 12
}
const mockItem = ref({ ...baseRegisterItem })
const getById = vi.fn(() => Promise.resolve())
const update = vi.fn(() => Promise.resolve())
const upload = vi.fn(() => Promise.resolve())
const getAll = vi.fn(() => Promise.resolve())
const registerItems = ref([])

const mockOps = ref({
  customsProcedures: [
    {
      value: CUSTOMS_PROCEDURE_RETURN,
      charCode: '01',
      name: 'Возврат',
      isExport: false,
      isGtc: false,
      initialRegisterStatusId: 1
    },
    {
      value: CUSTOMS_PROCEDURE_EXPORT,
      charCode: 'ЭК10',
      name: 'Экспорт',
      isExport: true,
      isGtc: false,
      initialRegisterStatusId: 1
    },
    {
      value: CUSTOMS_PROCEDURE_IMPORT,
      charCode: 'ИМ40',
      name: 'Импорт',
      isExport: false,
      isGtc: false,
      initialRegisterStatusId: 1
    },
    {
      value: CUSTOMS_PROCEDURE_GTC_IMPORT,
      charCode: 'ГТК1',
      name: 'ГТК Импорт',
      isExport: false,
      isGtc: true,
      initialRegisterStatusId: 1
    }
  ],
  transportationTypes: [
    { value: 1, name: 'Авто', document: 'CMR', isAvia: false },
    { value: 0, name: 'Авиа', document: 'AWB', isAvia: true }
  ],
  incoterms: [
    { value: 0, charCode: 'EXW', name: 'Франко завод' },
    { value: 1, charCode: 'FCA', name: 'Франко перевозчик' },
    { value: 2, charCode: 'CPT', name: 'Перевозка оплачена до' }
  ]
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
    const type = mockOps.value.transportationTypes.find((t) => t.value === id)
    return type ? type.document : `[Тип ${id}]`
  }),
  isExportProcedure: vi.fn((id) => {
    const proc = mockOps.value.customsProcedures.find((p) => p.value === id)
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
    { id: 1, title: 'New', icon: 'svg:registered', bkColor: '#FFFFFF', fgColor: '#000000', readOnly: false },
    { id: 2, title: 'In Progress', icon: 'svg:in-transit', bkColor: '#FFEEDD', fgColor: '#111111', readOnly: false },
    {
      id: 3,
      title: 'Completed',
      readOnly: true,
      icon: 'svg:very-delivered',
      bkColor: '#00AA00',
      fgColor: '#FFFFFF'
    }
  ],
  ensureLoaded: vi.fn(() => Promise.resolve()),
  getStatusById: vi.fn(
    (id) => registerStatusesStore.registerStatuses.find((status) => status.id === id) || null
  ),
  getStatusTitle: vi.fn((id) => (id ? `Status ${id}` : 'Unknown'))
})
const mockIsAdmin = ref(true)
const mockIsShiftLead = ref(false)
const authStore = {
  get isAdmin() {
    return mockIsAdmin.value
  },
  get isShiftLead() {
    return mockIsShiftLead.value
  }
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
vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => registerStatusesStore
}))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authStore }))
vi.mock('@/router', () => ({ default: { push: vi.fn(() => Promise.resolve()) } }))

// Simple stubs for vee-validate components
const FormStub = {
  name: 'Form',
  template:
    '<form><slot :errors="{}" :isSubmitting="false" :values="{}" :setFieldValue="mockSetFieldValue" /></form>',
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
  template:
    '<form><slot :errors="{ realWeightKg: realWeightErrorMessage }" :isSubmitting="false" :values="{}" :setFieldValue="mockSetFieldValue" :handleSubmit="mockHandleSubmit" /></form>',
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

const CurrencySelectionDialogStub = {
  name: 'RegisterCurrencySelectionDialog',
  props: ['show', 'currencies'],
  emits: ['select', 'cancel'],
  template:
    '<div v-if="show" data-testid="currency-selection-dialog">{{ currencies.join(\', \') }}</div>'
}

function getGroupByLabel(wrapper, text) {
  return wrapper.findAll('.form-group').find((g) => g.find('label').text().includes(text))
}

function getReportValue(wrapper, label) {
  const field = wrapper
    .findAll('.load-report-field')
    .find((g) => g.find('.label').text().includes(label))
  return field?.find('.load-report-value').text()
}

function getActionButton(wrapper, testId) {
  return wrapper
    .findAllComponents({ name: 'ActionButton' })
    .find(
      (button) =>
        button.attributes('data-testid') === testId ||
        button.find(`[data-testid="${testId}"]`).exists()
    )
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
    restrictionConfirm.mockReset().mockResolvedValue(true)
    upload.mockResolvedValue({ success: true, registerId: 42 })
    update.mockResolvedValue()
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
        {
          value: CUSTOMS_PROCEDURE_RETURN,
          charCode: '01',
          name: 'Возврат',
          isExport: false,
          isGtc: false,
          initialRegisterStatusId: 1
        },
        {
          value: CUSTOMS_PROCEDURE_EXPORT,
          charCode: 'ЭК10',
          name: 'Экспорт',
          isExport: true,
          isGtc: false,
          initialRegisterStatusId: 1
        },
        {
          value: CUSTOMS_PROCEDURE_IMPORT,
          charCode: 'ИМ40',
          name: 'Импорт',
          isExport: false,
          isGtc: false,
          initialRegisterStatusId: 1
        },
        {
          value: CUSTOMS_PROCEDURE_GTC_IMPORT,
          charCode: 'ГТК1',
          name: 'ГТК Импорт',
          isExport: false,
          isGtc: true,
          initialRegisterStatusId: 1
        }
      ],
      transportationTypes: [
        { value: 1, name: 'Авто', document: 'CMR', isAvia: false },
        { value: 0, name: 'Авиа', document: 'AWB', isAvia: true }
      ],
      incoterms: [
        { value: 0, charCode: 'EXW', name: 'Франко завод' },
        { value: 1, charCode: 'FCA', name: 'Франко перевозчик' },
        { value: 2, charCode: 'CPT', name: 'Перевозка оплачена до' }
      ]
    }
  })

  describe('AVIA airport validation with real form controls', () => {
    let wrapper

    async function mountForm({ create = false, values = {}, waitForReady = true } = {}) {
      mockItem.value = {
        ...baseRegisterItem,
        transportationTypeCode: 0,
        theOtherCountryCode: 840,
        ...values
      }
      registersStore.uploadFile.value = new File(['data'], 'register.xlsx')
      wrapper = mount(
        {
          components: { RegisterEditDialog },
          template: '<Suspense><RegisterEditDialog :id="1" :create="create" /></Suspense>',
          setup: () => ({ create })
        },
        {
          attachTo: document.body,
          global: {
            stubs: {
              ...defaultGlobalStubs,
              ErrorDialog: ErrorDialogStub,
              RegisterCurrencySelectionDialog: CurrencySelectionDialogStub
            }
          }
        }
      )
      await resolveAll()
      if (waitForReady) {
        await vi.waitFor(() => expect(wrapper.get('.header-actions button').element.disabled).toBe(false))
      }
      return wrapper.findComponent(RegisterEditDialog)
    }

    afterEach(() => {
      wrapper?.unmount()
    })

    it.each([
      ['departureAirportId', 'Необходимо выбрать аэропорт отправления']
    ])('rejects every unselected value for %s', async (field, message) => {
      const dialog = await mountForm()
      for (const value of [0, '0', '', null, undefined, 'invalid']) {
        await expect(
          dialog.vm.schema.validate({
            transportationTypeCode: '0',
            theOtherCountryCode: 840,
            departureAirportId: '1',
            arrivalAirportId: '2',
            [field]: value
          })
        ).rejects.toMatchObject({ path: field, message })
      }
    })

    it('uses transport metadata and the existing item when the form has no transport value', async () => {
      const dialog = await mountForm({ values: { transportationTypeCode: '7' } })
      mockOps.value.transportationTypes = [{ value: '7', isAvia: true }]
      await expect(
        dialog.vm.schema.validate({ theOtherCountryCode: 840 })
      ).rejects.toThrow('Необходимо выбрать аэропорт')
      await expect(
        dialog.vm.schema.validate({
          theOtherCountryCode: 840,
          departureAirportId: '1',
          arrivalAirportId: '2'
        })
      ).resolves.toMatchObject({ departureAirportId: 1, arrivalAirportId: 2 })
    })

    it('clears AVIA errors and submits zero airports after switching to Auto', async () => {
      await mountForm()
      await wrapper.get('form').trigger('submit')
      await vi.waitFor(() => expect(wrapper.findAll('.invalid-feedback')).toHaveLength(2))
      await wrapper.get('#transportationTypeCode').setValue('1')
      await vi.waitFor(() => expect(wrapper.findAll('.invalid-feedback')).toHaveLength(0))
      expect(wrapper.get('#departureAirportId').element.disabled).toBe(true)
      expect(wrapper.get('#arrivalAirportId').attributes('aria-required')).toBe('false')
      await wrapper.get('form').trigger('submit')
      await vi.waitFor(() => expect(update).toHaveBeenCalledOnce())
      expect(update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ transportationTypeCode: 1, departureAirportId: 0, arrivalAirportId: 0 })
      )
    })

    it('shows a metadata rejection once without opening validation', async () => {
      mockOps.value.transportationTypes = []
      registersStore.ensureOpsLoaded
        .mockRejectedValueOnce(new Error('Не удалось загрузить типы транспорта'))
        .mockImplementationOnce(async () => {
          mockOps.value.transportationTypes = [{ value: 0, isAvia: true }]
        })
      const alertStore = useAlertStore()
      const publishError = vi.spyOn(alertStore, 'error')
      await mountForm({ waitForReady: false })
      await vi.waitFor(() => expect(wrapper.get('.page-alert-region').text()).toContain('Не удалось загрузить типы транспорта'))
      expect(publishError).toHaveBeenCalledOnce()
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(wrapper.get('hr.hr').element.nextElementSibling).toBe(wrapper.get('.page-alert-region').element)
      expect(wrapper.get('.header-actions button').element.disabled).toBe(true)
      await wrapper.get('form').trigger('submit')
      await resolveAll()
      expect(update).not.toHaveBeenCalled()
      expect(router.push).not.toHaveBeenCalled()

    })

    it('retains the unsaved unlock and corrections after a rejection and retries the same update', async () => {
      const message = 'Не удалось сохранить изменения реестра'
      update.mockRejectedValueOnce(new Error(message))
      const publishError = vi.spyOn(useAlertStore(), 'error')
      await mountForm({ values: { readOnly: true, statusId: 3 } })
      const statusSelect = wrapper.findComponent({ name: 'RegisterStatusSelect' })
      statusSelect.vm.$emit('update:modelValue', 2)
      await nextTick()
      await wrapper.get('#departureAirportId').setValue('1')
      await wrapper.get('#arrivalAirportId').setValue('2')
      await wrapper.get('#dealNumber').setValue('CORRECTED-DEAL')
      await wrapper.get('.header-actions button').trigger('click')
      await vi.waitFor(() => expect(wrapper.get('.page-alert-region').text()).toContain(message))

      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(publishError).toHaveBeenCalledOnce()
      expect(router.push).not.toHaveBeenCalled()
      expect(statusSelect.props('modelValue')).toBe(2)
      expect(wrapper.get('#departureAirportId').element.matches(':disabled')).toBe(false)
      expect(wrapper.get('#departureAirportId').element.value).toBe('1')
      expect(wrapper.get('#arrivalAirportId').element.value).toBe('2')
      expect(wrapper.get('#dealNumber').element.value).toBe('CORRECTED-DEAL')

      await wrapper.get('.header-actions button').trigger('click')
      await vi.waitFor(() => expect(router.push).toHaveBeenCalledOnce())
      expect(update).toHaveBeenCalledTimes(2)
      expect(update.mock.calls[1]).toEqual(update.mock.calls[0])
      expect(update.mock.calls[1][1]).toMatchObject({ statusId: 2, dealNumber: 'CORRECTED-DEAL' })
      expect(upload).not.toHaveBeenCalled()
      expect(publishError).toHaveBeenCalledOnce()
    })

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
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })
    await resolveAll()

    mockOps.value = {
      customsProcedures: [
        {
          value: CUSTOMS_PROCEDURE_RETURN,
          charCode: '01',
          name: 'Возврат',
          isRe: false,
          isExport: false,
          isGtc: false
        },
        {
          value: CUSTOMS_PROCEDURE_EXPORT,
          charCode: 'ЭК10',
          name: 'Экспорт',
          isRe: false,
          isExport: true,
          isGtc: false
        },
        {
          value: CUSTOMS_PROCEDURE_IMPORT,
          charCode: 'ИМ40',
          name: 'Импорт',
          isRe: true,
          isExport: false,
          isGtc: false
        },
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
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)

    expect(dialog.vm.formatDateInputValue('2024-02-04')).toBe('2024-02-04')
    expect(dialog.vm.formatDateInputValue('not-a-date')).toBe('')
  })

  it('switches recipient field on customs procedure change', async () => {
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
          ErrorDialog: ErrorDialogStub
        }
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
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
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
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })

    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)

    await expect(
      dialog.vm.schema.validate({
        transportationTypeCode: 0,
        invoiceNumber: '123-12345678',
        departureAirportId: 1,
        arrivalAirportId: 2,
        theOtherCountryCode: 840
      })
    ).resolves.toBeDefined()

    await expect(
      dialog.vm.schema.validate({
        transportationTypeCode: 0,
        invoiceNumber: '12-ABC',
        departureAirportId: 1,
        arrivalAirportId: 2,
        theOtherCountryCode: 840
      })
    ).rejects.toThrow(
      'Номер накладной для авиаперевозки должен быть в формате <три цифры>-<восемь цифр>'
    )

    await expect(
      dialog.vm.schema.validate({
        transportationTypeCode: 1,
        invoiceNumber: 'INVALID-FORMAT',
        theOtherCountryCode: 840
      })
    ).resolves.toBeDefined()
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
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
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
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })

    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(wrapper.find('#checkForDuplicates').exists()).toBe(false)

    dialog.vm.handleProcedureChange(
      { target: { value: String(CUSTOMS_PROCEDURE_EXPORT) } },
      vi.fn()
    )
    await nextTick()

    expect(wrapper.find('#checkForDuplicates').exists()).toBe(true)
    expect(dialog.vm.item.checkForDuplicates).toBe(true)

    update.mockClear()
    await dialog.vm.onSubmit(
      { customsProcedureCode: String(CUSTOMS_PROCEDURE_EXPORT) },
      { setErrors: vi.fn() }
    )
    await resolveAll()

    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        customsProcedureCode: CUSTOMS_PROCEDURE_EXPORT,
        checkForDuplicates: true
      })
    )
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
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })

    await resolveAll()

    expect(wrapper.find('[data-testid="register-deal-section-title"]').text()).toBe('Сделка')
    expect(wrapper.find('[data-testid="register-weight-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="register-weight-section"] .section-title').text()).toBe(
      'Вес'
    )
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

  it('validates and submits additional 1C information only in edit mode', async () => {
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
          ErrorDialog: ErrorDialogStub
        }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    const blankValues = await dialog.vm.schema.validate({
      inspectionsCount: '',
      theOtherCountryCode: 840
    })
    expect(blankValues.inspectionsCount).toBe(0)
    await expect(
      dialog.vm.schema.validate({ inspectionsCount: -1, theOtherCountryCode: 840 })
    ).rejects.toThrow('Количество досмотренных посылок')
    await expect(
      dialog.vm.schema.validate({ inspectionsCount: 1.5, theOtherCountryCode: 840 })
    ).rejects.toThrow('Количество досмотренных посылок')
    await expect(
      dialog.vm.schema.validate({ decDate: '2026-02-30', theOtherCountryCode: 840 })
    ).rejects.toThrow('Укажите корректную дату подачи ДТЭГ')
    await expect(
      dialog.vm.schema.validate({ releaseDate: 'not-a-date', theOtherCountryCode: 840 })
    ).rejects.toThrow('Укажите корректную дату выпуска')

    await dialog.vm.onSubmit(
      {
        inspectionsCount: '7',
        withTransit: true,
        decDate: '2026-07-20',
        releaseDate: '2026-07-21'
      },
      { setErrors: vi.fn() }
    )
    await resolveAll()

    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        inspectionsCount: 7,
        withTransit: true,
        decDate: '2026-07-20',
        releaseDate: '2026-07-21'
      })
    )

    const clearedPayload = dialog.vm.prepareRegisterPayload({ decDate: '', releaseDate: null })
    expect(clearedPayload.decDate).toBeNull()
    expect(clearedPayload.releaseDate).toBeNull()
    expect(
      dialog.vm.prepareRegisterPayload({ customerOrderNumber: ' ORDER-EDIT ' }).customerOrderNumber
    ).toBe('ORDER-EDIT')
    expect(dialog.vm.prepareRegisterPayload({ customerOrderNumber: '   ' }).customerOrderNumber).toBe(
      ''
    )
  })

  describe('cargo unit count', () => {
    async function mountCargoEditor(create = false, realForm = false) {
      const Parent = {
        template: `<Suspense><RegisterEditDialog :id="1" :create="${create}" /></Suspense>`,
        components: { RegisterEditDialog }
      }
      const wrapper = mount(Parent, { attachTo: document.body, global: { stubs: {
        ...defaultGlobalStubs,
        Form: realForm ? false : FormStub,
        Field: realForm ? false : FieldStub,
        ErrorDialog: ErrorDialogStub
      } } })
      await resolveAll()
      if (!create) await wrapper.get('[data-testid="register-additional-info-toggle"]').trigger('click')
      return { wrapper, dialog: wrapper.findComponent(RegisterEditDialog) }
    }

    it.each([
      ''
    ])('accepts and normalizes cargo count %s', async count => {
      const { wrapper, dialog } = await mountCargoEditor()
      const normalized = await dialog.vm.schema.validateAt('cargoPlacesTotal', { cargoPlacesTotal: count })
      expect(normalized).toBe(count === null || count === '' ? 0 : Number(count))
      expect(dialog.vm.prepareRegisterPayload({ cargoPlacesTotal: normalized }).cargoPlacesTotal).toBe(normalized)
      wrapper.unmount()
    })

    it('shows a server field error once, retains the correction and retries without navigating on failure', async () => {
      const { wrapper, dialog } = await mountCargoEditor(false, true)
      const message = 'Количество грузовых мест должно быть неотрицательным'
      const input = wrapper.get('#cargoPlacesTotal')
      await input.setValue('13')
      update.mockRejectedValueOnce(Object.assign(new Error(message), { status: 400, data: {
        msg: message, errors: { cargoPlacesTotal: [message] }
      } }))
      const form = wrapper.getComponent({ name: 'Form' }).vm.$.exposed
      await form.validate()
      await wrapper.get('[data-testid="register-additional-info-toggle"]').trigger('click')
      expect(wrapper.get('#register-additional-info-body').isVisible()).toBe(false)
      await dialog.vm.onSubmit({ cargoPlacesTotal: '13' }, { setErrors: form.setErrors })
      await resolveAll()
      const errors = wrapper.findAll('[role="alert"]').filter(node => node.text() === message)
      expect(errors).toHaveLength(1)
      expect(wrapper.get('#register-additional-info-body').isVisible()).toBe(true)
      expect(errors[0].element.parentElement).toBe(input.element.parentElement)
      expect(input.element.value).toBe('13')
      expect(router.push).not.toHaveBeenCalled()
      expect(useAlertStore().alert).toBeNull()
      await dialog.vm.onSubmit({ cargoPlacesTotal: '13' }, { setErrors: form.setErrors })
      expect(update).toHaveBeenCalledTimes(2)
      expect(update.mock.calls[1][1].cargoPlacesTotal).toBe(13)
      expect(router.push).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })
  })

  it('submits numeric real weight in edit mode', async () => {
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
          ErrorDialog: ErrorDialogStub
        }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await dialog.vm.onSubmit({ realWeightKg: '12.5' }, { setErrors: vi.fn() })
    await resolveAll()

    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        realWeightKg: 12.5
      })
    )
  })

  it('shows validation error for negative real weight', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="false" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormWithRealWeightErrorStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    await expect(
      dialog.vm.schema.validate({ realWeightKg: -1, theOtherCountryCode: 840 })
    ).rejects.toThrow(realWeightErrorMessage)

    expect(wrapper.find('#realWeightKg').classes()).toContain('is-invalid')
    expect(wrapper.find('.invalid-feedback').text()).toContain(realWeightErrorMessage)
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
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)

    expect(getWeightValue(wrapper, 'Поправочный коэффициент')).toBe('1')
    expect(dialog.vm.formatCorrectionCoefficient(0)).toBe('1')
    expect(dialog.vm.formatCorrectionCoefficient(10)).toBe('—')
  })

  it('renders load report collapsed by default and expands with approved labels', async () => {
    const createdAt = '2026-06-10T12:30:15+03:00'
    mockItem.value = {
      ...baseRegisterItem,
      loadReport: {
        createdAt,
        processed: 10,
        failed: -1,
        skippedByCurrency: 2,
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
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })

    await resolveAll()

    expect(wrapper.find('[data-testid="register-load-report"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Отчёт о загрузке файла реестра')
    expect(wrapper.find('#register-load-report-body').exists()).toBe(false)

    let toggle = getActionButton(wrapper, 'register-load-report-toggle')
    expect(toggle).toBeTruthy()
    expect(toggle.props('tooltipText')).toBe('Показать отчет загрузки')

    await wrapper.find('[data-testid="register-load-report-toggle"]').trigger('click')
    await nextTick()

    expect(wrapper.find('#register-load-report-body').exists()).toBe(true)
    expect(wrapper.find('#register-load-report-body').classes()).toContain('form-row')
    expect(wrapper.findAll('.load-report-field .label').map((label) => label.text())).toEqual([
      'Обработано строк:',
      'Ошибочных строк:',
      'Пропущено по валюте:',
      'Исключено партнёром:',
      'Согласовано с акцизом:',
      'Согласовано с нотификацией:',
      'Дубликатов:',
      'С предшествующими:',
      'Время загрузки:'
    ])
    toggle = getActionButton(wrapper, 'register-load-report-toggle')
    expect(toggle.props('icon')).toBe('fa-solid fa-angles-up')
    expect(toggle).toBeTruthy()
    expect(toggle.props('tooltipText')).toBe('Скрыть отчет загрузки')

    expect(getReportValue(wrapper, 'Время загрузки')).toBe(
      new Date(createdAt).toLocaleTimeString('ru-RU')
    )
    expect(getReportValue(wrapper, 'Обработано строк')).toBe('10')
    expect(getReportValue(wrapper, 'Ошибочных строк')).toBe('—')
    expect(getReportValue(wrapper, 'Пропущено по валюте')).toBe('2')
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
    toggle = getActionButton(wrapper, 'register-load-report-toggle')
    expect(toggle).toBeTruthy()
    expect(toggle.props('icon')).toBe('fa-solid fa-angles-down')
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
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })

    await resolveAll()

    expect(wrapper.find('[data-testid="register-load-report"]').exists()).toBe(true)
    const toggle = getActionButton(wrapper, 'register-load-report-toggle')
    expect(toggle).toBeTruthy()
    expect(toggle.props('icon')).toBe('fa-solid fa-angles-down')

    await wrapper.find('[data-testid="register-load-report-toggle"]').trigger('click')
    await nextTick()

    expect(getReportValue(wrapper, 'Дубликатов')).toBe('4')
  })

  it('passes checkForDuplicates=true to upload when provided', async () => {
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockItem.value = {
      ...baseRegisterItem,
      fileName: 'test.xlsx',
      customerOrderNumber: null,
      companyId: 3,
      registerType: 3
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
          ErrorDialog: ErrorDialogStub
        }
      }
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
      false,
      null,
      2
    )
    expect(update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ customerOrderNumber: null })
    )
  })

  it('asks for a currency and retries the same upload with the selection', async () => {
    upload
      .mockResolvedValueOnce({
        success: false,
        requiresCurrencySelection: true,
        availableCurrencies: ['USD', 'UZS']
      })
      .mockResolvedValueOnce({ success: true, registerId: 42 })
    registersStore.uploadFile.value = new File(['data'], 'mixed.xlsx')
    mockItem.value = { ...baseRegisterItem, fileName: 'mixed.xlsx', registerType: 2, companyId: 2 }

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
          ErrorDialog: ErrorDialogStub,
          RegisterCurrencySelectionDialog: CurrencySelectionDialogStub
        }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    const submission = dialog.vm.onSubmit({ checkForDuplicates: true }, { setErrors: vi.fn() })
    await resolveAll()

    const currencyDialog = wrapper.findComponent(CurrencySelectionDialogStub)
    expect(currencyDialog.props('show')).toBe(true)
    expect(currencyDialog.props('currencies')).toEqual(['USD', 'UZS'])
    expect(dialog.vm.actionDialogState.show).toBe(false)
    expect(upload).toHaveBeenCalledTimes(1)
    expect(update).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()

    currencyDialog.vm.$emit('select', 'UZS')
    await submission
    await resolveAll()

    expect(upload).toHaveBeenNthCalledWith(
      1,
      registersStore.uploadFile.value,
      mockItem.value.registerType,
      mockItem.value.customsProcedureCode,
      true,
      false,
      null,
      2
    )
    expect(upload).toHaveBeenNthCalledWith(
      2,
      registersStore.uploadFile.value,
      mockItem.value.registerType,
      mockItem.value.customsProcedureCode,
      true,
      false,
      'UZS',
      2
    )
    expect(update).toHaveBeenCalledWith(42, expect.any(Object))
    expect(router.push).toHaveBeenCalledWith('/registers?mode=modePaperwork')
  })

  it('cancels a mixed-currency upload without retrying or updating', async () => {
    upload.mockResolvedValueOnce({
      success: false,
      requiresCurrencySelection: true,
      availableCurrencies: ['USD', 'UZS']
    })
    registersStore.uploadFile.value = new File(['data'], 'mixed.xlsx')
    mockItem.value = { ...baseRegisterItem, fileName: 'mixed.xlsx', registerType: 2, companyId: 2 }

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
          ErrorDialog: ErrorDialogStub,
          RegisterCurrencySelectionDialog: CurrencySelectionDialogStub
        }
      }
    })
    await resolveAll()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    const submission = dialog.vm.onSubmit({ checkForDuplicates: true }, { setErrors: vi.fn() })
    await resolveAll()

    wrapper.findComponent(CurrencySelectionDialogStub).vm.$emit('cancel')
    await submission
    await resolveAll()

    expect(upload).toHaveBeenCalledTimes(1)
    expect(update).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
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
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
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
    expect(router.push).not.toHaveBeenCalled()
  })

  it('defaults missing transportation type to Auto and missing Incoterms to CPT', async () => {
    mockOps.value = {
      ...mockOps.value,
      transportationTypes: []
    }
    mockItem.value = {
      ...baseRegisterItem,
      transportationTypeCode: null,
      incotermsCode: null
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
          ErrorDialog: ErrorDialogStub
        }
      }
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
    expect(dialog.vm.item.incotermsCode).toBe(2)
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
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })
    await resolveAll()

    mockOps.value = {
      ...mockOps.value,
      customsProcedures
    }
    await nextTick()

    const dialog = wrapper.findComponent(RegisterEditDialog)
    expect(dialog.vm.item.customsProcedureCode).toBe(CUSTOMS_PROCEDURE_EXPORT)
    expect(wrapper.find('#customsProcedureCode').element.value).toBe(
      String(CUSTOMS_PROCEDURE_EXPORT)
    )
  })

  it('shows import and reexport for Ozon when allowed by ops metadata and uses GTC company', async () => {
    mockOps.value = {
      ...mockOps.value,
      customsProcedures: [
        {
          value: 10,
          charCode: 'ЭК10',
          name: 'Экспорт',
          isExport: true,
          isGtc: false,
          allowedRegisterTypes: [
            OZON_COMPANY_ID,
            WBR_COMPANY_ID,
                      WBRN_REGISTER_ID
          ]
        },
        {
          value: 31,
          charCode: 'ЭК31',
          name: 'Реэкспорт',
          isExport: true,
          isRe: true,
          isGtc: true,
          allowedRegisterTypes: [OZON_COMPANY_ID, GTC_COMPANY_ID]
        },
        {
          value: 40,
          charCode: 'ИМ40',
          name: 'Импорт',
          isExport: false,
          isGtc: true,
          allowedRegisterTypes: [OZON_COMPANY_ID, GTC_COMPANY_ID]
        },
        {
          value: 60,
          charCode: 'ИМ60',
          name: 'Реимпорт',
          isExport: false,
          isRe: true,
          isGtc: false,
          allowedRegisterTypes: [
            OZON_COMPANY_ID,
            WBR_COMPANY_ID,
                      WBRN_REGISTER_ID
          ]
        }
      ]
    }
    mockItem.value = {
      ...baseRegisterItem,
      registerType: OZON_COMPANY_ID,
      companyId: OZON_COMPANY_ID,
      customsProcedureCode: 40
    }

    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" :create="true" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub,
          ErrorDialog: ErrorDialogStub
        }
      }
    })
    await resolveAll()

    const procSelect = wrapper.find('#customsProcedureCode')
    const optionTexts = procSelect
      .findAll('option')
      .filter((o) => o.attributes('value') !== '')
      .map((o) => o.text())
    const dialog = wrapper.findComponent(RegisterEditDialog)

    expect(optionTexts).toEqual(['Экспорт', 'Реэкспорт', 'Импорт', 'Реимпорт'])
    expect(mockItem.value.companyId).toBe(GTC_COMPANY_ID)

    dialog.vm.handleProcedureChange({ target: { value: '31' } })
    await nextTick()

    expect(mockItem.value.customsProcedureCode).toBe(31)
    expect(mockItem.value.companyId).toBe(GTC_COMPANY_ID)
    expect(mockItem.value.senderId).toBe(GTC_COMPANY_ID)
  })

  describe('company identity during direction updates', () => {
    async function mountCompanyEditor(create) {
      const Parent = {
        template: `<Suspense><RegisterEditDialog :id="1" :create="${create}" /></Suspense>`,
        components: { RegisterEditDialog }
      }
      const wrapper = mount(Parent, { global: { stubs: {
        ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub
      } } })
      await resolveAll()
      return { wrapper, dialog: wrapper.findComponent(RegisterEditDialog) }
    }

    it.each([
      GTC_COMPANY_ID
    ])(
      'preserves the server company for existing type %i through initialization and direction changes', async (registerType) => {
        const companyId = registerType === GTC_COMPANY_ID ? WBR_COMPANY_ID : GTC_COMPANY_ID
        mockItem.value = {
          ...baseRegisterItem, registerType, companyId,
          customsProcedureCode: CUSTOMS_PROCEDURE_IMPORT,
          theOtherCompanyId: OZON_COMPANY_ID, theOtherCountryCode: 840
        }
        const { wrapper, dialog } = await mountCompanyEditor(false)
        expect(mockItem.value.companyId).toBe(companyId)
        expect(mockItem.value.recipientId).toBe(companyId)
        expect(mockItem.value.senderId).toBe(OZON_COMPANY_ID)

        dialog.vm.handleProcedureChange({ target: { value: String(CUSTOMS_PROCEDURE_EXPORT) } })
        await nextTick()
        expect(mockItem.value.companyId).toBe(companyId)
        expect(mockItem.value.senderId).toBe(companyId)
        expect(mockItem.value.recipientId).toBe(OZON_COMPANY_ID)

        mockItem.value.theOtherCompanyId = WBR_COMPANY_ID
        mockItem.value.theOtherCountryCode = 156
        await nextTick()
        expect(mockItem.value.companyId).toBe(companyId)
        expect(mockItem.value.senderId).toBe(companyId)
        expect(mockItem.value.recipientId).toBe(WBR_COMPANY_ID)
        expect(mockItem.value.destCountryCode).toBe(156)

        dialog.vm.handleProcedureChange({ target: { value: String(CUSTOMS_PROCEDURE_GTC_IMPORT) } })
        await nextTick()
        expect(mockItem.value.companyId).toBe(companyId)
        expect(mockItem.value.recipientId).toBe(companyId)
        expect(mockItem.value.senderId).toBe(WBR_COMPANY_ID)
        wrapper.unmount()
      }
    )

    it.each([
      [WBRN_REGISTER_ID, WBR_COMPANY_ID],
      [undefined, null]
    ])('selects the company from explicit type %s only for new registers', async (registerType, companyId) => {
      mockItem.value = {
        ...baseRegisterItem, registerType, companyId: GTC_COMPANY_ID,
        customsProcedureCode: CUSTOMS_PROCEDURE_EXPORT
      }
      const { wrapper } = await mountCompanyEditor(true)
      expect(mockItem.value.companyId).toBe(companyId)
      expect(mockItem.value.senderId).toBe(companyId)
      wrapper.unmount()
    })
  })

  describe('restriction confirmation during save', () => {
    async function mountEditor(create = false) {
      const Parent = {
        template: `<Suspense><RegisterEditDialog :id="1" :create="${create}" /></Suspense>`,
        components: { RegisterEditDialog }
      }
      const wrapper = mount(Parent, { global: { stubs: {
        ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub
      } } })
      await resolveAll()
      return { wrapper, dialog: wrapper.findComponent(RegisterEditDialog) }
    }
    function challenge(token = 'first') {
      const msg = 'При изменении страны назначения будут очищены все результаты проверок по стоп-словам и кодам ТН ВЭД для таможенной процедуры Импорт, Узбекистан.'
      return Object.assign(new Error(msg), { status: 409, data: {
        msg, errors: {}, code: 'RegisterRestrictionChangeConfirmationRequired',
        details: { confirmationToken: token, changeKind: 'counterpartCountry' }
      } })
    }

    it('confirms, locks the form, blocks duplicate submits and preserves the submitted payload', async () => {
      const { wrapper, dialog } = await mountEditor()
      const pending = createDeferred()
      update.mockRejectedValueOnce(challenge())
      restrictionConfirm.mockReturnValueOnce(pending.promise)
      const saving = dialog.vm.onSubmit({ invoiceNumber: 'entered', theOtherCountryCode: 840 }, { setErrors: vi.fn() })
      await resolveAll()
      expect(restrictionConfirm).toHaveBeenCalledWith(expect.objectContaining({ content: challenge().data.msg }))
      expect(wrapper.find('.form-section').attributes()).toHaveProperty('inert')
      await dialog.vm.onSubmit({ invoiceNumber: 'second' })
      expect(update).toHaveBeenCalledTimes(1)
      expect(router.push).not.toHaveBeenCalled()
      pending.resolve(true)
      await saving
      expect(update).toHaveBeenCalledTimes(2)
      expect(update.mock.calls[1]).toEqual([1, { ...update.mock.calls[0][1], restrictionChangeConfirmationToken: 'first' }])
      expect(router.push).toHaveBeenCalledExactlyOnceWith('/registers?mode=modePaperwork')
      expect(useAlertStore().alert).toBeNull()
      wrapper.unmount()
    })

    it('cancels without navigating or changing entered values, then saves on a fresh attempt', async () => {
      const { wrapper, dialog } = await mountEditor()
      mockItem.value.invoiceNumber = 'keep me'
      update.mockRejectedValueOnce(challenge())
      restrictionConfirm.mockResolvedValueOnce(false)
      await dialog.vm.onSubmit({ invoiceNumber: 'keep me', theOtherCountryCode: 840 })
      expect(update).toHaveBeenCalledTimes(1)
      expect(router.push).not.toHaveBeenCalled()
      expect(mockItem.value.invoiceNumber).toBe('keep me')
      expect(wrapper.find('.form-section').attributes()).not.toHaveProperty('inert')
      await dialog.vm.onSubmit({ invoiceNumber: 'keep me', theOtherCountryCode: 840 })
      expect(update.mock.calls[1][1]).not.toHaveProperty('restrictionChangeConfirmationToken')
      expect(router.push).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

  })

  describe('restoration upload and recovery', () => {
    async function mountUploadEditor(create = true, id = 1) {
      const wrapper = mount({
        components: { RegisterEditDialog },
        template: `<Suspense><RegisterEditDialog :create="${create}" :id="${id}" /></Suspense>`
      }, { global: { stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub, ErrorDialog: ErrorDialogStub } } })
      await resolveAll()
      return { wrapper, dialog: wrapper.findComponent(RegisterEditDialog) }
    }

    it('defaults restoration on and remembers opt-out across procedure changes and refreshes', async () => {
      mockOps.value.customsProcedures.push({ value: 60, name: 'Реимпорт', isRe: true, isExport: false, isGtc: false })
      mockItem.value = { ...baseRegisterItem, customsProcedureCode: 60 }
      const { wrapper, dialog } = await mountUploadEditor()
      expect(wrapper.get('#transfer2Re').element.checked).toBe(true)
      await wrapper.get('#transfer2Re').setValue(false)
      dialog.vm.handleProcedureChange({ target: { value: '10' } }, vi.fn(), vi.fn())
      await resolveAll()
      expect(wrapper.get('#transfer2Re').element.disabled).toBe(true)
      dialog.vm.handleProcedureChange({ target: { value: '60' } }, vi.fn(), vi.fn())
      mockOps.value = { ...mockOps.value }
      await resolveAll()
      expect(wrapper.get('#transfer2Re').element.checked).toBe(false)
      await dialog.vm.onSubmit({ checkForDuplicates: false }, { setErrors: vi.fn() })
      expect(upload.mock.calls[0][4]).toBe(false)
    })

    it.each(['fails', 'is declined'])('keeps blank weight valid when metadata saving %s and retries without re-upload', async (outcome) => {
      const visibleErrorDialog = {
        props: ['show', 'message'],
        emits: ['close'],
        template: `<div v-if="show" data-testid="recovery-error">{{ message }}<button type="button" @click="$emit('close')">Закрыть</button></div>`
      }
      async function mountRealEditor(create, id) {
        const wrapper = mount({
          components: { RegisterEditDialog },
          template: `<Suspense><RegisterEditDialog :create="${create}" :id="${id}" /></Suspense>`
        }, { global: { stubs: { ...defaultGlobalStubs, ErrorDialog: visibleErrorDialog } } })
        await resolveAll()
        return wrapper
      }
      const error = new Error('Не удалось сохранить данные')
      if (outcome === 'is declined') {
        Object.assign(error, { status: 409, data: {
          msg: 'При изменении страны будут очищены результаты проверок',
          errors: {}, code: 'RegisterRestrictionChangeConfirmationRequired',
          details: { confirmationToken: 'confirmation', changeKind: 'counterpartCountry' }
        } })
        restrictionConfirm.mockResolvedValueOnce(false)
      }
      update.mockRejectedValueOnce(error)
      const creation = await mountRealEditor(true, 1)
      await creation.get('#invoiceNumber').setValue('KEEP-ME')
      await creation.get('form').trigger('submit')
      await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1))
      expect(update).toHaveBeenCalledWith(42, expect.objectContaining({ realWeightKg: 0 }))
      if (outcome === 'fails') {
        await vi.waitFor(() => expect(creation.find('[data-testid="recovery-error"]').exists()).toBe(true))
        expect(creation.get('[data-testid="recovery-error"]').text()).toContain('Не удалось сохранить данные')
        expect(router.push).not.toHaveBeenCalled()
        await creation.get('[data-testid="recovery-error"] button').trigger('click')
      }
      await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/register/edit/42?mode=modePaperwork'))
      creation.unmount()
      getById.mockImplementationOnce(async () => {
        mockItem.value = { ...baseRegisterItem, id: 42, realWeightKg: null }
      })
      const recovery = await mountRealEditor(false, 42)
      expect(recovery.get('#realWeightKg').element.value).toBe('')
      expect(recovery.get('#invoiceNumber').element.value).toBe('KEEP-ME')
      router.push.mockClear()
      await recovery.get('form').trigger('submit')
      await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(2))
      expect(update).toHaveBeenLastCalledWith(42, expect.objectContaining({ realWeightKg: 0 }))
      expect(upload).toHaveBeenCalledTimes(1)
      await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith('/registers?mode=modePaperwork'))
      expect(getRegisterUploadDraft(42)).toBeNull()
    })

    it('restores a Yup-cast invoice date into the real date field', async () => {
      const submitted = await Yup.object({ invoiceDate: Yup.date() }).validate({ invoiceDate: '2026-07-21' })
      expect(submitted.invoiceDate).toBeInstanceOf(Date)
      rememberRegisterUploadDraft(42, submitted)
      getById.mockImplementationOnce(async () => {
        mockItem.value = { ...baseRegisterItem, id: 42, invoiceDate: '2020-01-01' }
      })
      const wrapper = mount({
        components: { RegisterEditDialog },
        template: '<Suspense><RegisterEditDialog :create="false" :id="42" /></Suspense>'
      }, { global: { stubs: { ...defaultGlobalStubs, ErrorDialog: ErrorDialogStub } } })
      await resolveAll()
      expect(wrapper.get('#invoiceDate').element.value).toBe('2026-07-21')
      expect(wrapper.findComponent(RegisterEditDialog).vm.item.invoiceDate).toBe('2026-07-21')
    })

    it('discards only the current register draft when cancelling', async () => {
      rememberRegisterUploadDraft(1, { invoiceNumber: 'discard' })
      rememberRegisterUploadDraft(42, { invoiceNumber: 'other' })
      const { dialog } = await mountUploadEditor(false)
      await dialog.vm.cancelEditing()
      expect(getRegisterUploadDraft(1)).toBeNull()
      expect(getRegisterUploadDraft(42).invoiceNumber).toBe('other')
    })
  })

})
