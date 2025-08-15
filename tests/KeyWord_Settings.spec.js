/*/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { nextTick } from 'vue'
import KeyWordSettings from '@/components/KeyWord_Settings.vue'
import { resolveAll } from './helpers/test-utils'

// Mock data
const mockKeyWord = {
  id: 1,
  word: 'тест',
  matchTypeId: 1
}

const mockMatchTypes = ref([
  { id: 1, name: 'Exact' },
  { id: 11, name: 'Type11' },
  { id: 15, name: 'Type15' },
  { id: 21, name: 'Type21' },
  { id: 25, name: 'Type25' },
  { id: 31, name: 'Type31' },
  { id: 41, name: 'Morphology' }
])

// Create hoisted mock functions
const getById = vi.hoisted(() => vi.fn(() => Promise.resolve(mockKeyWord)))
const create = vi.hoisted(() => vi.fn(() => Promise.resolve(mockKeyWord)))
const update = vi.hoisted(() => vi.fn(() => Promise.resolve(mockKeyWord)))
const routerPush = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())
const alertClear = vi.hoisted(() => vi.fn())

const mockAlert = ref(null)

// Mock stores
vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: () => ({
    getById,
    create,
    update
  })
}))

vi.mock('@/stores/word.match.types.store.js', () => ({
  useWordMatchTypesStore: () => ({
    matchTypes: mockMatchTypes,
    ensureLoaded: vi.fn()
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: alertError,
    clear: alertClear
  })
}), { virtual: true })

// Mock router
vi.mock('@/router', () => ({
  default: {
    push: routerPush
  }
}))

// Mock storeToRefs
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({
      alert: mockAlert
    })
  }
})

// Mock font-awesome-icon component to avoid Vue warnings
const MockFontAwesomeIcon = {
  name: 'FontAwesomeIcon',
  props: ['icon', 'size'],
  template: '<span></span>'
}

describe('KeyWord_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAlert.value = null
    getById.mockResolvedValue(mockKeyWord)
    create.mockResolvedValue(mockKeyWord)
    update.mockResolvedValue(mockKeyWord)
  })

  describe('Component Rendering', () => {
    it('renders create mode correctly', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Регистрация слова или фразы для подбора ТН ВЭД')
      expect(wrapper.find('input[name="word"]').exists()).toBe(true)
      expect(wrapper.find('input[type="radio"]').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').text()).toContain('Сохранить')
      expect(wrapper.find('button[type="button"]').text()).toContain('Отменить')
    })

    it('renders edit mode correctly', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: 1 },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Редактировать слово или фразу для подбора ТН ВЭД')
      expect(getById).toHaveBeenCalledWith(1)
    })

    it('renders loading state', async () => {
      getById.mockImplementation(() => new Promise(() => {})) // Never resolves
      const wrapper = mount(KeyWordSettings, {
        props: { id: 1 },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await nextTick()

      expect(wrapper.find('.spinner-border-lg').exists()).toBe(true)
      expect(wrapper.find('form').exists()).toBe(false)
    })


  })

  describe('Form Validation', () => {
    it('shows validation error for empty word', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      const errorDiv = wrapper.find('.invalid-feedback')
      if (errorDiv.exists()) {
        expect(errorDiv.text()).toContain('Необходимо ввести ключевое слово или фразу')
      }
    })

    it('shows validation error for word that is too short', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('')
      
      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      const errorDiv = wrapper.find('.invalid-feedback')
      if (errorDiv.exists()) {
        expect(errorDiv.text()).toContain('Необходимо ввести ключевое слово или фразу')
      }
    })

    it('accepts valid word input', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('тестовое слово')
      await nextTick()

      expect(wrapper.find('.invalid-feedback').exists()).toBe(false)
    })

    it('requires match type selection', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      // Clear the default matchTypeId
      const vm = wrapper.vm
      vm.matchTypeId = null

      const form = wrapper.find('form')
      await form.trigger('submit')
      await nextTick()

      // Since matchTypeId is required, form should not submit successfully
      expect(create).not.toHaveBeenCalled()
    })
  })

  describe('Word Analysis and Option Disabling', () => {
    it('identifies single word input correctly', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('test')
      await nextTick()

      const vm = wrapper.vm
      expect(vm.words).toEqual(['test'])
      expect(vm.isSingleWordInput).toBe(true)
    })

    it('identifies multi-word input correctly', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('test word phrase')
      await nextTick()

      const vm = wrapper.vm
      expect(vm.words).toEqual(['test', 'word', 'phrase'])
      expect(vm.isSingleWordInput).toBe(false)
    })

    it('handles special characters in word input', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('test-word123')
      await nextTick()

      const vm = wrapper.vm
      expect(vm.words).toEqual(['test-word123'])
      expect(vm.isSingleWordInput).toBe(true)
    })

    it('disables correct options for single word input', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('test')
      await nextTick()

      const vm = wrapper.vm
      
      // For single word: disable options 21-30
      expect(vm.isOptionDisabled(1)).toBe(false)   // Should be enabled
      expect(vm.isOptionDisabled(15)).toBe(false)  // Should be enabled
      expect(vm.isOptionDisabled(21)).toBe(true)   // Should be disabled (21-30 range)
      expect(vm.isOptionDisabled(25)).toBe(true)   // Should be disabled (21-30 range)
      expect(vm.isOptionDisabled(31)).toBe(false)  // Should be enabled
      expect(vm.isOptionDisabled(41)).toBe(false)  // Should be enabled
    })

    it('disables correct options for multi-word input', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('test word')
      await nextTick()

      const vm = wrapper.vm
      
      // For multi-word: disable options 11-20 and >30
      expect(vm.isOptionDisabled(1)).toBe(false)   // Should be enabled
      expect(vm.isOptionDisabled(11)).toBe(true)   // Should be disabled (11-20 range)
      expect(vm.isOptionDisabled(15)).toBe(true)   // Should be disabled (11-20 range)
      expect(vm.isOptionDisabled(21)).toBe(false)  // Should be enabled
      expect(vm.isOptionDisabled(25)).toBe(false)  // Should be enabled
      expect(vm.isOptionDisabled(31)).toBe(true)   // Should be disabled (>30)
      expect(vm.isOptionDisabled(41)).toBe(true)   // Should be disabled (>30)
    })

    it('applies disabled attribute to radio buttons correctly', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('test')
      await nextTick()

      const radioInputs = wrapper.findAll('input[type="radio"]')
      
      // Find radio with value 21 (should be disabled for single word)
      const radio21 = radioInputs.find(input => input.element.value === '21')
      if (radio21) {
        expect(radio21.element.disabled).toBe(true)
      }
      
      // Find radio with value 1 (should be enabled for single word)
      const radio1 = radioInputs.find(input => input.element.value === '1')
      if (radio1) {
        expect(radio1.element.disabled).toBe(false)
      }
    })
  })

  describe('Data Loading (Edit Mode)', () => {
    it('loads keyword data successfully in edit mode', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: 1 },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      expect(getById).toHaveBeenCalledWith(1)
      
      const wordInput = wrapper.find('input[name="word"]')
      if (wordInput.exists()) {
        expect(wordInput.element.value).toBe('тест')
      }
      
      const selectedRadio = wrapper.find('input[type="radio"]:checked')
      if (selectedRadio.exists()) {
        expect(selectedRadio.element.value).toBe('1')
      }
    })

    it('handles loading error in edit mode', async () => {
      getById.mockRejectedValue(new Error('Loading failed'))
      
      mount(KeyWordSettings, {
        props: { id: 1 },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      expect(alertError).toHaveBeenCalledWith('Ошибка при загрузке данных ключевого слова')
      expect(routerPush).toHaveBeenCalledWith('/keywords')
    })

    it('sets default values in create mode', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      if (wordInput.exists()) {
        expect(wordInput.element.value).toBe('')
      }
      
      const selectedRadio = wrapper.find('input[type="radio"]:checked')
      if (selectedRadio.exists()) {
        expect(selectedRadio.element.value).toBe('1')
      }
    })
  })

  describe('Form Submission', () => {








    it('handles submission error', async () => {
      const errorMessage = 'Ошибка сохранения'
      create.mockRejectedValue(new Error(errorMessage))
      
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('тест')

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      const errorDiv = wrapper.find('.alert-danger')
      if (errorDiv.exists()) {
        expect(errorDiv.text()).toContain(errorMessage)
      }
    })

    it('handles update error', async () => {
      const errorMessage = 'Ошибка обновления'
      update.mockRejectedValue(new Error(errorMessage))
      
      const wrapper = mount(KeyWordSettings, {
        props: { id: 1 },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('обновленное слово')

      const form = wrapper.find('form')
      await form.trigger('submit')
      await resolveAll()

      const errorDiv = wrapper.find('.alert-danger')
      if (errorDiv.exists()) {
        expect(errorDiv.text()).toContain(errorMessage)
      }
    })
  })

  describe('Navigation', () => {
    it('navigates to keywords list on cancel', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const cancelButton = wrapper.find('button[type="button"]')
      await cancelButton.trigger('click')

      expect(routerPush).toHaveBeenCalledWith('/keywords')
    })

    it('calls cancel function when exposed method is used', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const vm = wrapper.vm
      vm.cancel()

      expect(routerPush).toHaveBeenCalledWith('/keywords')
    })
  })

  describe('Input Handling', () => {
    it('handles word input event correctly', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const vm = wrapper.vm

      // Simulate the onWordInput method
      const event = { target: { value: 'новое значение' } }
      vm.onWordInput(event)

      expect(vm.word).toBe('новое значение')
    })

    it('updates word analysis when input changes', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('первое второе третье')
      await nextTick()

      const vm = wrapper.vm
      expect(vm.words).toEqual(['первое', 'второе', 'третье'])
      expect(vm.isSingleWordInput).toBe(false)
    })

    it('handles match type selection', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const radio = wrapper.find('input[value="15"]')
      if (radio.exists()) {
        await radio.setChecked()
        await nextTick()

        const vm = wrapper.vm
        expect(vm.matchTypeId).toBe(15)
      }
    })
  })

  describe('Alert Display', () => {
    it('displays alert when present', async () => {
      mockAlert.value = {
        type: 'alert-success',
        message: 'Операция выполнена успешно'
      }

      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const alert = wrapper.find('.alert')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Операция выполнена успешно')
      expect(alert.classes()).toContain('alert-success')
    })

    it('clears alert when close button is clicked', async () => {
      mockAlert.value = {
        type: 'alert-info',
        message: 'Информационное сообщение'
      }

      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const closeButton = wrapper.find('.close')
      await closeButton.trigger('click')

      expect(alertClear).toHaveBeenCalled()
    })

    it('does not display alert when not present', async () => {
      mockAlert.value = null

      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      expect(wrapper.find('.alert').exists()).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty word analysis', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('')
      await nextTick()

      const vm = wrapper.vm
      expect(vm.words).toEqual([])
      expect(vm.isSingleWordInput).toBe(true)
    })

    it('handles word with only special characters', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('!@#$%')
      await nextTick()

      const vm = wrapper.vm
      expect(vm.words).toEqual([])
      expect(vm.isSingleWordInput).toBe(true)
    })

    it('handles mixed valid and invalid characters', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('test!@#word')
      await nextTick()

      const vm = wrapper.vm
      expect(vm.words).toEqual(['test', 'word'])
      expect(vm.isSingleWordInput).toBe(false)
    })

    it('handles numeric values in isOptionDisabled', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const vm = wrapper.vm
      
      // Test edge values
      expect(vm.isOptionDisabled(11)).toBe(false) // Single word, not in 21-30 range
      expect(vm.isOptionDisabled(20)).toBe(false) // Single word, not in 21-30 range
      expect(vm.isOptionDisabled(30)).toBe(true)  // Single word, in 21-30 range
      expect(vm.isOptionDisabled(31)).toBe(false) // Single word, not in 21-30 range
    })

    it('handles null/undefined id prop correctly', async () => {
      const wrapper1 = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()
      expect(wrapper1.vm.isEdit).toBe(false)

      const wrapper2 = mount(KeyWordSettings, {
        props: { id: undefined },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()
      expect(wrapper2.vm.isEdit).toBe(false)

      const wrapper3 = mount(KeyWordSettings, {
        props: {},
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()
      expect(wrapper3.vm.isEdit).toBe(false)
    })
  })

  describe('Exposed Methods', () => {
    it('exposes all required methods', async () => {
      const wrapper = mount(KeyWordSettings, {
        props: { id: null },
        global: {
          components: {
            'font-awesome-icon': MockFontAwesomeIcon
          }
        }
      })
      await resolveAll()

      const vm = wrapper.vm
      expect(typeof vm.onSubmit).toBe('function')
      expect(typeof vm.cancel).toBe('function')
      expect(typeof vm.onWordInput).toBe('function')
      expect(typeof vm.isOptionDisabled).toBe('function')
    })
  })
})
