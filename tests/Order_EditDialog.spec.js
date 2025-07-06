/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import OrderEditDialog from '@/components/Order_EditDialog.vue'

// Mock router - create the mock function directly in the factory
vi.mock('@/router', () => ({
  default: { push: vi.fn() }
}))

// Simple stubs for vee-validate components
const FormStub = {
  name: 'Form',
  template: '<form @submit.prevent="$emit(\'submit\')"><slot :errors="{}" :isSubmitting="false" /></form>'
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
  tnVed: '1234567890',
  invoiceDate: '2024-01-01',
  weightKg: 1.5,
  quantity: 2,
  unitPrice: 100.50,
  productName: 'Test Product',
  recipientName: 'Test Recipient'
})

const mockOrdersStore = {
  item: mockItem,
  getById: vi.fn().mockResolvedValue(mockItem.value),
  update: vi.fn().mockResolvedValue({})
}

const mockStatusStore = {
  statuses: [
    { id: 1, title: 'Status 1' },
    { id: 2, title: 'Status 2' }
  ],
  ensureStatusesLoaded: vi.fn()
}

// Mock stores
vi.mock('@/stores/orders.store.js', () => ({
  useOrdersStore: vi.fn(() => mockOrdersStore)
}))

vi.mock('@/stores/order.status.store.js', () => ({
  useOrderStatusStore: vi.fn(() => mockStatusStore)
}))

describe('Order_EditDialog', () => {
  let wrapper

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Create a Suspense wrapper for the async component
    const SuspenseWrapper = {
      template: `
        <Suspense>
          <OrderEditDialog :registerId="1" :id="1" />
          <template #fallback>
            <div>Loading...</div>
          </template>
        </Suspense>
      `,
      components: {
        OrderEditDialog
      }
    }
    
    wrapper = mount(SuspenseWrapper, {
      global: {
        stubs: {
          Form: FormStub,
          Field: FieldStub
        }
      }
    })

    // Wait for async operations to complete
    await nextTick()
    await nextTick() // Extra tick to ensure async operations complete
  })

  it('renders the order edit dialog', () => {
    const heading = wrapper.find('h1')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toContain('Заказ')
  })

  it('includes all required order fields', () => {
    // Test some key fields (excluding commented out fields like rowNumber and orderNumber)
    const fieldsToCheck = [
      'statusId',
      'tnVed', 
      'invoiceDate',
      'extId',
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

  it('renders save and cancel buttons', () => {
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    
    const buttonTexts = buttons.map(btn => btn.text())
    expect(buttonTexts).toContain('Сохранить')
    expect(buttonTexts).toContain('Отменить')
  })

  it('calls getById on mount', () => {
    expect(mockOrdersStore.getById).toHaveBeenCalledWith(1)
  })

  it('calls ensureStatusesLoaded on mount', () => {
    expect(mockStatusStore.ensureStatusesLoaded).toHaveBeenCalled()
  })
})
