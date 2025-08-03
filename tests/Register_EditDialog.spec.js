/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import RegisterEditDialog from '@/components/Register_EditDialog.vue'
import { defaultGlobalStubs, createMockStore } from './test-utils.js'
import { resolveAll } from './helpers/test-utils'

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

const registersStore = createMockStore({ item: mockItem, getById, update })
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
      if (store === registersStore) return { item: mockItem }
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
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

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

function getGroupByLabel(wrapper, text) {
  return wrapper
    .findAll('.form-group')
    .find((g) => g.find('label').text().includes(text))
}

describe('Register_EditDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads data and renders fields', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub }
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
      template: '<Suspense><RegisterEditDialog :id="1" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: { ...defaultGlobalStubs, Form: FormStub, Field: FieldStub }
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
})
