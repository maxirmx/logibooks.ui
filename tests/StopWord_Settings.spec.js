/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Suspense } from 'vue'
import StopWordSettings from '@/components/StopWord_Settings.vue'
import { defaultGlobalStubs, createMockStore } from './test-utils.js'
import { resolveAll } from './helpers/test-utils.js'

// Mock dependencies at the top level
const mockStopWord = {
  id: 1,
  word: 'тест',
  exactMatch: false
}

// Mock stores using test-utils
const mockStopWordsStore = createMockStore({
  stopWord: mockStopWord,
  getById: vi.fn().mockResolvedValue(mockStopWord),
  create: vi.fn().mockResolvedValue(mockStopWord),
  update: vi.fn().mockResolvedValue()
})

const mockAuthStore = createMockStore({
  user: { isAdmin: true }
})

const mockAlertStore = createMockStore({
  success: vi.fn(),
  error: vi.fn(),
  clear: vi.fn(),
  alert: null
})

// Mock all external dependencies
vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => mockStopWordsStore
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => mockAuthStore
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
    if (store.alert !== undefined) {
      return { alert: { value: store.alert } }
    }
    return {}
  }
}))

// Mock vee-validate with proper form handling  
const mockWordField = { value: '' }
const mockExactMatchField = { value: false }

vi.mock('vee-validate', () => ({
  useForm: () => ({
    errors: {},
    handleSubmit: (callback) => (values = {}) => callback({ 
      word: mockWordField.value, 
      exactMatch: mockExactMatchField.value, 
      ...values 
    }),
    resetForm: vi.fn()
  }),
  useField: (name) => {
    if (name === 'word') {
      return { 
        value: mockWordField,
        errorMessage: { value: '' }
      }
    }
    if (name === 'exactMatch') {
      return { 
        value: mockExactMatchField,
        errorMessage: { value: '' }
      }
    }
    return { 
      value: { value: '' },
      errorMessage: { value: '' }
    }
  }
}))

vi.mock('@vee-validate/yup', () => ({
  toTypedSchema: (schema) => schema
}))

vi.mock('yup', () => ({
  object: (schema) => schema,
  string: () => ({
    required: () => ({
      min: () => ({
        max: () => ({})
      })
    })
  }),
  boolean: () => ({
    required: () => ({})
  })
}))

// Create a wrapper component that provides Suspense boundary
const AsyncWrapper = {
  components: { StopWordSettings, Suspense },
  props: ['id'],
  template: `
    <Suspense>
      <StopWordSettings :id="id" />
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
  mockStopWordsStore.loading = false
  mockStopWordsStore.error = null
  mockAuthStore.user = { isAdmin: true }
  mockAlertStore.loading = false
  mockAlertStore.alert = null
  // Reset mock form fields
  mockWordField.value = ''
  mockExactMatchField.value = false
  
  // Reset all spies
  vi.clearAllMocks()
})

describe('StopWord_Settings.vue', () => {
  describe('Component Rendering', () => {
    it('renders create mode correctly for admin user', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.text()).toContain('Регистрация стоп-слова или фразы')
      expect(wrapper.text()).toContain('Сохранить')
      expect(mockStopWordsStore.getById).not.toHaveBeenCalled()
    })

    it('renders edit mode correctly for admin user', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      
      expect(wrapper.text()).toContain('Редактировать стоп-слово')
      expect(wrapper.text()).toContain('Сохранить')
    })

    it('renders all form fields for admin user', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      // Check that the word form field is present
      expect(wrapper.find('[data-testid="v-text-field"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Стоп-слово')
      expect(wrapper.text()).toContain('Тип соответствия')
      expect(wrapper.text()).toContain('Точное соответствие')
      expect(wrapper.text()).toContain('Морфологическое соответствие')
    })

    it('renders form labels correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.text()).toContain('Стоп-слово')
      expect(wrapper.text()).toContain('Тип соответствия')
    })

    it('renders action buttons correctly', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const buttons = wrapper.findAll('[data-testid="v-btn"]')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
      expect(wrapper.text()).toContain('Отмена')
      expect(wrapper.text()).toContain('Сохранить')
    })
  })

  describe('Form Submission - Create Mode', () => {
    it('calls create store method on form submission', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      // Get the component instance to call save method directly
      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.save()

      expect(mockStopWordsStore.create).toHaveBeenCalled()
    })

    it('navigates to stopwords list after successful creation', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.save()
      await resolveAll()

      expect(mockRouter.push).toHaveBeenCalledWith('/stopwords')
    })

    it('handles 409 conflict error during creation', async () => {
      const error = new Error('Stop word with this name already exists (409)')
      mockStopWordsStore.create.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.save()
      await resolveAll()

      expect(mockAlertStore.error).toHaveBeenCalledWith('Такое стоп-слово уже задано')
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('handles general error during creation', async () => {
      const error = new Error('Network error')
      mockStopWordsStore.create.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.save()
      await resolveAll()

      expect(mockAlertStore.error).toHaveBeenCalledWith('Ошибка при сохранении стоп-слова')
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission - Edit Mode', () => {
    it('calls update store method on form submission', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.save()

      expect(mockStopWordsStore.update).toHaveBeenCalledWith(1, expect.any(Object))
    })

    it('navigates to stopwords list after successful update', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.save()
      await resolveAll()

      expect(mockRouter.push).toHaveBeenCalledWith('/stopwords')
    })

    it('handles error during update', async () => {
      const error = new Error('Update failed')
      mockStopWordsStore.update.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { id: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.save()
      await resolveAll()

      expect(mockAlertStore.error).toHaveBeenCalledWith('Ошибка при сохранении стоп-слова')
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('fetches stopword data on mount in edit mode', async () => {
      mount(AsyncWrapper, {
        props: { id: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(mockStopWordsStore.getById).toHaveBeenCalledWith(123)
    })

    it('handles error when fetching stopword data', async () => {
      const error = new Error('Fetch failed')
      mockStopWordsStore.getById.mockRejectedValueOnce(error)

      mount(AsyncWrapper, {
        props: { id: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(mockAlertStore.error).toHaveBeenCalledWith('Ошибка при загрузке данных стоп-слова')
      expect(mockRouter.push).toHaveBeenCalledWith('/stopwords')
    })
  })

  describe('Navigation', () => {
    it('navigates to stopwords list on cancel button click', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.cancel()

      expect(mockRouter.push).toHaveBeenCalledWith('/stopwords')
    })
  })

  describe('Props Validation', () => {
    it('accepts valid create mode prop (null id)', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.exists()).toBe(true)
    })

    it('accepts valid edit mode prop (numeric id)', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: 123 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.exists()).toBe(true)
    })

    it('accepts valid edit mode prop (string id)', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: '123' },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.exists()).toBe(true)
    })

    it('handles undefined id prop', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: undefined },
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
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.text()).toContain('Регистрация стоп-слова или фразы')
      expect(wrapper.text()).toContain('Сохранить')
    })

    it('initializes correctly in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      
      expect(wrapper.text()).toContain('Редактировать стоп-слово')
      expect(wrapper.text()).toContain('Сохранить')
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully during creation', async () => {
      const networkError = new Error('Network Error')
      mockStopWordsStore.create.mockRejectedValueOnce(networkError)

      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.save()
      await resolveAll()

      expect(mockAlertStore.error).toHaveBeenCalledWith('Ошибка при сохранении стоп-слова')
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('handles empty error messages', async () => {
      const error = new Error()
      error.message = undefined
      mockStopWordsStore.create.mockRejectedValueOnce(error)

      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      await componentInstance.save()
      await resolveAll()

      expect(mockAlertStore.error).toHaveBeenCalledWith('Ошибка при сохранении стоп-слова')
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  describe('Component Functions', () => {
    it('displays correct title for create mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.text()).toContain('Регистрация стоп-слова или фразы')
    })

    it('displays correct title for edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.text()).toContain('Редактировать стоп-слово')
    })

    it('displays correct button text for both modes', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()
      expect(wrapper.text()).toContain('Сохранить')
    })
  })

  describe('Multi-word Input Handling', () => {
    it('trims input on word input', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const componentInstance = wrapper.findComponent(StopWordSettings).vm
      mockWordField.value = '  test  '
      componentInstance.onWordInput()

      expect(mockWordField.value).toBe('test')
    })
  })

  describe('Loading State', () => {
    it('shows loading state on save button when saving', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      const saveButton = wrapper.find('[data-testid="v-btn"]')
      expect(saveButton.exists()).toBe(true)
    })
  })

  describe('Data Binding', () => {
    it('binds form data correctly in edit mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: 1 },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.exists()).toBe(true)
      expect(mockStopWordsStore.getById).toHaveBeenCalledWith(1)
    })

    it('initializes empty form in create mode', async () => {
      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Admin Access Control', () => {
    it('shows form content for admin users', async () => {
      mockAuthStore.user = { isAdmin: true }

      const wrapper = mount(AsyncWrapper, {
        props: { id: null },
        global: {
          stubs: defaultGlobalStubs
        }
      })

      await resolveAll()

      expect(wrapper.text()).toContain('Регистрация стоп-слова или фразы')
    })
  })
})
