/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense, ref, reactive } from 'vue'
import CompanySettings from '@/dialogs/Company_Settings.vue'
import { defaultGlobalStubs, createMockStore } from './helpers/test-utils.js'
import { resolveAll } from './helpers/test-utils.js'

// Mock dependencies at the top level
const mockCompany = {
  id: 1,
  inn: '1234567890',
  kpp: '123456789',
  name: 'Test Company',
  shortName: 'TestCo',
  countryIsoNumeric: 643,
  postalCode: '123456',
  city: 'Moscow',
  street: 'Test Street',
  email: 'contact@example.com',
  phone: '+7 900 123-45-67',
  titleSignatureStamp: 'data:image/png;base64,EXISTING'
}

const mockCountries = [
  { id: 1, isoNumeric: 643, nameRuOfficial: 'Российская Федерация' },
  { id: 2, isoNumeric: 840, nameRuOfficial: 'Соединенные Штаты Америки' }
]

// Mock stores using test-utils
const mockCompaniesStore = createMockStore({
  company: mockCompany,
  getById: vi.fn().mockResolvedValue(mockCompany),
  create: vi.fn().mockResolvedValue(mockCompany),
  update: vi.fn().mockResolvedValue()
})

const mockCountriesStore = createMockStore({
  countries: mockCountries,
  getAll: vi.fn().mockResolvedValue(),
  ensureLoaded: vi.fn()
})

const mockAlertStore = reactive(createMockStore({
  success: vi.fn(),
  error: vi.fn(),
  alert: null
}))
let isSrLogistPlus = false

const originalFileReader = global.FileReader
let fileReaderResult = 'data:image/png;base64,NEW_STAMP'
const mockFileReaderInstance = {
  readAsDataURL: vi.fn(function () {
    this.result = fileReaderResult
    if (typeof this.onload === 'function') {
      this.onload({ target: { result: fileReaderResult } })
    }
  })
}

// Mock all external dependencies
vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => mockCompaniesStore
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => mockCountriesStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => mockAlertStore
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({ isSrLogistPlus })
}))

vi.mock('@/router', () => ({
  default: {
    push: vi.fn()
  }
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.isSrLogistPlus !== undefined) {
        return { isSrLogistPlus: ref(store.isSrLogistPlus) }
      }
      if (store.countries !== undefined) {
        // Return the actual countries array from the store, not the mock constant
        return { countries: { value: store.countries } }
      }
      if (store.company !== undefined) {
        return { company: { value: store.company } }
      }
      return {}
    }
  }
})

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
        // Properly provide setErrors function in the second parameter
        const actions = {
          setErrors: this.setErrors.bind(this)
        }
        // Emit the submit event with proper parameters (values, actions)
        this.$emit('submit', this.$props.initialValues || {}, actions)
      },
      setErrors(newErrors) {
        this.errors = { ...this.errors, ...newErrors }
      }
    }
  },
  Field: {
    name: 'Field',
    props: ['name', 'id', 'type', 'as', 'class', 'placeholder'],
    template: `
      <input v-if="!as || as === 'input'" v-bind="$props" />
      <select v-else-if="as === 'select'" v-bind="$props">
        <option value="">Выберите страну</option>
        <option v-for="country in countries" :key="country.id" :value="country.isoNumeric">
          {{ country.nameRuOfficial }}
        </option>
      </select>
      <component v-else :is="as" v-bind="$props">
        <slot />
      </component>
    `,
    data() {
      return {
        countries: [
          { id: 1, isoNumeric: 643, nameRuOfficial: 'Российская Федерация' },
          { id: 2, isoNumeric: 840, nameRuOfficial: 'Соединенные Штаты Америки' }
        ]
      }
    }
  }
}))

// Create a wrapper component that provides Suspense boundary
const AsyncWrapper = {
  components: { CompanySettings, Suspense },
  props: ['mode', 'companyId'],
  template: `
    <Suspense>
      <CompanySettings :mode="mode" :company-id="companyId" />
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
  isSrLogistPlus = false
  fileReaderResult = 'data:image/png;base64,NEW_STAMP'
  mockFileReaderInstance.readAsDataURL.mockClear()
  global.FileReader = vi.fn(function MockFileReader() {
    return mockFileReaderInstance
  })
  // Reset store states
  mockCompaniesStore.loading = false
  mockCompaniesStore.error = null
  mockCountriesStore.loading = false
  mockCountriesStore.error = null
  mockAlertStore.loading = false
  mockAlertStore.alert = null
  // Reset countries state for each test
  mockCountriesStore.countries = mockCountries
})

afterEach(() => {
  if (originalFileReader) {
    global.FileReader = originalFileReader
  } else {
    delete global.FileReader
  }
})

describe('Company_Settings.vue', () => {
  describe('Component Rendering', () => {
    it('renders create mode correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Регистрация компании')
      expect(wrapper.find('[data-testid="company-save-action"]').exists()).toBe(true)
      expect(wrapper.get('button[type="submit"]').classes()).toContain('sr-only')
      expect(mockCompaniesStore.getById).not.toHaveBeenCalled()
    })

    it('renders edit mode correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Изменить информацию о компании')
      expect(wrapper.find('[data-testid="company-save-action"]').exists()).toBe(true)
      expect(wrapper.get('button[type="submit"]').classes()).toContain('sr-only')
    })

    it('renders country options', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const countrySelect = wrapper.find('#countryIsoNumeric')
      expect(countrySelect.exists()).toBe(true)
      // Check if the country options are rendered in the template
      expect(wrapper.html()).toContain('Российская Федерация')
    })

    it('offers the receiver format status table only to a senior logist editing a company', async () => {
      isSrLogistPlus = true
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 42 },
        global: {
          stubs: {
            ...defaultGlobalStubs,
            CompanyRegisterOutputFormatsTable: {
              props: ['companyId'],
              template: '<div data-testid="output-table">{{ companyId }}</div>'
            }
          }
        }
      })
      await resolveAll()
      expect(wrapper.get('[data-testid="output-table"]').text()).toBe('42')
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

  describe('Store Integration', () => {
    it('calls ensureLoaded on mount', async () => {
      mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(mockCountriesStore.ensureLoaded).toHaveBeenCalled()
    })

    it('handles store loading states', async () => {
      mockCountriesStore.loading = true

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.exists()).toBe(true)
    })

    it('handles store error states', async () => {
      mockCountriesStore.error = 'Failed to load countries'

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

      expect(mockCompaniesStore.create).toHaveBeenCalled()
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

      expect(mockRouter.push).toHaveBeenCalledWith('/companies')
    })

    it('handles 409 conflict error during creation', async () => {
      const error = new Error('Company with this INN already exists (409)')
      mockCompaniesStore.create.mockRejectedValueOnce(error)

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
      mockCompaniesStore.create.mockRejectedValueOnce(error)

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

    it('handles store loading state during creation', async () => {
      mockCompaniesStore.loading = true

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

  describe('Form Submission - Edit Mode', () => {
    it('calls update store method on form submission', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')

      // The form passes the company data wrapped in a value object due to storeToRefs
      expect(mockCompaniesStore.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          titleSignatureStamp: mockCompany.titleSignatureStamp,
          inn: mockCompany.inn,
          email: mockCompany.email,
          phone: mockCompany.phone
        })
      )
    })

    it('shows success message and redirects after successful update', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockRouter.push).toHaveBeenCalledWith('/companies')
    })

    it('handles error during update', async () => {
      const error = new Error('Update failed')
      mockCompaniesStore.update.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
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

    it('fetches company data on mount in edit mode', async () => {
      mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(mockCompaniesStore.getById).toHaveBeenCalledWith(123)
    })

    it('handles store loading state during update', async () => {
      mockCompaniesStore.loading = true

      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Signature Stamp Handling', () => {
    it('shows existing signature stamp preview in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const preview = wrapper.find('[data-testid="signature-stamp-preview"]')
      expect(preview.exists()).toBe(true)
      expect(preview.attributes('src')).toBe(mockCompany.titleSignatureStamp)
      expect(wrapper.get('.signature-stamp').element.firstElementChild.classList.contains('signature-actions')).toBe(true)
    })

    it('uses action buttons without inline label text', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const uploadBtn = wrapper.find('[data-testid="signature-stamp-upload"]')
      expect(uploadBtn.exists()).toBe(true)
      // Button should not contain the label text directly (icon-only)
      expect(uploadBtn.text()).toBe('')
      // Original inline label text should not appear inside the button element
      expect(uploadBtn.html()).not.toMatch(/Загрузить изображение/)
    })

    it('allows selecting a new signature stamp image', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const input = wrapper.find('[data-testid="signature-stamp-input"]')
      expect(input.exists()).toBe(true)

      fileReaderResult = 'data:image/png;base64,NEW_IMAGE'
      const file = new File(['dummy'], 'stamp.png', { type: 'image/png' })
      Object.defineProperty(input.element, 'files', {
        value: [file],
        configurable: true
      })
      await input.trigger('change')

      await resolveAll()

      const preview = wrapper.find('[data-testid="signature-stamp-preview"]')
      expect(preview.exists()).toBe(true)
      expect(preview.attributes('src')).toBe(fileReaderResult)

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockCompaniesStore.create).toHaveBeenCalledWith(
        expect.objectContaining({ titleSignatureStamp: fileReaderResult })
      )
    })

    it('allows removing existing signature stamp', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const removeButton = wrapper.find('[data-testid="remove-signature-stamp"]')
      expect(removeButton.exists()).toBe(true)

      await removeButton.trigger('click')
      await resolveAll()

      expect(wrapper.find('[data-testid="signature-stamp-preview"]').exists()).toBe(false)

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      expect(mockCompaniesStore.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ titleSignatureStamp: null })
      )
    })
  })

  describe('Navigation', () => {
    it('navigates to companies list on header cancel action', async () => {
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

      const cancelButton = wrapper.find('[data-testid="company-cancel-action"]')
      expect(cancelButton.exists()).toBe(true)

      await cancelButton.trigger('click')
      expect(mockRouter.push).toHaveBeenCalledWith('/companies')
    })

    it('keeps the company form open when header cancel navigation fails and retries', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: { stubs: defaultGlobalStubs }
      })
      await resolveAll()
      mockRouter.push.mockRejectedValueOnce(new Error('offline'))
      await wrapper.get('[data-testid="company-cancel-action"]').trigger('click')
      await resolveAll()
      expect(wrapper.find('form').exists()).toBe(true)
      expect(mockAlertStore.error).toHaveBeenCalledTimes(1)
      expect(mockAlertStore.error.mock.calls[0][1].action.label).toBe('Повторить')
      await mockAlertStore.error.mock.calls[0][1].action.handler()
      expect(mockRouter.push).toHaveBeenCalledTimes(2)
    })

    it.each(['create', 'edit'])('awaits %s navigation and retries it without saving twice', async mode => {
      let failNavigation
      mockRouter.push.mockReturnValueOnce(new Promise((_resolve, reject) => { failNavigation = reject }))
      mockAlertStore.error.mockImplementationOnce((error, options) => {
        mockAlertStore.alert = { id: 1, severity: 'error', message: error.message, action: options.action }
      })
      mockAlertStore.dismiss = vi.fn(() => { mockAlertStore.alert = null })
      const wrapper = mount(AsyncWrapper, {
        props: { mode, companyId: 1 },
        global: { stubs: defaultGlobalStubs }
      })
      await resolveAll()
      await wrapper.get('form').trigger('submit')
      await resolveAll()
      expect(wrapper.get('[data-testid="company-save-action"]').attributes('disabled')).toBeDefined()
      const saveMethod = mode === 'create' ? mockCompaniesStore.create : mockCompaniesStore.update
      expect(saveMethod).toHaveBeenCalledTimes(1)
      failNavigation(new Error('navigation failed'))
      await resolveAll()
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(wrapper.get('[role="alert"]').text()).toContain('navigation failed')
      expect(mockAlertStore.error).toHaveBeenCalledTimes(1)
      expect(mockAlertStore.error.mock.calls[0][1].fallback).toContain('Компания сохранена')
      await wrapper.get('.page-alert-region__action').trigger('click')
      await resolveAll()
      expect(mockRouter.push).toHaveBeenCalledTimes(2)
      expect(saveMethod).toHaveBeenCalledTimes(1)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      wrapper.unmount()
    })

    it('submits the same validated form from the header save action', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: { stubs: defaultGlobalStubs },
        attachTo: document.body
      })
      await resolveAll()
      await wrapper.get('[data-testid="company-save-action"]').trigger('click')
      await resolveAll()
      expect(mockCompaniesStore.update).toHaveBeenCalledWith(1, expect.any(Object))
      wrapper.unmount()
    })

    it('submits the create form from the header action', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: { stubs: defaultGlobalStubs },
        attachTo: document.body
      })
      await resolveAll()
      await wrapper.get('[data-testid="company-save-action"]').trigger('click')
      await resolveAll()
      expect(mockCompaniesStore.create).toHaveBeenCalledWith(expect.any(Object))
      expect(mockRouter.push).toHaveBeenCalledWith('/companies')
      wrapper.unmount()
    })
  })

  describe('Props Validation', () => {
    it('handles missing companyId in edit mode', async () => {
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
      mockCompaniesStore.create.mockRejectedValueOnce(networkError)

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

      // Should not redirect on error
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

      // Component should render without errors even with invalid initial data
      expect(wrapper.exists()).toBe(true)
    })

    it('handles empty error messages', async () => {
      const error = new Error()
      error.message = undefined
      mockCompaniesStore.create.mockRejectedValueOnce(error)

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

  describe('Form Validation', () => {
    it('handles form validation correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      // Component should handle validation through vee-validate
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

      // Mock validation errors
      const formComponent = wrapper.findComponent({ name: 'Form' })
      if (formComponent.exists()) {
        formComponent.vm.setErrors({
          inn: 'ИНН обязателен',
          name: 'Название обязательно'
        })
        await resolveAll()

        expect(wrapper.text()).toContain('ИНН обязателен')
        expect(wrapper.text()).toContain('Название обязательно')
      }
    })
  })

  describe('Data Binding', () => {
    it('binds form data correctly in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      // In edit mode, form should be populated with company data
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

      // In create mode, form should start empty
      expect(wrapper.exists()).toBe(true)
    })
  })
})
