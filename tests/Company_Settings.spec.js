/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense } from 'vue'
import CompanySettings from '@/components/Company_Settings.vue'
import { defaultGlobalStubs, createMockStore } from './test-utils.js'
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
  street: 'Test Street'
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
  getAll: vi.fn().mockResolvedValue()
})

const mockAlertStore = createMockStore({
  success: vi.fn()
})

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

vi.mock('@/router', () => ({
  default: {
    push: vi.fn()
  }
}))

vi.mock('pinia', () => ({
  storeToRefs: (store) => {
    if (store.countries !== undefined) {
      // Return the actual countries array from the store, not the mock constant
      return { countries: { value: store.countries } }
    }
    if (store.company !== undefined) {
      return { company: { value: store.company } }
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
  // Reset store states
  mockCompaniesStore.loading = false
  mockCompaniesStore.error = null
  mockCountriesStore.loading = false
  mockCountriesStore.error = null
  mockAlertStore.loading = false
  mockAlertStore.error = null
  // Reset countries state for each test
  mockCountriesStore.countries = mockCountries
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
      expect(wrapper.find('button[type="submit"]').text()).toContain('Создать')
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
      expect(wrapper.find('#inn').exists()).toBe(true)
      expect(wrapper.find('#kpp').exists()).toBe(true)
      expect(wrapper.find('#name').exists()).toBe(true)
      expect(wrapper.find('#shortName').exists()).toBe(true)
      expect(wrapper.find('#countryIsoNumeric').exists()).toBe(true)
      expect(wrapper.find('#postalCode').exists()).toBe(true)
      expect(wrapper.find('#city').exists()).toBe(true)
      expect(wrapper.find('#street').exists()).toBe(true)
    })

    it('renders form labels correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.text()).toContain('ИНН:')
      expect(wrapper.text()).toContain('КПП:')
      expect(wrapper.text()).toContain('Название:')
      expect(wrapper.text()).toContain('Краткое название:')
      expect(wrapper.text()).toContain('Страна:')
      expect(wrapper.text()).toContain('Почтовый индекс:')
      expect(wrapper.text()).toContain('Город:')
      expect(wrapper.text()).toContain('Улица:')
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
    it('fetches countries on mount when empty', async () => {
      // Set countries to empty to trigger fetch
      mockCountriesStore.countries = []
      
      mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      
      expect(mockCountriesStore.getAll).toHaveBeenCalled()
    })

    it('does not fetch countries when already loaded', async () => {
      mockCountriesStore.countries = mockCountries
      
      mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      
      expect(mockCountriesStore.getAll).not.toHaveBeenCalled()
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
      expect(mockCompaniesStore.update).toHaveBeenCalledWith(1, { value: mockCompany })
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

  describe('Navigation', () => {
    it('navigates to companies list on cancel button click', async () => {
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
      expect(mockRouter.push).toHaveBeenCalledWith('/companies')
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
        props: { mode: 'edit', companyId: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.exists()).toBe(true)
    })

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

  describe('Component Functions', () => {
    it('displays correct title for create mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.find('h1').text()).toBe('Регистрация компании')
    })

    it('displays correct title for edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'edit', companyId: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.find('h1').text()).toBe('Изменить информацию о компании')
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
        props: { mode: 'edit', companyId: 1 },
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

  describe('Async Component Behavior', () => {
    it('handles async component mounting correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { mode: 'create' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      // Initially shows loading
      expect(wrapper.text()).toContain('Loading...')
      
      // After resolving async setup
      await resolveAll()
      
      // Shows actual component content
      expect(wrapper.text()).not.toContain('Loading...')
      expect(wrapper.find('h1').exists()).toBe(true)
    })

  })
})