/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegistersList from '@/components/Registers_List.vue'

const mockItems = ref([])
const mockCompanies = ref([])
const getAll = vi.fn()
const uploadFn = vi.fn()
const getCompaniesAll = vi.fn()

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { 
    ...actual, 
    storeToRefs: (store) => {
      if (store.getAll && store.upload && store.setOrderStatuses) {
        // registers store
        return { items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0) }
      } else if (store.getAll && !store.upload && store.companies) {
        // companies store
        return { companies: mockCompanies }
      } else {
        // auth store or other stores - return safe defaults
        return { 
          registers_per_page: ref(10), 
          registers_search: ref(''), 
          registers_sort_by: ref([{ key: 'id', order: 'asc' }]), 
          registers_page: ref(1) 
        }
      }
    }
  }
})

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({ getAll, upload: uploadFn, setOrderStatuses: vi.fn(), items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0) })
}))

vi.mock('@/stores/orders.store.js', () => ({
  useOrdersStore: () => ({ generateAll: vi.fn() })
}))

vi.mock('@/stores/order.statuses.store.js', () => ({
  useOrderStatusesStore: () => ({ getAll: vi.fn(), orderStatuses: ref([]) })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({ getAll: getCompaniesAll, companies: mockCompanies })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ success: vi.fn(), error: vi.fn() })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({ 
    registers_per_page: ref(10), 
    registers_search: ref(''), 
    registers_sort_by: ref([{ key: 'id', order: 'asc' }]), 
    registers_page: ref(1) 
  })
}))

vi.mock('@/helpers/items.per.page.js', () => ({
  itemsPerPageOptions: [{ value: 10, title: '10' }]
}))

vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

describe('Registers_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = []
    mockCompanies.value = []
  })

  it('calls getAll on mount for both registers and companies', () => {
    mount(RegistersList, {
      global: {
        stubs: {
          'v-data-table-server': true,
          'v-card': true,
          'v-text-field': true,
          'font-awesome-icon': true,
          'v-file-input': true
        }
      }
    })
    expect(getAll).toHaveBeenCalled()
    expect(getCompaniesAll).toHaveBeenCalled()
  })

  describe('getCustomerName function', () => {
    let wrapper

    beforeEach(() => {
      // Set up mock companies data
      mockCompanies.value = [
        { id: 1, name: 'ООО "РВБ"', shortName: 'РВБ' },
        { id: 2, name: 'ООО "Интернет решения"', shortName: null },
        { id: 3, name: 'ООО "Длинное название компании"', shortName: '' }
      ]

      wrapper = mount(RegistersList, {
        global: {
          stubs: {
            'v-data-table-server': true,
            'v-card': true,
            'v-text-field': true,
            'font-awesome-icon': true,
            'v-file-input': true
          }
        }
      })
    })

    it('returns shortName when available', () => {
      const customerName = wrapper.vm.getCustomerName(1)
      expect(customerName).toBe('РВБ')
    })

    it('returns name when shortName is null', () => {
      const customerName = wrapper.vm.getCustomerName(2)
      expect(customerName).toBe('ООО "Интернет решения"')
    })

    it('returns name when shortName is empty string', () => {
      const customerName = wrapper.vm.getCustomerName(3)
      expect(customerName).toBe('ООО "Длинное название компании"')
    })

    it('returns "Неизвестно" for non-existent customer ID', () => {
      const customerName = wrapper.vm.getCustomerName(999)
      expect(customerName).toBe('Неизвестно')
    })

    it('returns "Неизвестно" for null customer ID', () => {
      const customerName = wrapper.vm.getCustomerName(null)
      expect(customerName).toBe('Неизвестно')
    })

    it('returns "Неизвестно" for undefined customer ID', () => {
      const customerName = wrapper.vm.getCustomerName(undefined)
      expect(customerName).toBe('Неизвестно')
    })

    it('returns "Неизвестно" when companies array is empty', () => {
      mockCompanies.value = []
      const customerName = wrapper.vm.getCustomerName(1)
      expect(customerName).toBe('Неизвестно')
    })
  })

  describe('component integration', () => {
    it('displays customer names correctly when items and companies are present', async () => {
      // Set up mock companies
      mockCompanies.value = [
        { id: 1, name: 'ООО "РВБ"', shortName: 'РВБ' },
        { id: 2, name: 'ООО "Интернет решения"', shortName: null }
      ]

      // Set up mock items with customer IDs
      mockItems.value = [
        { 
          id: 1, 
          fileName: 'register1.csv', 
          customerId: 1, 
          ordersTotal: 10 
        },
        { 
          id: 2, 
          fileName: 'register2.csv', 
          customerId: 2, 
          ordersTotal: 5 
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: {
            'v-card': true,
            'v-text-field': true,
            'font-awesome-icon': true,
            'v-file-input': true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Test that getCustomerName works with the mock data
      expect(wrapper.vm.getCustomerName(1)).toBe('РВБ')
      expect(wrapper.vm.getCustomerName(2)).toBe('ООО "Интернет решения"')
    })

    it('emits file input update and calls upload', async () => {
      const wrapper = mount(RegistersList, {
        global: {
          stubs: {
            'v-card': true,
            'v-text-field': true,
            'v-data-table-server': true,
            'font-awesome-icon': true,
            'v-file-input': true
          }
        }
      })

      const file = new File(['data'], 'test.xlsx')
      await wrapper.vm.fileSelected([file])
      expect(uploadFn).toHaveBeenCalledWith(file)
    })
  })
})
