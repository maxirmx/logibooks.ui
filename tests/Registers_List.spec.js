/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import RegistersList from '@/components/Registers_List.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'
import { vuetifyStubs } from './helpers/test-utils.js'
import router from '@/router'

const mockItems = ref([])
const mockCompanies = ref([])
const mockOrderStatuses = ref([])
const mockCountries = ref([])
const mockTransportationTypes = ref([])
const mockCustomsProcedures = ref([])
const getAll = vi.fn()
const uploadFn = vi.fn()
const setOrderStatusesFn = vi.fn()
const getCompaniesAll = vi.fn()
const getOrderStatusesAll = vi.fn()
const getCountriesAll = vi.fn()
const countriesEnsureLoadedFn = vi.fn().mockResolvedValue(mockCountries.value)
const getTransportationTypesAll = vi.fn()
const getCustomsProceduresAll = vi.fn()
const generateFn = vi.fn()
const alertSuccessFn = vi.fn()
const alertErrorFn = vi.fn()
const validateFn = vi.fn()
const getValidationProgressFn = vi.fn()
const cancelValidationFn = vi.fn()
const removeFn = vi.fn()
const confirmMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.getAll && store.upload && store.setParcelStatuses) {
        // registers store
        return { items: mockItems, loading: ref(false), error: ref(null), totalCount: ref(0) }
      } else if (store.getAll && !store.upload && store.companies) {
        // companies store
        return { companies: mockCompanies }
      } else if (store.getAll && store.parcelStatuses) {
        // parcel statuses store
        return { parcelStatuses: mockOrderStatuses }
      } else if (store.getAll && store.countries) {
        // countries store
        return { countries: mockCountries }
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

const mockItem = ref({})
const uploadFile = ref(null)
const registersStore = {
  getAll,
  upload: uploadFn,
  setParcelStatuses: setOrderStatusesFn,
  validate: validateFn,
  getValidationProgress: getValidationProgressFn,
  cancelValidation: cancelValidationFn,
  remove: removeFn,
  generate: generateFn,
  items: mockItems,
  item: mockItem,
  uploadFile,
  loading: ref(false),
  error: ref(null),
  totalCount: ref(0)
}

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => registersStore
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    getAll: getOrderStatusesAll,
    ensureStatusesLoaded: vi.fn().mockResolvedValue(),
    parcelStatuses: mockOrderStatuses
  })
}))

vi.mock('@/stores/parcel.checkstatuses.store.js', () => ({
  useParcelCheckStatusStore: () => ({
    ensureStatusesLoaded: vi.fn().mockResolvedValue(),
    getStatusTitle: vi.fn((id) => `Status ${id}`)
  })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({
    getAll: getCompaniesAll,
    companies: mockCompanies
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    countries: mockCountries,
    getAll: getCountriesAll,
    ensureLoaded: countriesEnsureLoadedFn,
    getCountryShortName: vi.fn(code => `Country ${code}`)
  })
}))

vi.mock('@/stores/transportation.types.store.js', () => ({
  useTransportationTypesStore: () => ({
    types: mockTransportationTypes,
    getAll: getTransportationTypesAll,
    ensureLoaded: vi.fn(),
    getName: vi.fn(id => `Type ${id}`)
  })
}))

vi.mock('@/stores/customs.procedures.store.js', () => ({
  useCustomsProceduresStore: () => ({
    procedures: mockCustomsProcedures,
    getAll: getCustomsProceduresAll,
    ensureLoaded: vi.fn(),
    getName: vi.fn(id => `Proc ${id}`)
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

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
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
      // expect(getOrderStatusesAll).toHaveBeenCalled()
    })
    expect(getAll).toHaveBeenCalled()
    expect(countriesEnsureLoadedFn).toHaveBeenCalled()
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
      expect(alertSuccessFn).toHaveBeenCalledWith('Статус успешно применен ко всем посылкам в реестре')
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

    it('navigates to parcels when openParcels is called', async () => {
      const item = { id: 123 }
      const router = (await import('@/router')).default

      wrapper.vm.openParcels(item)
      expect(router.push).toHaveBeenCalledWith('/registers/123/parcels')
    })

    it('calls generate when exportAllXml is called', () => {
      const item = { id: 456, invoiceNumber: 'INV' }
      wrapper.vm.exportAllXml(item)
      expect(generateFn).toHaveBeenCalledWith(456, 'INV')
    })

    it('calls lookupFeacn helper when lookupFeacnCodes is called', async () => {
      const item = { id: 789 }
      await wrapper.vm.lookupFeacnCodes(item)
      expect(alertSuccessFn).toHaveBeenCalledWith('Подбор кодов ТН ВЭД для реестра 789 - функция в разработке')
    })
  })

  describe('table cell interactions', () => {
    it('opens parcels when dealNumber cell is clicked', async () => {
      mockItems.value = [
        {
          id: 1,
          dealNumber: 'D-1',
          invoiceNumber: 'INV-1'
        }
      ]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      const router = (await import('@/router')).default
      await wrapper.vm.$nextTick()
      const cell = wrapper.find('.open-parcels-link')
      await cell.trigger('click')
      expect(router.push).toHaveBeenCalledWith('/registers/1/parcels')
    })

    it('edits register when sender cell is clicked', async () => {
      mockItems.value = [
        {
          id: 2,
          senderId: 10
        }
      ]
      mockCompanies.value = [{ id: 10, name: 'Sender' }]

      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      const router = (await import('@/router')).default
      await wrapper.vm.$nextTick()
      const cell = wrapper.find('.edit-register-link')
      await cell.trigger('click')
      expect(router.push).toHaveBeenCalledWith('/register/edit/2')
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

    describe('Upload functionality', () => {
      beforeEach(() => {
        // Set up mock companies data for upload customers
        mockCompanies.value = [
          { id: OZON_COMPANY_ID, name: 'ООО "Интернет решения"', shortName: 'Озон' },
          { id: WBR_COMPANY_ID, name: 'ООО "РВБ"', shortName: 'РВБ' },
          { id: 3, name: 'Other Company', shortName: 'Other' }
        ]
      })

      it('opens file dialog when customer is selected', () => {
        const mockClick = vi.fn()
        wrapper.vm.fileInput = { click: mockClick }
        wrapper.vm.selectedCustomerId = OZON_COMPANY_ID

        wrapper.vm.openFileDialog()
        expect(mockClick).toHaveBeenCalled()
      })

      it('shows error when trying to open file dialog without selected customer', () => {
        wrapper.vm.selectedCustomerId = null
        wrapper.vm.openFileDialog()
        
        expect(alertErrorFn).toHaveBeenCalledWith('Пожалуйста, выберите клиента')
      })

      it('handles file selection with array input for OZON', async () => {
        const file = new File(['data'], 'test.xlsx')
        wrapper.vm.selectedCustomerId = OZON_COMPANY_ID

        await wrapper.vm.fileSelected([file])

        expect(registersStore.item.fileName).toBe('test.xlsx')
        expect(registersStore.item.companyId).toBe(OZON_COMPANY_ID)
        expect(registersStore.uploadFile).toBe(file)
        expect(router.push).toHaveBeenCalledWith('/register/load')
      })

      it('handles file selection with single file input for WBR', async () => {
        const file = new File(['data'], 'test.xlsx')
        wrapper.vm.selectedCustomerId = WBR_COMPANY_ID

        await wrapper.vm.fileSelected(file)

        expect(registersStore.item.fileName).toBe('test.xlsx')
        expect(registersStore.item.companyId).toBe(WBR_COMPANY_ID)
        expect(registersStore.uploadFile).toBe(file)
        expect(router.push).toHaveBeenCalledWith('/register/load')
      })

      it('handles empty file selection', async () => {
        wrapper.vm.selectedCustomerId = OZON_COMPANY_ID

        await wrapper.vm.fileSelected(null)
        expect(router.push).not.toHaveBeenCalled()

        await wrapper.vm.fileSelected([])
        expect(router.push).not.toHaveBeenCalled()
      })

      it('shows error when trying to upload without selected customer', async () => {
        const file = new File(['data'], 'test.xlsx')
        wrapper.vm.selectedCustomerId = null

        await wrapper.vm.fileSelected(file)

        expect(alertErrorFn).toHaveBeenCalledWith('Не выбран клиент для загрузки реестра')
        expect(router.push).not.toHaveBeenCalled()
      })

      it('clears file input after selection', async () => {
        const file = new File(['data'], 'test.xlsx')
        const mockFileInput = { value: null }
        wrapper.vm.fileInput = mockFileInput
        wrapper.vm.selectedCustomerId = OZON_COMPANY_ID

        await wrapper.vm.fileSelected(file)

        expect(mockFileInput.value).toBeNull()
      })
    })

    describe('uploadCustomers computed property', () => {
      it('returns filtered customers for upload', () => {
        mockCompanies.value = [
          { id: OZON_COMPANY_ID, name: 'ООО "Интернет решения"', shortName: 'Озон' },
          { id: WBR_COMPANY_ID, name: 'ООО "РВБ"', shortName: 'РВБ' },
          { id: 3, name: 'Other Company', shortName: 'Other' }
        ]

        const uploadCustomers = wrapper.vm.uploadCustomers

        expect(uploadCustomers).toHaveLength(2)
        expect(uploadCustomers).toEqual([
          { id: OZON_COMPANY_ID, name: 'Озон' },
          { id: WBR_COMPANY_ID, name: 'РВБ' }
        ])
      })

      it('returns empty array when no companies loaded', () => {
        mockCompanies.value = []
        const uploadCustomers = wrapper.vm.uploadCustomers
        expect(uploadCustomers).toEqual([])
      })

      it('returns empty array when companies is null', () => {
        mockCompanies.value = null
        const uploadCustomers = wrapper.vm.uploadCustomers
        expect(uploadCustomers).toEqual([])
      })
    })
  })

  describe('delete functionality', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('shows confirmation dialog when delete is clicked', async () => {
      confirmMock.mockResolvedValue(true)
      const item = { id: 1, fileName: 'reg.xlsx' }

      await wrapper.vm.deleteRegister(item)

      expect(confirmMock).toHaveBeenCalledWith({
        title: 'Подтверждение',
        confirmationText: 'Удалить',
        cancellationText: 'Не удалять',
        dialogProps: {
          width: '30%',
          minWidth: '250px'
        },
        confirmationButtonProps: {
          color: 'orange-darken-3'
        },
        content: 'Удалить реестр "' + item.fileName + '" ?'
      })
    })

    it('calls remove when deletion is confirmed', async () => {
      confirmMock.mockResolvedValue(true)
      const item = { id: 2, fileName: 'file.xlsx' }

      await wrapper.vm.deleteRegister(item)

      expect(removeFn).toHaveBeenCalledWith(item.id)
    })

    it('does not call remove when deletion is cancelled', async () => {
      confirmMock.mockResolvedValue(false)
      const item = { id: 3, fileName: 'file.xlsx' }

      await wrapper.vm.deleteRegister(item)

      expect(removeFn).not.toHaveBeenCalled()
    })

    it('handles delete error', async () => {
     
      confirmMock.mockResolvedValue(true)
      removeFn.mockRejectedValueOnce(new Error('Network error'))
      const item = { id: 4, fileName: 'file.xlsx' }

      await wrapper.vm.deleteRegister(item)

      expect(removeFn).toHaveBeenCalledWith(item.id)
    })
  })

  describe('validation functionality', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('starts validation and shows progress dialog', async () => {
      const item = { id: 123 }
      const validationResult = { id: 'validation-handle-123' }

      validateFn.mockResolvedValueOnce(validationResult)

      // Mock setInterval to prevent actual timers
      const setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation(() => 12345)

      // Mock getValidationProgress to return ongoing progress so show stays true
      getValidationProgressFn.mockResolvedValueOnce({
        total: 100,
        processed: 10,
        finished: false
      })

      await wrapper.vm.validateRegister(item)

      expect(validateFn).toHaveBeenCalledWith(123)
      expect(wrapper.vm.validationState.handleId).toBe('validation-handle-123')
      expect(wrapper.vm.validationState.show).toBe(true)
      expect(wrapper.vm.validationState.total).toBe(100) // Updated by pollValidation
      expect(wrapper.vm.validationState.processed).toBe(10) // Updated by pollValidation
      expect(setIntervalSpy).toHaveBeenCalled()

      setIntervalSpy.mockRestore()
    })

    it('handles validation start error', async () => {
      const item = { id: 123 }
      const errorMessage = 'Validation failed to start'

      validateFn.mockRejectedValueOnce(new Error(errorMessage))

      await wrapper.vm.validateRegister(item)

      expect(validateFn).toHaveBeenCalledWith(123)
      expect(alertErrorFn).toHaveBeenCalledWith(errorMessage)
      expect(wrapper.vm.validationState.show).toBe(false)
    })

    it('polls validation progress and updates state', async () => {
      // Set up validation state
      wrapper.vm.validationState.handleId = 'validation-handle-123'
      wrapper.vm.validationState.show = true

      const progressData = {
        total: 100,
        processed: 50,
        finished: false
      }

      getValidationProgressFn.mockResolvedValueOnce(progressData)

      await wrapper.vm.pollValidation()

      expect(getValidationProgressFn).toHaveBeenCalledWith('validation-handle-123')
      expect(wrapper.vm.validationState.total).toBe(100)
      expect(wrapper.vm.validationState.processed).toBe(50)
      expect(wrapper.vm.validationState.show).toBe(true) // Still showing because not finished
    })

    it('stops polling when validation is finished', async () => {
      wrapper.vm.validationState.handleId = 'validation-handle-123'
      wrapper.vm.validationState.show = true

      const progressData = {
        total: 100,
        processed: 100,
        finished: true
      }

      getValidationProgressFn.mockResolvedValueOnce(progressData)

      await wrapper.vm.pollValidation()

      expect(wrapper.vm.validationState.total).toBe(100)
      expect(wrapper.vm.validationState.processed).toBe(100)
      expect(wrapper.vm.validationState.show).toBe(false) // Hidden because finished
    })

    it('stops polling when total is -1', async () => {
      wrapper.vm.validationState.handleId = 'validation-handle-123'
      wrapper.vm.validationState.show = true

      const progressData = {
        total: -1,
        processed: 0,
        finished: false
      }

      getValidationProgressFn.mockResolvedValueOnce(progressData)

      await wrapper.vm.pollValidation()

      expect(wrapper.vm.validationState.show).toBe(false)
    })

    it('stops polling when processed is -1', async () => {
      wrapper.vm.validationState.handleId = 'validation-handle-123'
      wrapper.vm.validationState.show = true

      const progressData = {
        total: 100,
        processed: -1,
        finished: false
      }

      getValidationProgressFn.mockResolvedValueOnce(progressData)

      await wrapper.vm.pollValidation()

      expect(wrapper.vm.validationState.show).toBe(false)
    })

    it('handles polling error', async () => {
      wrapper.vm.validationState.handleId = 'validation-handle-123'
      wrapper.vm.validationState.show = true

      const errorMessage = 'Polling failed'
      getValidationProgressFn.mockRejectedValueOnce(new Error(errorMessage))

      await wrapper.vm.pollValidation()

      expect(alertErrorFn).toHaveBeenCalledWith(errorMessage)
      expect(wrapper.vm.validationState.show).toBe(false)
    })

    it('does nothing when polling without handleId', async () => {
      wrapper.vm.validationState.handleId = null

      await wrapper.vm.pollValidation()

      expect(getValidationProgressFn).not.toHaveBeenCalled()
    })

    it('cancels validation and stops polling', async () => {
      wrapper.vm.validationState.handleId = 'validation-handle-123'
      wrapper.vm.validationState.show = true

      cancelValidationFn.mockResolvedValueOnce({})

      wrapper.vm.cancelValidation()

      expect(cancelValidationFn).toHaveBeenCalledWith('validation-handle-123')
      expect(wrapper.vm.validationState.show).toBe(false)
    })

    it('handles cancellation when no handleId', () => {
      wrapper.vm.validationState.handleId = null
      wrapper.vm.validationState.show = true

      wrapper.vm.cancelValidation()

      expect(cancelValidationFn).not.toHaveBeenCalled()
      expect(wrapper.vm.validationState.show).toBe(false)
    })

    it('silently handles cancellation error', () => {
      wrapper.vm.validationState.handleId = 'validation-handle-123'
      wrapper.vm.validationState.show = true

      cancelValidationFn.mockRejectedValueOnce(new Error('Cancellation failed'))

      // Should not throw
      expect(() => wrapper.vm.cancelValidation()).not.toThrow()
      expect(wrapper.vm.validationState.show).toBe(false)
    })

    it('stops polling correctly', () => {
      const mockTimer = 12345
      wrapper.vm.progressTimer = mockTimer

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      wrapper.vm.stopPolling()

      expect(clearIntervalSpy).toHaveBeenCalledWith(mockTimer)
      expect(wrapper.vm.progressTimer).toBeNull()

      clearIntervalSpy.mockRestore()
    })

    it('handles stopPolling when no timer is set', () => {
      wrapper.vm.progressTimer = null

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      wrapper.vm.stopPolling()

      expect(clearIntervalSpy).not.toHaveBeenCalled()
      expect(wrapper.vm.progressTimer).toBeNull()

      clearIntervalSpy.mockRestore()
    })
  })

  describe('computed properties', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('calculates progressPercent correctly', () => {
      // Test with zero total
      wrapper.vm.validationState.total = 0
      wrapper.vm.validationState.processed = 0
      expect(wrapper.vm.progressPercent).toBe(0)

      // Test with negative total
      wrapper.vm.validationState.total = -1
      wrapper.vm.validationState.processed = 10
      expect(wrapper.vm.progressPercent).toBe(0)

      // Test with normal values
      wrapper.vm.validationState.total = 100
      wrapper.vm.validationState.processed = 50
      expect(wrapper.vm.progressPercent).toBe(50)

      // Test with values that need rounding
      wrapper.vm.validationState.total = 3
      wrapper.vm.validationState.processed = 1
      expect(wrapper.vm.progressPercent).toBe(33) // 33.33 rounded to 33

      // Test with complete progress
      wrapper.vm.validationState.total = 100
      wrapper.vm.validationState.processed = 100
      expect(wrapper.vm.progressPercent).toBe(100)
    })
  })

  describe('component lifecycle', () => {
    it('cleans up polling on unmount', () => {
      const wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })

      // Set up a mock timer
      const mockTimer = 12345
      wrapper.vm.progressTimer = mockTimer

      // Spy on clearInterval
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      // Unmount component
      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalledWith(mockTimer)
    })
  })

  describe('error handling in applyStatusToAllOrders', () => {
    let wrapper

    beforeEach(() => {
      wrapper = mount(RegistersList, {
        global: {
          stubs: vuetifyStubs
        }
      })
    })

    it('handles error with store error message', async () => {
      const registerId = 1
      const statusId = 2
      const storeErrorMessage = 'Store specific error'

      // Mock store with error property
      const mockStoreWithError = {
        setParcelStatuses: setOrderStatusesFn,
        error: { message: storeErrorMessage }
      }

      setOrderStatusesFn.mockRejectedValueOnce(new Error('Generic error'))

      // Temporarily replace the store
      const originalStore = wrapper.vm.registersStore
      wrapper.vm.registersStore = mockStoreWithError

      // Set up edit state
      wrapper.vm.bulkChangeStatus(registerId)
      wrapper.vm.bulkStatusState[registerId].selectedStatusId = statusId

      await wrapper.vm.applyStatusToAllOrders(registerId, statusId)

      expect(alertErrorFn).toHaveBeenCalledWith('Generic error')
      expect(wrapper.vm.bulkStatusState[registerId].editMode).toBe(false)

      // Restore original store
      wrapper.vm.registersStore = originalStore
    })
  })
})

// Add mock for orderStatusesStore.orderStatuses in the Pinia mock
vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    getAll: getOrderStatusesAll,
    ensureStatusesLoaded: vi.fn().mockResolvedValue(),
    parcelStatuses: mockOrderStatuses
  })
}))
vi.mock('@/stores/parcel.checkstatuses.store.js', () => ({
  useParcelCheckStatusStore: () => ({
    ensureStatusesLoaded: vi.fn().mockResolvedValue(),
    getStatusTitle: vi.fn((id) => `Status ${id}`)
  })
}))

describe('formatInvoiceDate function', () => {
  it('formats a valid date string correctly in dd.MM.yyyy format', () => {
    const wrapper = mount(RegistersList, {
      global: { stubs: vuetifyStubs }
    })
    
    // Test with ISO format string
    const isoDate = '2025-07-27T12:34:56'
    expect(wrapper.vm.formatDate(isoDate)).toBe('27.07.2025')
    
    // Test with different date
    const anotherDate = '2023-01-05'
    expect(wrapper.vm.formatDate(anotherDate)).toBe('05.01.2023')
  })
  
  it('handles single-digit day and month with padding', () => {
    const wrapper = mount(RegistersList, {
      global: { stubs: vuetifyStubs }
    })
    
    // Test with single-digit day
    const singleDigitDay = '2025-07-03'
    expect(wrapper.vm.formatDate(singleDigitDay)).toBe('03.07.2025')
    
    // Test with single-digit month
    const singleDigitMonth = '2025-03-15'
    expect(wrapper.vm.formatDate(singleDigitMonth)).toBe('15.03.2025')
    
    // Test with both single-digit day and month
    const bothSingleDigit = '2025-02-09'
    expect(wrapper.vm.formatDate(bothSingleDigit)).toBe('09.02.2025')
  })
  
  it('returns empty string for null or undefined input', () => {
    const wrapper = mount(RegistersList, {
      global: { stubs: vuetifyStubs }
    })
    
    expect(wrapper.vm.formatDate(null)).toBe('')
    expect(wrapper.vm.formatDate(undefined)).toBe('')
    expect(wrapper.vm.formatDate('')).toBe('')
  })
  
  it('returns original string for invalid date input', () => {
    const wrapper = mount(RegistersList, {
      global: { stubs: vuetifyStubs }
    })
    
    const invalidDate = 'not-a-date'
    expect(wrapper.vm.formatDate(invalidDate)).toBe(invalidDate)
    
    const anotherInvalidDate = '2025/13/45'  // invalid month and day
    expect(wrapper.vm.formatDate(anotherInvalidDate)).toBe(anotherInvalidDate)
  })
  
  it('handles different date formats correctly', () => {
    const wrapper = mount(RegistersList, {
      global: { stubs: vuetifyStubs }
    })
    
    // Testing with more reliable date format MM/DD/YYYY (US)
    expect(wrapper.vm.formatDate('07/27/2025')).toBe('27.07.2025')
    
    // Date object directly
    const dateObj = new Date(2025, 6, 27)  // Month is 0-indexed
    expect(wrapper.vm.formatDate(dateObj)).toBe('27.07.2025')
    
    // Date with time component
    const dateWithTime = new Date('2025-07-27T15:30:45')
    expect(wrapper.vm.formatDate(dateWithTime)).toBe('27.07.2025')
  })
})

