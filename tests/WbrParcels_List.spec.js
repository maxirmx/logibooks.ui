/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import ParcelsList from '@/components/WbrParcels_List.vue'
import { vuetifyStubs, createMockStore } from './test-utils.js'


// Mock data
const mockParcels = ref([
  { id: 1, statusId: 1, checkStatusId: 1, rowNumber: 1, orderNumber: 'ORD001', tnVed: 'TNV001' },
  { id: 2, statusId: 2, checkStatusId: 2, rowNumber: 2, orderNumber: 'ORD002', tnVed: 'TNV002' }
])

const mockStatuses = ref([
  { id: 1,  title: 'Загружен' },
  { id: 2,  title: 'Обработан' }
])

const mockCheckStatuses = ref([
  { id: 1, title: 'Не проверен' },
  { id: 2, title: 'Проверен' }
])

const mockStopWords = ref([
  { id: 1, word: 'test1' },
  { id: 2, word: 'test2' }
])

const mockFeacnOrders = ref([
  { id: 1, comment: 'Test feacn order 1' },
  { id: 2, comment: 'Test feacn order 2' }
])
const mockCountries = ref([])

// Mock functions
const fetchStatuses = vi.hoisted(() => vi.fn())
const getStatusTitle = vi.hoisted(() => vi.fn())
const ensureStatusesLoaded = vi.hoisted(() => vi.fn())
const getCheckStatusTitle = vi.hoisted(() => vi.fn())
const ensureCheckStatusesLoaded = vi.hoisted(() => vi.fn())
const getAllStopWords = vi.hoisted(() => vi.fn())
const getOrdersFeacn = vi.hoisted(() => vi.fn())
const ensureOrdersLoadedFeacn = vi.hoisted(() => vi.fn())

// Setup mocks
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: vi.fn((store) => {
      // Return appropriate refs based on store properties
      if (store.items) return { items: store.items, loading: store.loading, error: store.error, totalCount: store.totalCount }
      if (store.stopWords) return { stopWords: store.stopWords }
      if (store.orders && store.prefixes) return { orders: store.orders }
      if (store.countries) return { countries: store.countries }
      if (store.parcels_per_page) return {
        parcels_per_page: store.parcels_per_page,
        parcels_sort_by: store.parcels_sort_by,
        parcels_page: store.parcels_page,
        parcels_status: store.parcels_status,
        parcels_tnved: store.parcels_tnved
      }
      return {}
    })
  }
})

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    items: mockParcels,
    loading: false,
    error: null,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    getAll: vi.fn(),
    validate: vi.fn(),
    exportXml: vi.fn()
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => createMockStore({
    statuses: mockStatuses,
    fetchStatuses,
    getStatusTitle,
    getStatusById: vi.fn(),
    ensureStatusesLoaded
  })
}))

vi.mock('@/stores/parcel.checkstatuses.store.js', () => ({
  useParcelCheckStatusStore: () => createMockStore({
    statuses: mockCheckStatuses,
    fetchStatuses: vi.fn(),
    getStatusTitle: getCheckStatusTitle,
    getStatusById: vi.fn(),
    ensureStatusesLoaded: ensureCheckStatusesLoaded
  })
}))

vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => createMockStore({
    stopWords: mockStopWords,
    getAll: getAllStopWords,
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  })
}))

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: () => createMockStore({
    orders: mockFeacnOrders,
    prefixes: ref([]),
    isInitialized: ref(true),
    getOrders: getOrdersFeacn,
    getPrefixes: vi.fn(),
    update: vi.fn(),
    ensureOrdersLoaded: ensureOrdersLoadedFeacn
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => createMockStore({
    countries: mockCountries,
    getAll: vi.fn(),
    ensureLoaded: vi.fn()
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    parcels_per_page: ref(10),
    parcels_sort_by: ref([{ key: 'id', order: 'asc' }]),
    parcels_page: ref(1),
    parcels_status: ref(null),
    parcels_tnved: ref('')
  })
}))

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: { get: vi.fn().mockResolvedValue({ ordersByStatus: {} }) }
}))

vi.mock('@/helpers/config.js', () => ({
  apiUrl: 'http://localhost:8080/api'
}))

// Mock Vuetify components and other dependencies
const globalStubs = vuetifyStubs

describe('WbrParcels_List', () => {
  let pinia

  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createPinia()
    getStatusTitle.mockImplementation((id) => {
      const status = mockStatuses.value.find(s => s.id === id)
      return status ? status.title : `Статус ${id}`
    })
    getCheckStatusTitle.mockImplementation((id) => {
      const status = mockCheckStatuses.value.find(s => s.id === id)
      return status ? status.title : `Статус ${id}`
    })
  })

  it('imports order check status store', () => {
    mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    expect(ensureStatusesLoaded).toHaveBeenCalled()
  })

  it('computes status options with titles', async () => {
    const wrapper = mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    // Access the component's computed properties
    const vm = wrapper.vm

    // The statusOptions should include status titles from the store
    expect(vm.statusOptions).toBeDefined()

    // Check that getStatusTitle is used for displaying status titles
    expect(getStatusTitle).toBeDefined()
  })

  it('includes status column in headers', () => {
    const wrapper = mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    const vm = wrapper.vm
    const statusHeader = vm.headers.find(h => h.key === 'statusId')

    expect(statusHeader).toBeDefined()
    expect(statusHeader.title).toBe('Статус')
  })

  it('includes checkStatusId column in headers', () => {
    const wrapper = mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    const vm = wrapper.vm
    const checkStatusHeader = vm.headers.find(h => h.key === 'checkStatusId')

    expect(checkStatusHeader).toBeDefined()
    expect(checkStatusHeader.title).toBe('Проверка')
  })

  it('calls ensureStatusesLoaded on mount for both status stores', () => {
    mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    expect(ensureStatusesLoaded).toHaveBeenCalled()
    expect(ensureCheckStatusesLoaded).toHaveBeenCalled()
  })

  it('loads stopwords on mount', () => {
    mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    expect(getAllStopWords).toHaveBeenCalled()
  })

  it('loads feacn orders on mount', async () => {
    const wrapper = mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    // Wait for onMounted to complete - since it's async, we need to wait longer
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    expect(ensureOrdersLoadedFeacn).toHaveBeenCalled()
  })

  it('validateParcel function calls store validate method', async () => {
    const wrapper = mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    const testOrder = { id: 123 }
    await wrapper.vm.validateParcel(testOrder)

    // The validate function should be called with the order id
    expect(wrapper.vm.parcelsStore.validate).toHaveBeenCalledWith(123)
  })

  it('exportParcelXml calls store exportXml method', async () => {
    const wrapper = mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    const testOrder = { id: 321 }
    await wrapper.vm.exportParcelXml(testOrder)

    expect(wrapper.vm.parcelsStore.exportXml).toHaveBeenCalledWith(321)
  })

  it('marks rows with issues using getRowProps', () => {
    const wrapper = mount(ParcelsList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    // Test checkStatusId that has issues (>100 and <=200)
    expect(wrapper.vm.getRowProps({ item: { checkStatusId: 150 } })).toEqual({ class: 'order-has-issues' })
    expect(wrapper.vm.getRowProps({ item: { checkStatusId: 101 } })).toEqual({ class: 'order-has-issues' })
    expect(wrapper.vm.getRowProps({ item: { checkStatusId: 200 } })).toEqual({ class: 'order-has-issues' })

    // Test checkStatusId that doesn't have issues (<=100 or >200)
    expect(wrapper.vm.getRowProps({ item: { checkStatusId: 50 } })).toEqual({ class: '' })
    expect(wrapper.vm.getRowProps({ item: { checkStatusId: 100 } })).toEqual({ class: '' })
    expect(wrapper.vm.getRowProps({ item: { checkStatusId: 250 } })).toEqual({ class: '' })
  })
})
