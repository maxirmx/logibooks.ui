/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import StopWordSettings from '@/dialogs/StopWord_Settings.vue'
import { resolveAll } from './helpers/test-utils'

// Mock data
const mockStopWord = {
  id: 1,
  word: 'тест',
  matchTypeId: 1
}

// Create hoisted mock functions
const getById = vi.hoisted(() => vi.fn(() => Promise.resolve(mockStopWord)))
const create = vi.hoisted(() => vi.fn(() => Promise.resolve(mockStopWord)))
const update = vi.hoisted(() => vi.fn(() => Promise.resolve(mockStopWord)))
const routerPush = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())
const alertClear = vi.hoisted(() => vi.fn())

const mockAlert = ref(null)

// Mock stores
vi.mock('@/stores/stop.words.store.js', () => ({
  useStopWordsStore: () => ({
    getById,
    create,
    update
  })
}))

vi.mock('@/stores/word.match.types.store.js', () => ({
  useWordMatchTypesStore: () => ({
    matchTypes: ref([
      { id: 1, name: 'Exact' },
      { id: 15, name: 'Type15' },
      { id: 25, name: 'Type25' },
      { id: 41, name: 'Morphology' }
    ]),
    ensureLoaded: vi.fn()
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: alertError,
    clear: alertClear
  })
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { 
    ...actual, 
    storeToRefs: () => ({ alert: mockAlert })
  }
})

// Mock the router
vi.mock('@/router', () => ({
  default: {
    push: routerPush
  }
}))

describe('StopWord_Settings.vue', () => {
  const mountComponent = (props = {}) => {
    return mount(StopWordSettings, {
      props,
      global: {
        stubs: {
          'font-awesome-icon': true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getById.mockResolvedValue(mockStopWord)
    create.mockResolvedValue(mockStopWord)
    update.mockResolvedValue(mockStopWord)
    routerPush.mockResolvedValue()
    mockAlert.value = null
  })

  describe('Component Rendering', () => {
    it('renders create mode correctly', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Регистрация стоп-слова или фразы')
      expect(wrapper.find('input[name="word"]').exists()).toBe(true)
      expect(wrapper.findAll('input[type="radio"][name="matchTypeId"]').length).toBeGreaterThan(0)
      expect(wrapper.find('button[type="submit"]').text()).toContain('Сохранить')
    })

    it('renders edit mode correctly', async () => {
      const wrapper = mountComponent({ id: 1 })
      await resolveAll()

      expect(wrapper.find('h1').text()).toBe('Редактировать стоп-слово или фразу')
    })

    it('shows loading state when fetching data', async () => {
      getById.mockImplementation(() => new Promise(() => {}))
      const wrapper = mountComponent({ id: 1 })
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.spinner-border-lg').exists()).toBe(true)
    })
  })

  describe('Form Fields', () => {
    it('renders word input field', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      expect(wordInput.exists()).toBe(true)
      expect(wordInput.attributes('placeholder')).toBe('Стоп-слово или фраза')
    })

    it('renders matchTypeId radios', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const radios = wrapper.findAll('input[type="radio"][name="matchTypeId"]')
      expect(radios.length).toBeGreaterThan(0)
    })

    it('renders form labels correctly', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      expect(wrapper.find('label[for="word"]').text()).toBe('Стоп-слово или фраза:')
      expect(wrapper.text()).toContain('Тип соответствия:')
    })
  })

  describe('Multi-word Input Handling', () => {
    it('keeps matchTypeId when multi-word entered', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('два слова')
      await wordInput.trigger('input')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.matchTypeId).toBe(41)
    })

    it('allows changing matchTypeId for single word', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      wrapper.vm.matchTypeId = 41
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.matchTypeId).toBe(41)
    })

    it('disables options 21-30 for single word', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('одиночное')
      await wordInput.trigger('input')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isOptionDisabled(25)).toBe(true)
      expect(wrapper.vm.isOptionDisabled(15)).toBe(false)
      expect(wrapper.vm.isOptionDisabled(41)).toBe(false)
    })

    it('disables options 11-20 and >30 for multi-word', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('два слова')
      await wordInput.trigger('input')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isOptionDisabled(15)).toBe(true)
      expect(wrapper.vm.isOptionDisabled(25)).toBe(false)
      expect(wrapper.vm.isOptionDisabled(41)).toBe(true)
    })
  })

  describe('Select Interaction', () => {
    it('changes matchTypeId correctly', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      wrapper.vm.matchTypeId = 41
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.matchTypeId).toBe(41)
    })
  })

  describe('Form Submission - Create Mode', () => {
    it('calls create store method on form submission', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      // Set form values directly on the component (use single word to avoid force exact match)
      const component = wrapper.vm
      component.word = 'новое'
      component.matchTypeId = 1
      
      await wrapper.vm.$nextTick()
      
      // Call onSubmit directly since the form validation might interfere with submit event
      await component.onSubmit()
      
      expect(create).toHaveBeenCalledWith({
        word: 'новое',
        matchTypeId: 1,
        explanation: ''
      })
    })

    it('navigates to stopwords list after successful creation', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const component = wrapper.vm
      component.word = 'новое'
      component.matchTypeId = 1
      
      await component.onSubmit()
      await resolveAll()

      expect(routerPush).toHaveBeenCalledWith('/stopwords')
    })

    it('handles creation errors', async () => {
      create.mockRejectedValueOnce(new Error('409'))
      const wrapper = mountComponent()
      await resolveAll()

      const component = wrapper.vm
      component.word = 'существующее'
      component.matchTypeId = 1
      
      try {
        await component.onSubmit()
      } catch {
        // Expected error
      }
      
      await wrapper.vm.$nextTick()

      // Check if error is displayed (the API error should be set in the errors object)
      const errorElements = wrapper.findAll('.alert-danger')
      const hasErrorMessage = errorElements.some(el =>
        el.text().includes('409')
      )
      expect(hasErrorMessage).toBe(true)
    })

    it('handles morphology error on create', async () => {
      const err = new Error('Morphology unsupported')
      err.status = 418
      err.data = { word: 'abc', level: 1 }
      create.mockRejectedValueOnce(err)
      const wrapper = mountComponent()
      await resolveAll()

      const component = wrapper.vm
      component.word = 'abc'
      component.matchTypeId = 41

      try {
        await component.onSubmit()
      } finally {
        await wrapper.vm.$nextTick()
      }


      const errorElements = wrapper.findAll('.alert-danger')
      const hasErrorMessage = errorElements.some(el =>
        el.text().includes('Morphology unsupported')
      )
      expect(hasErrorMessage).toBe(true)
    })
  })

  describe('Form Submission - Edit Mode', () => {
    it('calls update store method on form submission', async () => {
      const wrapper = mountComponent({ id: 1 })
      await resolveAll()

      const component = wrapper.vm
      component.word = 'обновленное'
      component.matchTypeId = 41
      
      await component.onSubmit()

      expect(update).toHaveBeenCalledWith(1, {
        id: 1,
        word: 'обновленное',
        matchTypeId: 41,
        explanation: ''
      })
    })

    it('loads existing data in edit mode', async () => {
      const wrapper = mountComponent({ id: 1 })
      await resolveAll()

      expect(getById).toHaveBeenCalledWith(1)
      
      const wordInput = wrapper.find('input[name="word"]')
      expect(wordInput.element.value).toBe('тест')
    })

    it('handles loading errors', async () => {
      getById.mockRejectedValueOnce(new Error('Not found'))
      mountComponent({ id: 1 })
      await resolveAll()

      expect(alertError).toHaveBeenCalledWith('Ошибка при загрузке данных стоп-слова')
      expect(routerPush).toHaveBeenCalledWith('/stopwords')
    })
  })

  describe('Navigation', () => {
    it('navigates to stopwords list on cancel', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const cancelButton = wrapper.find('button.secondary')
      await cancelButton.trigger('click')

      expect(routerPush).toHaveBeenCalledWith('/stopwords')
    })
  })

  describe('Button States', () => {
    it('shows submit button correctly', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.text()).toContain('Сохранить')
      expect(submitButton.exists()).toBe(true)
    })

    it('shows cancel button correctly', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const cancelButton = wrapper.find('button.secondary')
      expect(cancelButton.text()).toContain('Отменить')
      expect(cancelButton.exists()).toBe(true)
    })
  })

  describe('Alert Handling', () => {
    it('displays alert when present', async () => {
      mockAlert.value = { type: 'success', message: 'Успешно сохранено' }
      const wrapper = mountComponent()
      await resolveAll()

      expect(wrapper.find('.alert').text()).toContain('Успешно сохранено')
    })

    it('clears alert on close button click', async () => {
      mockAlert.value = { type: 'success', message: 'Тестовое сообщение' }
      const wrapper = mountComponent()
      await resolveAll()

      const closeButton = wrapper.find('.close')
      await closeButton.trigger('click')

      expect(alertClear).toHaveBeenCalled()
    })
  })

  describe('Component Props', () => {
    it('accepts null id for create mode', () => {
      const wrapper = mountComponent({ id: null })
      expect(wrapper.exists()).toBe(true)
    })

    it('accepts numeric id for edit mode', () => {
      const wrapper = mountComponent({ id: 123 })
      expect(wrapper.exists()).toBe(true)
    })

    it('accepts string id for edit mode', () => {
      const wrapper = mountComponent({ id: '456' })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Form Validation', () => {
    it('shows word input without errors initially', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      expect(wrapper.find('.invalid-feedback').exists()).toBe(false)
    })

    it('validates form data properly', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const wordInput = wrapper.find('input[name="word"]')
      await wordInput.setValue('тест')
      await wrapper.vm.$nextTick()

      expect(wordInput.element.value).toBe('тест')
    })
  })
})
