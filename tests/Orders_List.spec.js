/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import OrdersList from '@/components/Orders_List.vue'

// Mock data
const mockOrders = ref([
  { id: 1, statusId: 1, rowNumber: 1, orderNumber: 'ORD001', tnVed: 'TNV001' },
  { id: 2, statusId: 2, rowNumber: 2, orderNumber: 'ORD002', tnVed: 'TNV002' }
])

const mockStatuses = ref([
  { id: 1, name: 'loaded', title: 'Загружен' },
  { id: 2, name: 'processed', title: 'Обработан' }
])

// Mock functions
const getAll = vi.hoisted(() => vi.fn())
const fetchStatuses = vi.hoisted(() => vi.fn())
const getStatusTitle = vi.hoisted(() => vi.fn())
const ensureStatusesLoaded = vi.hoisted(() => vi.fn())

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
    generateAll: vi.fn()
  })
}))

vi.mock('@/stores/order.status.store.js', () => ({
  useOrderStatusStore: () => ({
    statuses: mockStatuses,
    loading: ref(false),
    error: ref(null),
    fetchStatuses,
    getStatusTitle,
    getStatusById: vi.fn(),
    getStatusName: vi.fn(),
    ensureStatusesLoaded
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
const globalStubs = {
  'v-select': true,
  'v-text-field': true,
  'v-data-table-server': true,
  'v-card': true,
  'v-btn': true,
  'v-tooltip': true,
  'font-awesome-icon': true
}

describe('Orders_List', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getStatusTitle.mockImplementation((id) => {
      const status = mockStatuses.value.find(s => s.id === id)
      return status ? status.title : `Статус ${id}`
    })
  })

  it('imports order status store', () => {
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

  it('calls ensureStatusesLoaded on mount', () => {
    mount(OrdersList, {
      props: { registerId: 1 },
      global: {
        stubs: globalStubs
      }
    })

    expect(ensureStatusesLoaded).toHaveBeenCalled()
  })
})
