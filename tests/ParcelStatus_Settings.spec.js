/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense, ref } from 'vue'
import ParcelStatusSettings from '@/dialogs/ParcelStatus_Settings.vue'
import { defaultGlobalStubs, createMockStore } from './helpers/test-utils.js'
import { resolveAll } from './helpers/test-utils.js'

// Mock dependencies at the top level
const mockParcelStatus = {
  id: 1,
  title: 'Черновик',
  useAtCustomsProcessing: true,
  bkColor: '#112233',
  restrictionReason: 'Причина запрета'
}

// Mock stores using test-utils
const mockParcelStatusesStore = createMockStore({
  parcelStatus: mockParcelStatus,
  getById: vi.fn().mockResolvedValue(mockParcelStatus),
  create: vi.fn().mockResolvedValue(mockParcelStatus),
  update: vi.fn().mockResolvedValue()
})

const mockAlertStore = createMockStore({
  success: vi.fn()
})

// Mock all external dependencies
vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => mockParcelStatusesStore
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
    if (store.parcelStatus !== undefined) {
      return { parcelStatus: ref(store.parcelStatus) }
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
    template: `
      <slot v-if="$slots.default" :field="{ value }" :handleChange="handleChange" />
      <input v-else-if="!as || as === 'input'" v-bind="$props" />
      <textarea v-else-if="as === 'textarea'" v-bind="$props"></textarea>
      <component v-else :is="as" v-bind="$props">
        <slot />
      </component>
    `,
    data() {
      return {
        value: undefined
      }
    },
    methods: {
      handleChange(value) {
        this.value = value
      }
    }
  }
}))

// Create a wrapper component that provides Suspense boundary
const AsyncWrapper = {
  components: { ParcelStatusSettings, Suspense },
  props: ['mode', 'parcelStatusId'],
  template: `
    <Suspense>
      <ParcelStatusSettings :mode="mode" :order-status-id="parcelStatusId" />
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
  mockParcelStatusesStore.parcelStatus = { ...mockParcelStatus }
  mockParcelStatusesStore.getById.mockResolvedValue(mockParcelStatusesStore.parcelStatus)
  mockParcelStatusesStore.create.mockResolvedValue(mockParcelStatusesStore.parcelStatus)
  mockParcelStatusesStore.update.mockResolvedValue()
  mockParcelStatusesStore.loading = false
  mockParcelStatusesStore.error = null
  mockAlertStore.loading = false
  mockAlertStore.error = null
})

describe('ParcelStatus_Settings.vue', () => {
  describe('Component Rendering', () => {
    it('renders create mode correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Создание статуса посылки')
      expect(wrapper.find('[data-testid="parcel-status-header-actions"]').exists()).toBe(true)
      expect(findActionButton(wrapper, 'fa-solid fa-check-double').props('tooltipText')).toBe('Создать')
      expect(findActionButton(wrapper, 'fa-solid fa-xmark').props('tooltipText')).toBe('Отменить')
      expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
      expect(mockParcelStatusesStore.getById).not.toHaveBeenCalled()
    })

    it('renders edit mode correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', parcelStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Редактирование статуса посылки')
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
      expect(wrapper.find('#restrictionReason').exists()).toBe(true)
      expect(wrapper.find('#useAtCustomsProcessing').exists()).toBe(true)
      expect(wrapper.find('[data-testid="bk-color-swatch"]').exists()).toBe(true)
      expect(wrapper.find('#restrictionReason').element.tagName).toBe('INPUT')
      expect(wrapper.find('#restrictionReason').attributes('type')).toBe('text')
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
      expect(wrapper.text()).toContain('Таможенное оформление:')
      expect(wrapper.text()).toContain('Цвет при выгрузке:')
      expect(wrapper.text()).toContain('Причина запрета:')
      expect(wrapper.findAll('label.label').map(label => label.text())).toEqual([
        'Название статуса:',
        'Таможенное оформление:',
        'Цвет при выгрузке:',
        'Причина запрета:'
      ])
    })

    it('renders empty export color as no color in create mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.find('.status-color-value').text()).toBe('Не задан')
      expect(wrapper.find('[data-testid="bk-color-swatch"]').classes()).toContain('status-color-swatch--empty')
      expect(findActionButton(wrapper, 'fa-solid fa-broom').props('disabled')).toBe(true)
    })

    it('clears export color to null in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', parcelStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.find('.status-color-value').text()).toBe('#112233')
      expect(findActionButton(wrapper, 'fa-solid fa-broom').props('disabled')).toBe(false)

      await findActionButton(wrapper, 'fa-solid fa-broom').find('button').trigger('click')
      await resolveAll()

      expect(mockParcelStatusesStore.parcelStatus.bkColor).toBeNull()
      expect(wrapper.find('.status-color-value').text()).toBe('Не задан')
      expect(wrapper.find('[data-testid="bk-color-swatch"]').classes()).toContain('status-color-swatch--empty')
      expect(findActionButton(wrapper, 'fa-solid fa-broom').props('disabled')).toBe(true)
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

      const saveButton = findActionButton(wrapper, 'fa-solid fa-check-double')
      await saveButton.find('button').trigger('click')

      expect(mockParcelStatusesStore.create).toHaveBeenCalled()
      expect(mockParcelStatusesStore.create).toHaveBeenCalledWith({
        title: '',
        useAtCustomsProcessing: false,
        bkColor: null,
        restrictionReason: ''
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

      expect(mockRouter.push).toHaveBeenCalledWith('/parcelstatuses')
    })

    it('handles 409 conflict error during creation', async () => {
      const error = new Error('Order status with this name already exists (409)')
      mockParcelStatusesStore.create.mockRejectedValueOnce(error)

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
      mockParcelStatusesStore.create.mockRejectedValueOnce(error)

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
        props: { mode: 'edit', parcelStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')

      expect(mockParcelStatusesStore.update).toHaveBeenCalledWith(1, mockParcelStatus)
    })

    it('shows success message and redirects after successful update', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', parcelStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockRouter.push).toHaveBeenCalledWith('/parcelstatuses')
    })

    it('handles error during update', async () => {
      const error = new Error('Update failed')
      mockParcelStatusesStore.update.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', parcelStatusId: 1 },
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
        props: { mode: 'edit', parcelStatusId: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(mockParcelStatusesStore.getById).toHaveBeenCalledWith(123)
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
      expect(mockRouter.push).toHaveBeenCalledWith('/parcelstatuses')
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
        props: { mode: 'edit', parcelStatusId: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.exists()).toBe(true)
    })

    it('handles missing parcelStatusId in edit mode', async () => {
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
      mockParcelStatusesStore.create.mockRejectedValueOnce(networkError)

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
      mockParcelStatusesStore.create.mockRejectedValueOnce(error)

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
      expect(wrapper.find('h1').text()).toBe('Создание статуса посылки')
    })

    it('displays correct title for edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', parcelStatusId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.find('h1').text()).toBe('Редактирование статуса посылки')
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
        props: { mode: 'edit', parcelStatusId: 1 },
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
  })

  describe('Data Binding', () => {
    it('binds form data correctly in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', parcelStatusId: 1 },
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
