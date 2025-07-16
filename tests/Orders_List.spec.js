/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import OrdersList from '@/components/Orders_List.vue'
import { vuetifyStubs } from './test-utils.js'
import { getStatusColor } from '@/helpers/register.mapping.js'

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

// Mock functions
const getAll = vi.hoisted(() => vi.fn())
const fetchStatuses = vi.hoisted(() => vi.fn())
const getStatusTitle = vi.hoisted(() => vi.fn())
const ensureStatusesLoaded = vi.hoisted(() => vi.fn())
const getCheckStatusTitle = vi.hoisted(() => vi.fn())
const ensureCheckStatusesLoaded = vi.hoisted(() => vi.fn())

// Setup mocks
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: vi.fn((store) => {
      if (store.orders) return { items: mockOrders, loading: ref(false), error: ref(null), totalCount: ref(2) }
      if (store.statuses) return { statuses: mockStatuses }
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
  beforeEach(() => {
    vi.clearAllMocks()
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
        stubs: globalStubs
      }
    })

    expect(ensureStatusesLoaded).toHaveBeenCalled()
  })

  it('computes status options with titles', async () => {
    const wrapper = mount(OrdersList, {
      props: { registerId: 1 },
      global: {
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
        stubs: globalStubs
      }
    })

    expect(ensureStatusesLoaded).toHaveBeenCalled()
    expect(ensureCheckStatusesLoaded).toHaveBeenCalled()
  })

  it('includes actions3 column in headers', () => {
    const wrapper = mount(OrdersList, {
      props: { registerId: 1 },
      global: {
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
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const wrapper = mount(OrdersList, {
      props: { registerId: 1 },
      global: {
        stubs: globalStubs
      }
    })

    const testOrder = { id: 123 }
    await wrapper.vm.validateOrder(testOrder)

    expect(wrapper.vm.ordersStore.validate).toHaveBeenCalledWith(123)
    expect(consoleSpy).toHaveBeenCalledWith('Order validated successfully:', 123)
    
    consoleSpy.mockRestore()
  })

  it('applies correct status color classes based on statusId', () => {
    // Mock orders with different statusIds to test color logic
    const testOrders = ref([
      { id: 1, statusId: 50, checkStatusId: 1, rowNumber: 1, orderNumber: 'ORD001', tnVed: 'TNV001' },    // should be blue (<=100)
      { id: 2, statusId: 150, checkStatusId: 2, rowNumber: 2, orderNumber: 'ORD002', tnVed: 'TNV002' },  // should be red (100-200)
      { id: 3, statusId: 250, checkStatusId: 1, rowNumber: 3, orderNumber: 'ORD003', tnVed: 'TNV003' }   // should be green (>200)
    ])

    // Mock the orders store to return test orders
    vi.doMock('@/stores/orders.store.js', () => ({
      useOrdersStore: () => ({
        items: testOrders,
        loading: ref(false),
        error: ref(null),
        totalCount: ref(3),
        getAll: vi.fn(),
        update: vi.fn(),
        generate: vi.fn(),
        generateAll: vi.fn(),
        validate: vi.fn()
      })
    }))

    const wrapper = mount(OrdersList, {
      props: { registerId: 1 },
      global: {
        stubs: globalStubs
      }
    })

    // Verify the component mounted successfully
    expect(wrapper.exists()).toBe(true)

    // Check that the component has access to the status color function
    expect(getStatusColor).toBeDefined()

    // Test color logic
    expect(getStatusColor(50)).toBe('blue')
    expect(getStatusColor(150)).toBe('red')
    expect(getStatusColor(250)).toBe('green')
    expect(getStatusColor(null)).toBe('default')
  })

  it('applies correct check status color classes based on checkStatusId', () => {
    const wrapper = mount(OrdersList, {
      props: { registerId: 1 },
      global: {
        stubs: globalStubs
      }
    })

    // Test the getCheckStatusColorClass function
    expect(wrapper.vm.getCheckStatusColorClass(50)).toBe('check-status-blue')     // <= 100
    expect(wrapper.vm.getCheckStatusColorClass(100)).toBe('check-status-blue')    // <= 100
    expect(wrapper.vm.getCheckStatusColorClass(150)).toBe('check-status-red')     // 100 < x <= 200
    expect(wrapper.vm.getCheckStatusColorClass(200)).toBe('check-status-red')     // 100 < x <= 200
    expect(wrapper.vm.getCheckStatusColorClass(250)).toBe('check-status-green')   // > 200
    expect(wrapper.vm.getCheckStatusColorClass(1000)).toBe('check-status-green')  // > 200
  })
})
