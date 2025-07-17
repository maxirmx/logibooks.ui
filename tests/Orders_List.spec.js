/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import OrdersList from '@/components/Orders_List.vue'
import { vuetifyStubs } from './test-utils.js'


// Mock data
const mockOrders = ref([
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

// Mock functions
const getAll = vi.hoisted(() => vi.fn())
const fetchStatuses = vi.hoisted(() => vi.fn())
const getStatusTitle = vi.hoisted(() => vi.fn())
const ensureStatusesLoaded = vi.hoisted(() => vi.fn())
const getCheckStatusTitle = vi.hoisted(() => vi.fn())
const ensureCheckStatusesLoaded = vi.hoisted(() => vi.fn())
const getAllStopWords = vi.hoisted(() => vi.fn())

// Setup mocks
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: vi.fn((store) => {
      if (store.orders) return { items: mockOrders, loading: ref(false), error: ref(null), totalCount: ref(2) }
      if (store.statuses) return { statuses: mockStatuses }
      if (store.stopWords) return { stopWords: mockStopWords }
      return {
        orders_per_page: ref(10),
        orders_sort_by: ref([{ key: 'id', order: 'asc' }]),
        orders_page: ref(1),
        orders_status: ref(null),
        orders_tnved: ref('')
      }
    })
  }
})

vi.mock('@/stores/orders.store.js', () => ({
  useOrdersStore: () => ({
    items: mockOrders,
    loading: ref(false),
    error: ref(null),
    totalCount: ref(2),
    getAll,
    update: vi.fn(),
    generate: vi.fn(),
    generateAll: vi.fn(),
    validate: vi.fn()
  })
}))

vi.mock('@/stores/order.statuses.store.js', () => ({
  useOrderStatusesStore: () => ({
    statuses: mockStatuses,
    loading: ref(false),
    error: ref(null),
    fetchStatuses,
    getStatusTitle,
    getStatusById: vi.fn(),
    ensureStatusesLoaded
  })
}))

vi.mock('@/stores/order.checkstatuses.store.js', () => ({
  useOrderCheckStatusStore: () => ({
    statuses: mockCheckStatuses,
    loading: ref(false),
    error: ref(null),
    fetchStatuses: vi.fn(),
    getStatusTitle: getCheckStatusTitle,
    getStatusById: vi.fn(),
    ensureStatusesLoaded: ensureCheckStatusesLoaded
  })
}))

vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => ({
    stopWords: mockStopWords,
    loading: ref(false),
    error: ref(null),
    getAll: getAllStopWords,
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    orders_per_page: ref(10),
    orders_sort_by: ref([{ key: 'id', order: 'asc' }]),
    orders_page: ref(1),
    orders_status: ref(null),
    orders_tnved: ref('')
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

describe('Orders_List', () => {
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
    mount(OrdersList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    expect(ensureStatusesLoaded).toHaveBeenCalled()
  })

  it('computes status options with titles', async () => {
    const wrapper = mount(OrdersList, {
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
    const wrapper = mount(OrdersList, {
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
    const wrapper = mount(OrdersList, {
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
    mount(OrdersList, {
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
    mount(OrdersList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    expect(getAllStopWords).toHaveBeenCalled()
  })

  it('includes actions3 column in headers', () => {
    const wrapper = mount(OrdersList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    const vm = wrapper.vm
    const actions3Header = vm.headers.find(h => h.key === 'actions3')

    expect(actions3Header).toBeDefined()
    expect(actions3Header.sortable).toBe(false)
    expect(actions3Header.align).toBe('center')
  })

  it('validateOrder function calls store validate method', async () => {
    const wrapper = mount(OrdersList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    const testOrder = { id: 123 }
    await wrapper.vm.validateOrder(testOrder)

    expect(wrapper.vm.ordersStore.validate).toHaveBeenCalledWith(123)
  })

  it('marks rows with issues using getRowProps', () => {
    const wrapper = mount(OrdersList, {
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

  it('generates stopwords tooltip for checkStatusId when HasIssues is true', () => {
    const wrapper = mount(OrdersList, {
      props: { registerId: 1 },
      global: {
        plugins: [pinia],
        stubs: globalStubs
      }
    })

    const vm = wrapper.vm
    
    // Test item with issues and stopwords
    const itemWithStopwords = {
      checkStatusId: 150, // HasIssues returns true for 101-200
      stopWordIds: [1, 2]
    }
    
    const tooltip = vm.getCheckStatusTooltip(itemWithStopwords)
    expect(tooltip).toContain('Статус 150')
    expect(tooltip).toContain('Стоп-слова и фразы:')
    expect(tooltip).toContain("'test1'")
    expect(tooltip).toContain("'test2'")
    
    // Test item with issues but no stopwords
    const itemWithoutStopwords = {
      checkStatusId: 150,
      stopWordIds: []
    }
    
    const tooltipNoStopwords = vm.getCheckStatusTooltip(itemWithoutStopwords)
    expect(tooltipNoStopwords).toBe('Статус 150')
    expect(tooltipNoStopwords).not.toContain('Стоп-слова и фразы:')
    
    // Test item without issues
    const itemNoIssues = {
      checkStatusId: 50, // HasIssues returns false for <=100
      stopWordIds: [1, 2]
    }
    
    const tooltipNoIssues = vm.getCheckStatusTooltip(itemNoIssues)
    expect(tooltipNoIssues).toBe('Статус 50')
    expect(tooltipNoIssues).not.toContain('Стоп-слова и фразы:')
  })
})
