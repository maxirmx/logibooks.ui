/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegistersList from '@/components/Registers_List.vue'
import { vuetifyStubs } from './test-utils.js'

const mockItems = ref([])
const mockCompanies = ref([])
const mockOrderStatuses = ref([])
const getAll = vi.fn()
const uploadFn = vi.fn()
const setOrderStatusesFn = vi.fn()
const getCompaniesAll = vi.fn()
const getOrderStatusesAll = vi.fn()
const generateAllFn = vi.fn()
const alertSuccessFn = vi.fn()
const alertErrorFn = vi.fn()

// Import router mock after vi.mock calls
let router

beforeEach(() => {
  vi.clearAllMocks()
})

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
      } else if (store.getAll && store.orderStatuses) {
        // order statuses store
        return { orderStatuses: mockOrderStatuses }
      } else {
        // auth store or other stores - return safe defaults
        return { 
          registers_per_page: ref(10), 
          registers_search: ref(''), 
          registers_sort_by: ref([{ key: 'id', order: 'asc' }]), 
          registers_page: ref(1),
          alert: ref(null)
        }
      }
    }
  }
})

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({ 
    getAll, 
    upload: uploadFn, 
    setOrderStatuses: setOrderStatusesFn, 
    items: mockItems, 
    loading: ref(false), 
    error: ref(null), 
    totalCount: ref(0) 
  })
}))

vi.mock('@/stores/orders.store.js', () => ({
  useOrdersStore: () => ({ generateAll: generateAllFn })
}))

vi.mock('@/stores/order.statuses.store.js', () => ({
  useOrderStatusesStore: () => ({ 
    getAll: getOrderStatusesAll, 
    orderStatuses: mockOrderStatuses 
  })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({ 
    getAll: getCompaniesAll, 
    companies: mockCompanies 
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ 
    success: alertSuccessFn, 
    error: alertErrorFn 
  })
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
    mockOrderStatuses.value = []
  })

  it('calls getAll on mount for both registers and companies', async () => {
    mount(RegistersList, {
      global: {
        stubs: vuetifyStubs
      }
    })
    
    // Wait for onMounted to complete
    await vi.waitFor(() => {
      expect(getCompaniesAll).toHaveBeenCalled()
      expect(getOrderStatusesAll).toHaveBeenCalled()
    })
    expect(getAll).toHaveBeenCalled()
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
          stubs: vuetifyStubs
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
          stubs: vuetifyStubs
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
          stubs: vuetifyStubs
        }
      })

      const file = new File(['data'], 'test.xlsx')
      await wrapper.vm.fileSelected([file])
      expect(uploadFn).toHaveBeenCalledWith(file)
    })
  })

  describe('bulk status change functionality', () => {
    let wrapper

    beforeEach(() => {
      mockOrderStatuses.value = [
        { id: 1, title: 'Новый' },
        { id: 2, title: 'В обработке' },
        { id: 3, title: 'Выполнен' }
      ]

      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('toggles edit mode when bulkChangeStatus is called', () => {
      const registerId = 1
      
      // Initially not in edit mode
      expect(wrapper.vm.bulkStatusState[registerId]?.editMode).toBeFalsy()
      
      // Enter edit mode
      wrapper.vm.bulkChangeStatus(registerId)
      expect(wrapper.vm.bulkStatusState[registerId].editMode).toBe(true)
      expect(wrapper.vm.bulkStatusState[registerId].selectedStatusId).toBeNull()
      
      // Exit edit mode
      wrapper.vm.bulkChangeStatus(registerId)
      expect(wrapper.vm.bulkStatusState[registerId].editMode).toBe(false)
    })

    it('does not toggle edit mode when loading', () => {
      const registerId = 1
      
      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
      
      // Mock loading value directly on the store using the storeToRefs
      wrapper.vm.loading = true
      
      // Initial state should not exist
      expect(wrapper.vm.bulkStatusState[registerId]).toBeUndefined()
      
      wrapper.vm.bulkChangeStatus(registerId)
      
      // State gets initialized but edit mode should remain false due to loading
      expect(wrapper.vm.bulkStatusState[registerId]).toBeDefined()
      expect(wrapper.vm.bulkStatusState[registerId].editMode).toBe(false)
    })

    it('cancels status change and resets state', () => {
      const registerId = 1
      
      // Set up edit state
      wrapper.vm.bulkChangeStatus(registerId)
      wrapper.vm.bulkStatusState[registerId].selectedStatusId = 2
      
      // Cancel
      wrapper.vm.cancelStatusChange(registerId)
      expect(wrapper.vm.bulkStatusState[registerId].editMode).toBe(false)
      expect(wrapper.vm.bulkStatusState[registerId].selectedStatusId).toBeNull()
    })

    it('handles applyStatusToAllOrders success', async () => {
      const registerId = 1
      const statusId = 2
      
      setOrderStatusesFn.mockResolvedValueOnce({ success: true })
      
      // Set up edit state
      wrapper.vm.bulkChangeStatus(registerId)
      wrapper.vm.bulkStatusState[registerId].selectedStatusId = statusId
      
      await wrapper.vm.applyStatusToAllOrders(registerId, statusId)
      
      expect(setOrderStatusesFn).toHaveBeenCalledWith(registerId, statusId)
      expect(alertSuccessFn).toHaveBeenCalledWith('Статус успешно применен ко всем заказам в реестре')
      expect(wrapper.vm.bulkStatusState[registerId].editMode).toBe(false)
      expect(wrapper.vm.bulkStatusState[registerId].selectedStatusId).toBeNull()
      expect(getAll).toHaveBeenCalled() // loadRegisters called
    })

    it('handles applyStatusToAllOrders error', async () => {
      const registerId = 1
      const statusId = 2
      const errorMessage = 'Server error'
      
      setOrderStatusesFn.mockRejectedValueOnce(new Error(errorMessage))
      
      // Set up edit state
      wrapper.vm.bulkChangeStatus(registerId)
      wrapper.vm.bulkStatusState[registerId].selectedStatusId = statusId
      
      await wrapper.vm.applyStatusToAllOrders(registerId, statusId)
      
      expect(setOrderStatusesFn).toHaveBeenCalledWith(registerId, statusId)
      expect(alertErrorFn).toHaveBeenCalledWith(errorMessage)
      expect(wrapper.vm.bulkStatusState[registerId].editMode).toBe(false)
      expect(wrapper.vm.bulkStatusState[registerId].selectedStatusId).toBeNull()
    })

    it('validates registerId and statusId in applyStatusToAllOrders', async () => {
      // Clear previous calls
      alertErrorFn.mockClear()
      
      // Test missing registerId
      await wrapper.vm.applyStatusToAllOrders(null, 1)
      expect(alertErrorFn).toHaveBeenCalledWith('Не указан реестр или статус для изменения')
      
      alertErrorFn.mockClear()
      // Test missing statusId
      await wrapper.vm.applyStatusToAllOrders(1, null)
      expect(alertErrorFn).toHaveBeenCalledWith('Не указан реестр или статус для изменения')
      
      alertErrorFn.mockClear()
      // Test statusId = 0 (falsy, so it triggers the first validation)
      await wrapper.vm.applyStatusToAllOrders(1, 0)
      expect(alertErrorFn).toHaveBeenCalledWith('Не указан реестр или статус для изменения')
      
      alertErrorFn.mockClear()
      // Test invalid statusId (negative number to test numeric validation)
      await wrapper.vm.applyStatusToAllOrders(1, -1)
      expect(alertErrorFn).toHaveBeenCalledWith('Некорректный идентификатор статуса')
      
      alertErrorFn.mockClear()
      // Test invalid statusId (string)
      await wrapper.vm.applyStatusToAllOrders(1, 'invalid')
      expect(alertErrorFn).toHaveBeenCalledWith('Некорректный идентификатор статуса')
    })
  })

  describe('navigation functions', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('navigates to orders when openOrders is called', async () => {
      const item = { id: 123 }
      const router = (await import('@/router')).default
      
      wrapper.vm.openOrders(item)
      expect(router.push).toHaveBeenCalledWith('/registers/123/orders')
    })

    it('calls generateAll when exportAllXml is called', () => {
      const item = { id: 456 }
      wrapper.vm.exportAllXml(item)
      expect(generateAllFn).toHaveBeenCalledWith(456)
    })
  })

  describe('file upload functionality', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('opens file dialog when openFileDialog is called', () => {
      const mockClick = vi.fn()
      wrapper.vm.fileInput = { click: mockClick }
      
      wrapper.vm.openFileDialog()
      expect(mockClick).toHaveBeenCalled()
    })

    it('handles file selection with array input', async () => {
      const file = new File(['data'], 'test.xlsx')
      uploadFn.mockResolvedValueOnce({ success: true })
      
      await wrapper.vm.fileSelected([file])
      
      expect(uploadFn).toHaveBeenCalledWith(file)
      expect(alertSuccessFn).toHaveBeenCalledWith('Реестр успешно загружен')
      expect(getAll).toHaveBeenCalled()
    })

    it('handles file selection with single file input', async () => {
      const file = new File(['data'], 'test.xlsx')
      uploadFn.mockResolvedValueOnce({ success: true })
      
      await wrapper.vm.fileSelected(file)
      
      expect(uploadFn).toHaveBeenCalledWith(file)
      expect(alertSuccessFn).toHaveBeenCalledWith('Реестр успешно загружен')
    })

    it('handles file upload error', async () => {
      const file = new File(['data'], 'test.xlsx')
      const errorMessage = 'Upload failed'
      uploadFn.mockRejectedValueOnce(new Error(errorMessage))
      
      await wrapper.vm.fileSelected(file)
      
      expect(uploadFn).toHaveBeenCalledWith(file)
      expect(alertErrorFn).toHaveBeenCalledWith(errorMessage)
    })

    it('handles empty file selection', async () => {
      await wrapper.vm.fileSelected(null)
      expect(uploadFn).not.toHaveBeenCalled()
      
      await wrapper.vm.fileSelected([])
      expect(uploadFn).not.toHaveBeenCalled()
    })
  })
})
