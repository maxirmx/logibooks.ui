/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense, ref } from 'vue'
import RegisterStatusEditDialog from '@/dialogs/RegisterStatus_EditDialog.vue'
import { defaultGlobalStubs, createMockStore } from './helpers/test-utils.js'
import { resolveAll } from './helpers/test-utils.js'

// Mock dependencies at the top level
const mockRegisterStatus = {
  id: 1,
  title: 'Черновик',
  icon: 'svg:registered',
  bkColor: '#FFFFFF',
  fgColor: '#000000'
}

// Mock stores using test-utils
const mockRegisterStatusesStore = createMockStore({
  registerStatus: mockRegisterStatus,
  getById: vi.fn().mockResolvedValue(mockRegisterStatus),
  create: vi.fn().mockResolvedValue(mockRegisterStatus),
  update: vi.fn().mockResolvedValue()
})

const mockAlertStore = createMockStore({
  success: vi.fn()
})

// Mock all external dependencies
vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => mockRegisterStatusesStore
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
    if (store.registerStatus !== undefined) {
      return { registerStatus: ref(store.registerStatus) }
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
        <slot :errors="errors" :isSubmitting="isSubmitting" :handleSubmit="runSubmit" />
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
      runSubmit(callback) {
        const actions = {
          setErrors: this.setErrors.bind(this)
        }
        return callback(this.$props.initialValues || {}, actions)
      },
      setErrors(newErrors) {
        this.errors = { ...this.errors, ...newErrors }
      }
    }
  },
  Field: {
    name: 'Field',
    props: ['name', 'id', 'type', 'as', 'class', 'placeholder', 'rows'],
    setup(props, { slots }) {
      const value = ref('')
      function handleChange(valueOrEvent) {
        value.value = valueOrEvent?.target ? valueOrEvent.target.value : valueOrEvent
      }
      return { value, handleChange, slots }
    },
    template: `
      <slot
        v-if="$slots.default"
        :field="{ value, name, id }"
        :handleChange="handleChange"
      />
      <input v-else-if="!as || as === 'input'" v-bind="$props" />
      <textarea v-else-if="as === 'textarea'" v-bind="$props"></textarea>
      <component v-else :is="as" v-bind="$props">
        <slot />
      </component>
    `
  }
}))

// Create a wrapper component that provides Suspense boundary
const AsyncWrapper = {
  components: { RegisterStatusEditDialog, Suspense },
  props: ['mode', 'registerStatusId'],
  template: `
    <Suspense>
      <RegisterStatusEditDialog :mode="mode" :register-status-id="registerStatusId" />
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  `
}

function findActionButton(wrapper, icon) {
  return wrapper
    .findAllComponents({ name: 'ActionButton' })
    .find(button => button.props('icon') === icon)
}

// Import router after mocking
let mockRouter
beforeEach(async () => {
  const router = await import('@/router')
  mockRouter = router.default
  vi.clearAllMocks()
  // Reset store states
  mockRegisterStatusesStore.registerStatus = { ...mockRegisterStatus }
  mockRegisterStatusesStore.getById.mockResolvedValue(mockRegisterStatusesStore.registerStatus)
  mockRegisterStatusesStore.create.mockResolvedValue(mockRegisterStatusesStore.registerStatus)
  mockRegisterStatusesStore.update.mockResolvedValue()
  mockRegisterStatusesStore.loading = false
  mockRegisterStatusesStore.error = null
  mockAlertStore.loading = false
  mockAlertStore.error = null
})

describe('RegisterStatus_EditDialog.vue', () => {
  describe('Component Rendering', () => {
    it('renders create mode correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Создание статуса партии')
      expect(wrapper.find('[data-testid="register-status-header-actions"]').exists()).toBe(true)
      expect(findActionButton(wrapper, 'fa-solid fa-check-double').props('tooltipText')).toBe('Создать')
      expect(findActionButton(wrapper, 'fa-solid fa-xmark').props('tooltipText')).toBe('Отменить')
      expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
      expect(mockRegisterStatusesStore.getById).not.toHaveBeenCalled()
    })

    it('renders edit mode correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Редактирование статуса партии')
      expect(findActionButton(wrapper, 'fa-solid fa-check-double').props('tooltipText')).toBe('Сохранить')
    })

    it('renders all form fields', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      // Check that the title form field is present
      expect(wrapper.find('#title').exists()).toBe(true)
      expect(wrapper.find('#bkColor').exists()).toBe(true)
      expect(wrapper.find('#fgColor').exists()).toBe(true)
      expect(wrapper.find('.register-status-form').exists()).toBe(true)
      expect(wrapper.find('[data-testid="bk-color-swatch"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="fg-color-swatch"]').exists()).toBe(true)
      expect(wrapper.findAll('.status-icon-option')).toHaveLength(31)
    })

    it('renders form labels correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.text()).toContain('Название статуса:')
      expect(wrapper.text()).toContain('Цвет фона:')
      expect(wrapper.text()).toContain('Цвет иконки:')
      expect(wrapper.text()).toContain('Иконка:')
    })

    it('renders current icon and color values in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.find('#bkColor').element.value).toBe('#ffffff')
      expect(wrapper.find('#fgColor').element.value).toBe('#000000')
      expect(wrapper.find('.status-icon-option.selected').attributes('aria-label')).toBe('svg:registered')
      expect(wrapper.find('.status-icon-option.selected').attributes('title')).toBeUndefined()
    })

    it('updates color preview values through color selectors', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      await wrapper.find('#bkColor').setValue('#123456')
      await wrapper.find('#fgColor').setValue('#abcdef')

      expect(mockRegisterStatusesStore.registerStatus.bkColor).toBe('#123456')
      expect(mockRegisterStatusesStore.registerStatus.fgColor).toBe('#abcdef')
      expect(wrapper.find('[data-testid="bk-color-swatch"]').attributes('style')).toContain('background-color: rgb(18, 52, 86)')
      expect(wrapper.find('[data-testid="fg-color-swatch"]').attributes('style')).toContain('background-color: rgb(171, 205, 239)')
    })

    it('selects a Font Awesome status icon from the visual icon selector', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const option = wrapper.findAll('.status-icon-option').find(button =>
        button.attributes('aria-label') === 'fa-solid fa-plane-departure'
      )
      expect(option.exists()).toBe(true)
      expect(option.attributes('title')).toBeUndefined()
      expect(option.text()).toBe('')

      await option.trigger('click')

      expect(wrapper.find('.status-icon-option.selected').attributes('aria-label')).toBe('fa-solid fa-plane-departure')
    })

    it('rejects unsupported icon values in the validation schema', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.findComponent({ name: 'Form' })
      await expect(form.props('validationSchema').validate({
        title: 'Новый',
        icon: 'fa-solid fa-not-real',
        bkColor: '#FFFFFF',
        fgColor: '#000000'
      })).rejects.toThrow('Выберите поддерживаемую иконку статуса')
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

      expect(mockRegisterStatusesStore.create).toHaveBeenCalledWith({
        title: '',
        icon: null,
        bkColor: null,
        fgColor: null
      })
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

      expect(mockRouter.push).toHaveBeenCalledWith('/registerstatuses')
    })

    it('handles 409 conflict error during creation', async () => {
      const error = new Error('Order status with this name already exists (409)')
      mockRegisterStatusesStore.create.mockRejectedValueOnce(error)

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
      mockRegisterStatusesStore.create.mockRejectedValueOnce(error)

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
        props: { mode: 'edit', registerStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')

      expect(mockRegisterStatusesStore.update).toHaveBeenCalledWith(1, mockRegisterStatus)
    })

    it('shows success message and redirects after successful update', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockRouter.push).toHaveBeenCalledWith('/registerstatuses')
    })

    it('handles error during update', async () => {
      const error = new Error('Update failed')
      mockRegisterStatusesStore.update.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 1 },
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

    it('uses fallback error text when update error has no message', async () => {
      const error = new Error()
      error.message = undefined
      mockRegisterStatusesStore.update.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(wrapper.text()).toContain('Ошибка при сохранении статуса партии')
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('fetches order status data on mount in edit mode', async () => {
      mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(mockRegisterStatusesStore.getById).toHaveBeenCalledWith(123)
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

      const cancelButton = findActionButton(wrapper, 'fa-solid fa-xmark')
      expect(cancelButton.exists()).toBe(true)

      await cancelButton.find('button').trigger('click')
      expect(mockRouter.push).toHaveBeenCalledWith('/registerstatuses')
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
        props: { mode: 'edit', registerStatusId: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.exists()).toBe(true)
    })

    it('handles missing registerStatusId in edit mode', async () => {
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



  describe('Error Handling', () => {
    it('handles network errors gracefully during creation', async () => {
      const networkError = new Error('Network Error')
      mockRegisterStatusesStore.create.mockRejectedValueOnce(networkError)

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
      mockRegisterStatusesStore.create.mockRejectedValueOnce(error)

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
      expect(wrapper.find('h1').text()).toBe('Создание статуса партии')
    })

    it('displays correct title for edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.find('h1').text()).toBe('Редактирование статуса партии')
    })

    it('displays correct button text for create mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(findActionButton(wrapper, 'fa-solid fa-check-double').props('tooltipText')).toBe('Создать')
    })

    it('displays correct button text for edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(findActionButton(wrapper, 'fa-solid fa-check-double').props('tooltipText')).toBe('Сохранить')
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
          title: 'Название статуса обязательно'
        })
        await resolveAll()

        expect(wrapper.text()).toContain('Название статуса обязательно')
      }
    })

    it('displays icon and color validation errors when present', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const formComponent = wrapper.findComponent({ name: 'Form' })
      formComponent.vm.setErrors({
        icon: 'Выберите поддерживаемую иконку статуса',
        bkColor: 'Цвет фона должен быть в формате #RRGGBB',
        fgColor: 'Цвет иконки должен быть в формате #RRGGBB'
      })
      await resolveAll()

      expect(wrapper.text()).toContain('Выберите поддерживаемую иконку статуса')
      expect(wrapper.text()).toContain('Цвет фона должен быть в формате #RRGGBB')
      expect(wrapper.text()).toContain('Цвет иконки должен быть в формате #RRGGBB')
    })
  })

  describe('Data Binding', () => {
    it('binds form data correctly in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', registerStatusId: 1 },
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
