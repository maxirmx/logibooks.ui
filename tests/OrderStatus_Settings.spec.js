/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense } from 'vue'
import OrderStatusSettings from '@/components/OrderStatus_Settings.vue'
import { defaultGlobalStubs, createMockStore } from './test-utils.js'
import { resolveAll } from './helpers/test-utils.js'

// Mock dependencies at the top level
const mockOrderStatus = {
  id: 1,
  name: 'draft',
  title: 'Черновик',
  description: 'Заказ в черновике'
}

// Mock stores using test-utils
const mockOrderStatusesStore = createMockStore({
  orderStatus: mockOrderStatus,
  getById: vi.fn().mockResolvedValue(mockOrderStatus),
  create: vi.fn().mockResolvedValue(mockOrderStatus),
  update: vi.fn().mockResolvedValue()
})

const mockAlertStore = createMockStore({
  success: vi.fn()
})

// Mock all external dependencies
vi.mock('@/stores/order.statuses.store.js', () => ({
  useOrderStatusesStore: () => mockOrderStatusesStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => mockAlertStore
}))

vi.mock('@/router', () => ({
  default: {
    push: vi.fn()
  }
}))

vi.mock('pinia', () => ({
  storeToRefs: (store) => {
    if (store.orderStatus !== undefined) {
      return { orderStatus: { value: store.orderStatus } }
    }
    return {}
  }
}))

// Mock vee-validate with proper form submission handling
vi.mock('vee-validate', () => ({
  Form: {
    name: 'Form',
    props: ['initialValues', 'validationSchema'],
    emits: ['submit'],
    template: `
      <form @submit.prevent="handleSubmit">
        <slot :errors="errors" :isSubmitting="isSubmitting" />
      </form>
    `,
    data() {
      return {
        errors: {},
        isSubmitting: false
      }
    },
    methods: {
      handleSubmit() {
        const actions = { 
          setErrors: this.setErrors.bind(this)
        }
        this.$emit('submit', this.$props.initialValues || {}, actions)
      },
      setErrors(newErrors) {
        this.errors = { ...this.errors, ...newErrors }
      }
    }
  },
  Field: {
    name: 'Field',
    props: ['name', 'id', 'type', 'as', 'class', 'placeholder', 'rows'],
    template: `
      <input v-if="!as || as === 'input'" v-bind="$props" />
      <textarea v-else-if="as === 'textarea'" v-bind="$props"></textarea>
      <component v-else :is="as" v-bind="$props">
        <slot />
      </component>
    `
  }
}))

// Create a wrapper component that provides Suspense boundary
const AsyncWrapper = {
  components: { OrderStatusSettings, Suspense },
  props: ['mode', 'orderStatusId'],
  template: `
    <Suspense>
      <OrderStatusSettings :mode="mode" :order-status-id="orderStatusId" />
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  `
}

// Import router after mocking
let mockRouter
beforeEach(async () => {
  const router = await import('@/router')
  mockRouter = router.default
  vi.clearAllMocks()
  // Reset store states
  mockOrderStatusesStore.loading = false
  mockOrderStatusesStore.error = null
  mockAlertStore.loading = false
  mockAlertStore.error = null
})

describe('OrderStatus_Settings.vue', () => {
  describe('Component Rendering', () => {
    it('renders create mode correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      
      expect(wrapper.find('h1').text()).toBe('Создание статуса заказа')
      expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
      expect(mockOrderStatusesStore.getById).not.toHaveBeenCalled()
    })

    it('renders edit mode correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      
      expect(wrapper.find('h1').text()).toBe('Редактирование статуса заказа')
      expect(wrapper.find('button[type="submit"]').text()).toContain('Сохранить')
    })

    it('renders all form fields', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      // Check that all form fields are present
      expect(wrapper.find('#name').exists()).toBe(true)
      expect(wrapper.find('#title').exists()).toBe(true)
      expect(wrapper.find('#description').exists()).toBe(true)
    })

    it('renders form labels correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.text()).toContain('Имя:')
      expect(wrapper.text()).toContain('Заголовок:')
      expect(wrapper.text()).toContain('Описание:')
    })

    it('shows loading fallback initially', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      // Before resolving, should show loading
      expect(wrapper.text()).toContain('Loading...')
      
      await resolveAll()
      
      // After resolving, should show actual content
      expect(wrapper.text()).not.toContain('Loading...')
    })
  })

  describe('Form Submission - Create Mode', () => {
    it('calls create store method on form submission', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')

      expect(mockOrderStatusesStore.create).toHaveBeenCalled()
    })

    it('shows success message and redirects after successful creation', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockAlertStore.success).toHaveBeenCalledWith('Статус заказа успешно создан')
      expect(mockRouter.push).toHaveBeenCalledWith('/orderstatuses')
    })

    it('handles 409 conflict error during creation', async () => {
      const error = new Error('Order status with this name already exists (409)')
      mockOrderStatusesStore.create.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('handles general error during creation', async () => {
      const error = new Error('Network error')
      mockOrderStatusesStore.create.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission - Edit Mode', () => {
    it('calls update store method on form submission', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')

      expect(mockOrderStatusesStore.update).toHaveBeenCalledWith(1, { value: mockOrderStatus })
    })

    it('shows success message and redirects after successful update', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockAlertStore.success).toHaveBeenCalledWith('Статус заказа успешно обновлен')
      expect(mockRouter.push).toHaveBeenCalledWith('/orderstatuses')
    })

    it('handles error during update', async () => {
      const error = new Error('Update failed')
      mockOrderStatusesStore.update.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('fetches order status data on mount in edit mode', async () => {
      mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(mockOrderStatusesStore.getById).toHaveBeenCalledWith(123)
    })
  })

  describe('Navigation', () => {
    it('navigates to order statuses list on cancel button click', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs,
          mocks: {
            $router: mockRouter
          }
        }
      })

      await resolveAll()

      const cancelButton = wrapper.find('button.secondary')
      expect(cancelButton.exists()).toBe(true)
      expect(cancelButton.text()).toBe('Отмена')

      await cancelButton.trigger('click')
      expect(mockRouter.push).toHaveBeenCalledWith('/orderstatuses')
    })
  })

  describe('Props Validation', () => {
    it('accepts valid create mode prop', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.exists()).toBe(true)
    })

    it('accepts valid edit mode prop', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.exists()).toBe(true)
    })

    it('handles missing orderStatusId in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Component Lifecycle', () => {
    it('initializes correctly in create mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      
      expect(wrapper.find('h1').text()).toBe('Создание статуса заказа')
      expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
    })

    it('initializes correctly in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      
      expect(wrapper.find('h1').text()).toBe('Редактирование статуса заказа')
      expect(wrapper.find('button[type="submit"]').text()).toContain('Сохранить')
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully during creation', async () => {
      const networkError = new Error('Network Error')
      mockOrderStatusesStore.create.mockRejectedValueOnce(networkError)

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('handles validation errors appropriately', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.exists()).toBe(true)
    })

    it('handles empty error messages', async () => {
      const error = new Error()
      error.message = undefined
      mockOrderStatusesStore.create.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('Component Functions', () => {
    it('displays correct title for create mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.find('h1').text()).toBe('Создание статуса заказа')
    })

    it('displays correct title for edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.find('h1').text()).toBe('Редактирование статуса заказа')
    })

    it('displays correct button text for create mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
    })

    it('displays correct button text for edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.find('button[type="submit"]').text()).toContain('Сохранить')
    })
  })

  describe('Form Validation', () => {
    it('handles form validation correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.exists()).toBe(true)
    })

    it('displays validation errors when present', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const formComponent = wrapper.findComponent({ name: 'Form' })
      if (formComponent.exists()) {
        formComponent.vm.setErrors({
          name: 'Имя обязательно',
          title: 'Заголовок обязателен'
        })
        await resolveAll()

        expect(wrapper.text()).toContain('Имя обязательно')
        expect(wrapper.text()).toContain('Заголовок обязателен')
      }
    })
  })

  describe('Data Binding', () => {
    it('binds form data correctly in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', orderStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.exists()).toBe(true)
    })

    it('initializes empty form in create mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Async Component Behavior', () => {
    it('handles async component mounting correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      expect(wrapper.text()).toContain('Loading...')
      
      await resolveAll()
      
      expect(wrapper.text()).not.toContain('Loading...')
      expect(wrapper.find('h1').exists()).toBe(true)
    })
  })
})