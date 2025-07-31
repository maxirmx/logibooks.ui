/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { defaultGlobalStubs, createMockStore } from './test-utils.js'
import ParcelEditDialog from '@/components/WbrParcel_EditDialog.vue'

// Mock router - create the mock function directly in the factory
vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

// Mock Pinia's storeToRefs to return the mock values
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: vi.fn((store) => {
      if (store.item) {
        return { item: store.item }
      }
      if (store.stopWords) {
        return { stopWords: store.stopWords }
      }
      if (store.orders) {
        return { orders: store.orders }
      }
      if (store.countries) {
        return { countries: store.countries }
      }
      return {}
    })
  }
})

// Simple stubs for vee-validate components
const FormStub = {
  name: 'Form',
  template: '<form @submit.prevent="$emit(\'submit\')"><slot :errors="{}" :isSubmitting="false" :handleSubmit="handleSubmit" :values="{}" /></form>',
  methods: {
    handleSubmit(callback) {
      if (callback) {
        callback({})
      }
    }
  }
}
const FieldStub = {
  name: 'Field',
  props: ['name', 'id', 'type', 'readonly', 'as', 'step', 'rows'],
  template: '<input :id="id || name" :type="type" :readonly="readonly" v-if="as !== \'select\' && as !== \'textarea\'" />' +
           '<select :id="id || name" v-else-if="as === \'select\'"><slot /></select>' +
           '<textarea :id="id || name" :rows="rows" v-else-if="as === \'textarea\'"></textarea>'
}

// Mock data
const mockItem = ref({
  id: 1,
  registerId: 1,
  statusId: 1,
  rowNumber: 1,
  orderNumber: 'TEST001',
  shk: 'TEST123',
  tnVed: '1234567890',
  invoiceDate: '2024-01-01',
  weightKg: 1.5,
  quantity: 2,
  unitPrice: 100.50,
  productName: 'Test Product',
  recipientName: 'Test Recipient'
})

const mockOrdersStore = createMockStore({
  item: mockItem,
  error: null,
  getById: vi.fn().mockResolvedValue(mockItem.value),
  update: vi.fn().mockResolvedValue({}),
  generate: vi.fn().mockResolvedValue(true),
  validate: vi.fn().mockResolvedValue(true),
  approve: vi.fn().mockResolvedValue(true)
})

const mockStatusStore = createMockStore({
  statuses: [
    { id: 1, title: 'Status 1' },
    { id: 2, title: 'Status 2' }
  ],
  parcelStatuses: [
    { id: 1, title: 'Status 1' },
    { id: 2, title: 'Status 2' }
  ],
  ensureStatusesLoaded: vi.fn()
})

const mockCheckStatusStore = createMockStore({
  statuses: [
    { id: 1, title: 'Не проверен' },
    { id: 2, title: 'Проверен' }
  ],
  getStatusTitle: vi.fn((id) => `Статус ${id}`),
  ensureStatusesLoaded: vi.fn()
})

const mockStopWordsStore = createMockStore({
  stopWords: [
    { id: 1, word: 'test1' },
    { id: 2, word: 'test2' }
  ],
  getAll: vi.fn().mockResolvedValue([])
})

const mockFeacnCodesStore = createMockStore({
  orders: [
    { id: 1, comment: 'Test feacn order 1' },
    { id: 2, comment: 'Test feacn order 2' }
  ],
  getAll: vi.fn().mockResolvedValue([])
})
const mockCountriesStore = createMockStore({
  countries: ref([]),
  getAll: vi.fn(),
  ensureLoaded: vi.fn()
})

// Mock registers store
const mockRegistersStore = createMockStore({
  nextParcel: vi.fn().mockResolvedValue({ id: 2, registerId: 1 }),
  error: null,
  loading: false
})

// Mock stores
vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: vi.fn(() => mockOrdersStore)
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: vi.fn(() => mockStatusStore)
}))

vi.mock('@/stores/parcel.checkstatuses.store.js', () => ({
  useParcelCheckStatusStore: vi.fn(() => mockCheckStatusStore)
}))

vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: vi.fn(() => mockStopWordsStore)
}))

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: vi.fn(() => mockFeacnCodesStore)
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: vi.fn(() => mockCountriesStore)
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: vi.fn(() => mockRegistersStore)
}))

describe('WbrParcel_EditDialog', () => {
  let wrapper

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock console.error to prevent stderr warnings in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Create a Suspense wrapper for the async component
    const SuspenseWrapper = {
      template: `
        <Suspense>
          <ParcelEditDialog :registerId="1" :id="1" />
          <template #fallback>
            <div>Loading...</div>
          </template>
        </Suspense>
      `,
      components: {
        ParcelEditDialog
      }
    }

    wrapper = mount(SuspenseWrapper, {
      global: {
        stubs: {
          ...defaultGlobalStubs,
          Form: FormStub,
          Field: FieldStub
        }
      }
    })

    // Wait for async operations to complete
    await nextTick()
    await nextTick() // Extra tick to ensure async operations complete
  })

  afterEach(() => {
    // Restore console.error mock
    console.error.mockRestore?.()
  })

  it('renders the order edit dialog', () => {
    const heading = wrapper.find('h1')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toContain('Посылка')
  })

  it('includes all required order fields', () => {
    // Test some key fields (excluding commented out fields like rowNumber and orderNumber)
    const fieldsToCheck = [
      'statusId',
      'tnVed',
      'weightKg',
      'quantity',
      'unitPrice',
      'productName',
      'recipientName'
    ]

    fieldsToCheck.forEach(fieldName => {
      const field = wrapper.find(`#${fieldName}`)
      expect(field.exists()).toBe(true)
    })
  })

  it('has proper input types for numeric fields', () => {
    const numericFields = ['weightKg', 'quantity', 'unitPrice']

    numericFields.forEach(fieldName => {
      const field = wrapper.find(`#${fieldName}`)
      expect(field.exists()).toBe(true)
      expect(field.attributes('type')).toBe('number')
    })
  })

  it('renders all required buttons', () => {
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(4) // Save, cancel, next issue, invoice

    // Find buttons by partial text match instead of exact match
    const nextIssueButton = wrapper.findAll('button').find(btn => btn.text().includes('Следующая проблема'))
    expect(nextIssueButton).toBeTruthy()
    
    const saveButton = wrapper.findAll('button').find(btn => btn.text().includes('Сохранить'))
    expect(saveButton).toBeTruthy()
    
    const invoiceButton = wrapper.findAll('button').find(btn => btn.text().includes('Накладная'))
    expect(invoiceButton).toBeTruthy()
    
    const cancelButton = wrapper.findAll('button').find(btn => btn.text().includes('Отменить'))
    expect(cancelButton).toBeTruthy()
    
    // Check button order - validate that the "Next Issue" button comes before the save button
    const allButtons = wrapper.findAll('button')
    const nextIssueIndex = [...allButtons].findIndex(btn => btn.text().includes('Следующая проблема'))
    const saveIndex = [...allButtons].findIndex(btn => btn.text().includes('Сохранить'))
    
    expect(nextIssueIndex).toBeLessThan(saveIndex)
  })
  
  it('calls generate when invoice button is clicked', async () => {
    const invoiceButton = wrapper.findAll('button').find(btn => btn.text().includes('Накладная'))
    expect(invoiceButton).toBeTruthy()
    
    await invoiceButton.trigger('click')
    
    expect(mockOrdersStore.generate).toHaveBeenCalledWith(1, '0000000000000TEST123')
  })

  it('calls getById on mount', () => {
    expect(mockOrdersStore.getById).toHaveBeenCalledWith(1)
  })

  it('calls ensureStatusesLoaded on mount', () => {
    expect(mockStatusStore.ensureStatusesLoaded).toHaveBeenCalled()
  })

  it('calls check status store ensureStatusesLoaded on mount', () => {
    expect(mockCheckStatusStore.ensureStatusesLoaded).toHaveBeenCalled()
  })

  it('loads stopwords on mount', () => {
    expect(mockStopWordsStore.getAll).toHaveBeenCalled()
  })

  describe('Status Cell Styling', () => {
    it('applies correct CSS class for different check status IDs', async () => {
      // Test has-issues (101-200)
      mockItem.value.checkStatusId = 150
      await nextTick()
      let statusCell = wrapper.find('.status-cell')
      expect(statusCell.classes()).toContain('has-issues')

      // Test not-checked (<=100)
      mockItem.value.checkStatusId = 50
      await nextTick()
      statusCell = wrapper.find('.status-cell')
      expect(statusCell.classes()).toContain('not-checked')

      // Test no-issues (201-300)
      mockItem.value.checkStatusId = 250
      await nextTick()
      statusCell = wrapper.find('.status-cell')
      expect(statusCell.classes()).toContain('no-issues')

      // Test is-approved (>300)
      mockItem.value.checkStatusId = 350
      await nextTick()
      statusCell = wrapper.find('.status-cell')
      expect(statusCell.classes()).toContain('is-approved')
    })
  })

  describe('validateParcel function', () => {
    it('calls validate and reloads data on success', async () => {
      const validateBtn = wrapper.find('.validate-btn')
      if (validateBtn.exists()) {
        await validateBtn.trigger('click')
        
        expect(mockOrdersStore.validate).toHaveBeenCalledWith(1)
        expect(mockOrdersStore.getById).toHaveBeenCalledWith(1)
      }
    })

    it('handles validation errors', async () => {
      const error = new Error('Validation failed')
      error.response = { data: { message: 'Custom error message' } }
      mockOrdersStore.validate.mockRejectedValueOnce(error)

      const validateBtn = wrapper.find('.validate-btn')
      if (validateBtn.exists()) {
        await validateBtn.trigger('click')
        await nextTick()

        expect(mockOrdersStore.error).toBe('Custom error message')
      }
    })

    it('handles validation errors without response data', async () => {
      const error = new Error('Network error')
      mockOrdersStore.validate.mockRejectedValueOnce(error)

      const validateBtn = wrapper.find('.validate-btn')
      if (validateBtn.exists()) {
        await validateBtn.trigger('click')
        await nextTick()

        expect(mockOrdersStore.error).toBe('Ошибка при проверке посылки')
      }
    })
  })

  describe('approveParcel function', () => {
    it('calls approve and reloads data on success', async () => {
      const approveBtn = wrapper.find('.approve-btn')
      if (approveBtn.exists()) {
        await approveBtn.trigger('click')
        
        expect(mockOrdersStore.approve).toHaveBeenCalledWith(1)
        expect(mockOrdersStore.getById).toHaveBeenCalledWith(1)
      }
    })

    it('handles approval errors', async () => {
      const error = new Error('Approval failed')
      error.response = { data: { message: 'Custom approval error' } }
      mockOrdersStore.approve.mockRejectedValueOnce(error)

      const approveBtn = wrapper.find('.approve-btn')
      if (approveBtn.exists()) {
        await approveBtn.trigger('click')
        await nextTick()

        expect(mockOrdersStore.error).toBe('Custom approval error')
      }
    })

    it('handles approval errors without response data', async () => {
      const error = new Error('Network error')
      mockOrdersStore.approve.mockRejectedValueOnce(error)

      const approveBtn = wrapper.find('.approve-btn')
      if (approveBtn.exists()) {
        await approveBtn.trigger('click')
        await nextTick()

        expect(mockOrdersStore.error).toBe('Ошибка при согласовании посылки')
      }
    })
  })

  describe('onSubmit function', () => {
    it('saves and navigates to next parcel when next parcel exists', async () => {
      const mockRouter = await import('@/router')
      const nextParcel = { id: 2, registerId: 1 }
      mockRegistersStore.nextParcel.mockResolvedValueOnce(nextParcel)

      const nextIssueBtn = wrapper.findAll('button').find(btn => btn.text().includes('Следующая проблема'))
      await nextIssueBtn.trigger('click')

      expect(mockOrdersStore.update).toHaveBeenCalledWith(1, {})
      expect(mockRegistersStore.nextParcel).toHaveBeenCalledWith(1)
      expect(mockRouter.default.push).toHaveBeenCalledWith('/registers/1/parcels/edit/2')
    })

    it('saves and navigates to parcels list when no next parcel', async () => {
      const mockRouter = await import('@/router')
      mockRegistersStore.nextParcel.mockResolvedValueOnce(null)

      const nextIssueBtn = wrapper.findAll('button').find(btn => btn.text().includes('Следующая проблема'))
      await nextIssueBtn.trigger('click')

      expect(mockOrdersStore.update).toHaveBeenCalledWith(1, {})
      expect(mockRegistersStore.nextParcel).toHaveBeenCalledWith(1)
      expect(mockRouter.default.push).toHaveBeenCalledWith('/registers/1/parcels')
    })

    it('handles onSubmit errors', async () => {
      const error = new Error('Update failed')
      mockOrdersStore.update.mockRejectedValueOnce(error)

      const nextIssueBtn = wrapper.findAll('button').find(btn => btn.text().includes('Следующая проблема'))
      await nextIssueBtn.trigger('click')
      await nextTick()

      expect(mockOrdersStore.error).toBe('Update failed')
    })
  })

  describe('onSave function', () => {
    it('saves and navigates to parcels list on success', async () => {
      const mockRouter = await import('@/router')
      
      const saveBtn = wrapper.findAll('button').find(btn => btn.text().includes('Сохранить'))
      await saveBtn.trigger('click')

      expect(mockOrdersStore.update).toHaveBeenCalledWith(1, {})
      expect(mockRouter.default.push).toHaveBeenCalledWith('/registers/1/parcels')
    })

    it('handles onSave errors', async () => {
      const error = new Error('Save failed')
      mockOrdersStore.update.mockRejectedValueOnce(error)

      const saveBtn = wrapper.findAll('button').find(btn => btn.text().includes('Сохранить'))
      await saveBtn.trigger('click')
      await nextTick()

      expect(mockOrdersStore.error).toBe('Save failed')
    })
  })

  describe('generateXml function', () => {
    it('handles generateXml errors', async () => {
      const error = new Error('Generation failed')
      error.response = { data: { message: 'Custom generation error' } }
      mockOrdersStore.generate.mockRejectedValueOnce(error)

      const invoiceBtn = wrapper.findAll('button').find(btn => btn.text().includes('Накладная'))
      await invoiceBtn.trigger('click')
      await nextTick()

      expect(mockOrdersStore.error).toBe('Custom generation error')
    })

    it('handles generateXml errors without response data', async () => {
      const error = new Error('Network error')
      mockOrdersStore.generate.mockRejectedValueOnce(error)

      const invoiceBtn = wrapper.findAll('button').find(btn => btn.text().includes('Накладная'))
      await invoiceBtn.trigger('click')
      await nextTick()

      expect(mockOrdersStore.error).toBe('Ошибка при генерации XML')
    })
  })

  describe('Conditional rendering', () => {
    it('renders loading state', async () => {
      mockItem.value.loading = true
      await nextTick()

      const loadingDiv = wrapper.find('.text-center.m-5')
      expect(loadingDiv.exists()).toBe(true)
      const spinnerElement = loadingDiv.find('.spinner-border')
      expect(spinnerElement.exists()).toBe(true)
    })

    it('renders error state', async () => {
      mockItem.value.error = 'Test error message'
      await nextTick()

      const errorDiv = wrapper.find('.text-danger')
      expect(errorDiv.exists()).toBe(true)
      expect(errorDiv.text()).toContain('Ошибка: Test error message')
    })

    it('renders product link when available', async () => {
      mockItem.value.productLink = 'https://example.com/product'
      await nextTick()

      const productLink = wrapper.find('a.product-link-inline')
      expect(productLink.exists()).toBe(true)
      expect(productLink.attributes('href')).toBe('https://example.com/product')
    })

    it('adds https prefix when missing in product link', async () => {
      mockItem.value.productLink = 'example.com/product'
      await nextTick()

      const productLink = wrapper.find('a.product-link-inline')
      expect(productLink.exists()).toBe(true)
      expect(productLink.attributes('href')).toBe('https://example.com/product')
    })

    it('renders no link message when product link is not available', async () => {
      mockItem.value.productLink = null
      await nextTick()

      const noLinkSpan = wrapper.find('span.no-link')
      expect(noLinkSpan.exists()).toBe(true)
      expect(noLinkSpan.text()).toBe('Ссылка отсутствует')
    })
  })

  describe('Cancel button', () => {
    it('navigates to parcels list when cancel is clicked', async () => {
      const mockRouter = await import('@/router')
      
      const cancelBtn = wrapper.findAll('button').find(btn => btn.text().includes('Отменить'))
      await cancelBtn.trigger('click')

      expect(mockRouter.default.push).toHaveBeenCalledWith('/registers/1/parcels')
    })
  })
})
