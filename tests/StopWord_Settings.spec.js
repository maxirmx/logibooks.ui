/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import StopWordSettings from '@/dialogs/StopWord_Settings.vue'
import { resolveAll, vuetifyStubs } from './helpers/test-utils'

// Mock data
const mockStopWord = {
  id: 1,
  word: 'тест',
  matchTypeId: 1,
  scopes: [
    { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'export reason' },
    { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'import reason' }
  ]
}

// Create hoisted mock functions
const getById = vi.hoisted(() => vi.fn(() => Promise.resolve(mockStopWord)))
const create = vi.hoisted(() => vi.fn(() => Promise.resolve(mockStopWord)))
const update = vi.hoisted(() => vi.fn(() => Promise.resolve(mockStopWord)))
const routerPush = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())
const alertDismiss = vi.hoisted(() => vi.fn())

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

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    countries: ref([
      { isoNumeric: 643, nameRuShort: 'Россия' },
      { isoNumeric: 860, nameRuShort: 'Узбекистан' }
    ]),
    ensureLoaded: vi.fn().mockResolvedValue(undefined)
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    get alert() {
      return mockAlert.value
    },
    error: alertError,
    dismiss: alertDismiss
  })
}))

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
          ...vuetifyStubs,
          'font-awesome-icon': true,
          'v-autocomplete': {
            template: '<div class="v-autocomplete-stub scope-country"></div>',
            props: ['modelValue', 'items', 'label', 'disabled']
          }
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

      expect(wrapper.find('h1').text()).toBe('Регистрация стоп слова или фразы')
      expect(wrapper.find('input[name="word"]').exists()).toBe(true)
      expect(wrapper.findAll('input[type="radio"][name="matchTypeId"]').length).toBeGreaterThan(0)
      expect(wrapper.find('[data-testid="restriction-scope-editor"]').exists()).toBe(true)
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

    it('renders the reusable scope editor', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      expect(wrapper.find('[data-testid="restriction-scope-editor"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-restriction-scope"]').exists()).toBe(true)
    })

    it('starts inactive and allows scope rows to be added', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      expect(wrapper.findAll('.scope-row-wrapper')).toHaveLength(0)
      await wrapper.find('[data-testid="add-restriction-scope"]').trigger('click')
      expect(wrapper.findAll('.scope-row-wrapper')).toHaveLength(1)
    })

    it('shows an indexed country error and keeps an invalid form open', async () => {
      const wrapper = mountComponent()
      await resolveAll()
      const component = wrapper.vm
      component.word = 'новое'
      component.matchTypeId = 1
      component.scopes = [
        { countryIsoNumeric: null, customsProcedureCode: 10, explanation: '' }
      ]

      await component.onSubmit()
      await resolveAll()

      await vi.waitFor(() => {
        expect(wrapper.find('.scope-field-error').exists()).toBe(true)
      })

      expect(create).not.toHaveBeenCalled()
      expect(wrapper.get('.scope-field-error').text()).toBe('Выберите страну')
      expect(routerPush).not.toHaveBeenCalled()
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
      component.scopes = [
        { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: ' export text ' }
      ]

      await wrapper.vm.$nextTick()

      // Call onSubmit directly since the form validation might interfere with submit event
      await component.onSubmit()

      expect(create).toHaveBeenCalledWith({
        word: 'новое',
        matchTypeId: 1,
        scopes: [
          { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'export text' }
        ]
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

      await component.onSubmit()
      await wrapper.vm.$nextTick()

      expect(alertError).toHaveBeenCalledWith('409', {
        fallback: 'Ошибка при сохранении стоп-слова'
      })
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

      await component.onSubmit()
      await wrapper.vm.$nextTick()

      expect(alertError).toHaveBeenCalledWith(err, {
        fallback: 'Ошибка при сохранении стоп-слова'
      })
    })
  })

  describe('Form Submission - Edit Mode', () => {
    it('calls update store method on form submission', async () => {
      const wrapper = mountComponent({ id: 1 })
      await resolveAll()

      const component = wrapper.vm
      component.word = 'обновленное'
      component.matchTypeId = 41
      component.scopes = [
        { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: ' import update ' }
      ]

      await component.onSubmit()

      expect(update).toHaveBeenCalledWith(1, {
        id: 1,
        word: 'обновленное',
        matchTypeId: 41,
        scopes: [
          { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'import update' }
        ]
      })
    })

    it('loads existing data in edit mode', async () => {
      const wrapper = mountComponent({ id: 1 })
      await resolveAll()

      expect(getById).toHaveBeenCalledWith(1)

      const wordInput = wrapper.find('input[name="word"]')
      expect(wordInput.element.value).toBe('тест')
      expect(wrapper.vm.scopes).toEqual(mockStopWord.scopes)
      expect(wrapper.findAll('.scope-row-wrapper')).toHaveLength(2)
    })

    it('handles loading errors', async () => {
      const error = new Error('Not found')
      getById.mockRejectedValueOnce(error)
      mountComponent({ id: 1 })
      await resolveAll()

      expect(alertError).toHaveBeenCalledWith(error, {
        fallback: 'Ошибка при загрузке данных стоп-слова',
        action: expect.objectContaining({ label: 'Повторить', handler: expect.any(Function) })
      })
      expect(routerPush).not.toHaveBeenCalled()
    })
  })

  describe('Navigation', () => {
    it('navigates to stopwords list on cancel', async () => {
      const wrapper = mountComponent()
      await resolveAll()

      const cancelButton = wrapper.findAll('button.secondary').find(button => button.text().includes('Отменить'))
      expect(cancelButton).toBeDefined()
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

      const cancelButton = wrapper.findAll('button.secondary').find(button => button.text().includes('Отменить'))
      expect(cancelButton).toBeDefined()
      expect(cancelButton.text()).toContain('Отменить')
      expect(cancelButton.exists()).toBe(true)
    })
  })

  describe('Alert Handling', () => {
    it('displays alert when present', async () => {
      mockAlert.value = { id: 2, severity: 'success', message: 'Успешно сохранено', action: null }
      const wrapper = mountComponent()
      await resolveAll()

      expect(wrapper.find('.alert').text()).toContain('Успешно сохранено')
    })

    it('clears alert on close button click', async () => {
      mockAlert.value = {
        id: 3,
        severity: 'success',
        message: 'Тестовое сообщение',
        action: null
      }
      const wrapper = mountComponent()
      await resolveAll()

      const closeButton = wrapper.find('.close')
      await closeButton.trigger('click')

      expect(alertDismiss).toHaveBeenCalledWith(3)
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
