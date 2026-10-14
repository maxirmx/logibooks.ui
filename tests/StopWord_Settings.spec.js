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

    it('shows loading state when fetching data', async () => {
      getById.mockImplementation(() => new Promise(() => {}))
      const wrapper = mountComponent({ id: 1 })
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.spinner-border-lg').exists()).toBe(true)
      expect(wrapper.get('[data-testid="stopword-save-action"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-testid="stopword-cancel-action"]').attributes('disabled')).toBeDefined()
    })
  })

  describe('Form Fields', () => {

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

  })

  describe('Form Submission - Create Mode', () => {
    it('shows duplicate scope feedback only on the later row', async () => {
      const wrapper = mountComponent()
      await resolveAll()
      wrapper.vm.word = 'новое'
      wrapper.vm.matchTypeId = 1
      wrapper.vm.scopes = [
        { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'A' },
        { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'B' }
      ]

      await wrapper.vm.onSubmit()
      await resolveAll()

      expect(create).not.toHaveBeenCalled()
      expect(wrapper.findAll('.scope-error')).toHaveLength(1)
      expect(wrapper.text()).not.toContain('Страна и процедура не должны повторяться')
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

      const cancelButton = wrapper.get('[data-testid="stopword-cancel-action"]')
      await cancelButton.trigger('click')

      expect(routerPush).toHaveBeenCalledWith('/stopwords')
    })
  })

})
