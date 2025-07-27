/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegisterEditDialog from '@/components/Register_EditDialog.vue'
import { defaultGlobalStubs, createMockStore } from './test-utils.js'
import { resolveAll } from './helpers/test-utils'

const mockItem = ref({ id: 1, fileName: 'r.csv', companyId: 2 })
const getById = vi.fn(() => Promise.resolve())
const update = vi.fn(() => Promise.resolve())

const registersStore = createMockStore({ item: mockItem, getById, update })
const countriesStore = createMockStore({ countries: ref([]), ensureLoaded: vi.fn() })
const transStore = createMockStore({ types: ref([]), ensureLoaded: vi.fn() })
const procStore = createMockStore({ procedures: ref([]), ensureLoaded: vi.fn() })

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store === registersStore) return { item: mockItem }
      if (store === countriesStore) return { countries: countriesStore.countries }
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
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))

describe('Register_EditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls stores on mount and renders fields', async () => {
    const Parent = {
      template: '<Suspense><RegisterEditDialog :id="1" /></Suspense>',
      components: { RegisterEditDialog }
    }
    const wrapper = mount(Parent, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: { template: '<form><slot :errors="{}" :isSubmitting="false" /></form>' },
          Field: { template: '<input :id="id" />', props: ['name', 'id', 'type', 'as'] }
        }
      }
    })
    await resolveAll()
    expect(getById).toHaveBeenCalledWith(1)
    expect(countriesStore.ensureLoaded).toHaveBeenCalled()
    expect(transStore.ensureLoaded).toHaveBeenCalled()
    expect(procStore.ensureLoaded).toHaveBeenCalled()
    expect(wrapper.find('#destCountryCode').exists()).toBe(true)
    expect(wrapper.find('#invoiceNumber').exists()).toBe(true)
  })
})
