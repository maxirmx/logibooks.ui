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

// No need to mock vuetify-use-dialog anymore since we use custom ErrorDialog

const mockItem = ref({
  id: 1,
  fileName: 'r.csv',
  companyId: 2,
  dealNumber: 'D1',
  customsProcedureId: 1,
  theOtherCompanyId: null,
  theOtherCountryCode: null,
  date: '2024-01-01'
})
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
  types: [{ id: 1, name: 'Авто' }],
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
vi.mock('@/router', () => ({ default: { push: vi.fn(() => Promise.resolve()) } }))

// Simple stubs for vee-validate components
const FormStub = {
  name: 'Form',
  template: '<form><slot :errors="{}" :isSubmitting="false" :values="{}" /></form>'
}
const FieldStub = {
  name: 'Field',
  props: ['name', 'id', 'type', 'as', 'readonly', 'disabled'],
  template: `
    <input :id="id || name" :type="type" :readonly="readonly" :disabled="disabled" v-if="as !== 'select'" />
    <select :id="id || name" :disabled="disabled" v-else><slot /></select>
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
    registerItems.value = []
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
    expect(wrapper.find('#invoiceNumber').exists()).toBe(true)
    expect(wrapper.find('#customsProcedureId').exists()).toBe(true)
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

  it('handles create mode with upload', async () => {
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockItem.value = { fileName: 'test.xlsx', companyId: 2 }
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
    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, null)
    expect(router.push).toHaveBeenCalledWith('/registers')
  })

  it('renders transfer register selector with generated names', async () => {
    registerItems.value = [
      { id: 10, dealNumber: 'D-100', fileName: 'reg-100.xlsx' },
      { id: 11, dealNumber: '', fileName: 'reg-empty.xlsx' }
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
      { id: 20, dealNumber: 'D-200', fileName: 'reg-200.xlsx' }
    ]
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockItem.value = { fileName: 'test.xlsx', companyId: 3 }

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

    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, 20)
  })

  it('handles create mode with upload result object', async () => {
  upload.mockResolvedValueOnce({ success: true, registerId: 42, ErrMsg: '' })
    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockItem.value = { fileName: 'test.xlsx', companyId: 2 }
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
    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, null)
    
    // Verify update was called with the Id from the Reference object and the form values
    expect(update).toHaveBeenCalledWith(42, formValues)
    
    // Verify navigation occurred
    expect(router.push).toHaveBeenCalledWith('/registers')
  })

  it('shows action dialog while upload is in progress', async () => {
    const deferred = createDeferred()
    upload.mockReturnValueOnce(deferred.promise)
    registersStore.uploadFile.value = new File(['data'], 'upload.xlsx')
    mockItem.value = { fileName: 'upload.xlsx', companyId: 5 }

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
  it('handles errors in create mode with Reference object', async () => {
    // Mock upload success but update failure
  upload.mockResolvedValueOnce({ success: true, Success: true, registerId: 42, ErrMsg: '' })
    update.mockRejectedValueOnce(new Error('Update failed'))

    registersStore.uploadFile.value = new File(['data'], 'test.xlsx')
    mockItem.value = { fileName: 'test.xlsx', companyId: 2 }
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
    expect(upload).toHaveBeenCalledWith(registersStore.uploadFile.value, mockItem.value.companyId, null)
    

    // Update may be attempted; ensure at least the upload was triggered and the dialog flow completed
    // Verify navigation occurred (error dialog closes then navigation)
    expect(router.push).toHaveBeenCalledWith('/registers')

    expect(dialog.vm.actionDialogState.show).toBe(false)
  })
})

