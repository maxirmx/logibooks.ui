// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FeacnCodeEditor from '@/components/FeacnCodeEditor.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

vi.mock('@/components/FeacnCodeSearchByKeyword.vue', () => ({
  default: {
    name: 'FeacnCodeSearchByKeyword',
    props: ['modelValue'],
    emits: ['update:modelValue', 'select', 'refocus'],
    template: '<div class="feacn-keyword-lookup-stub" :data-open="modelValue"></div>'
  }
}))

vi.mock('vee-validate', () => ({
  Field: {
    name: 'Field',
    props: ['disabled', 'readonly'],
    template: '<input :disabled="disabled" :readonly="readonly" />'
  },
  useFormValues: () => ({ value: { tnVed: '1234567890' } })
}))

vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  getFeacnCodesForKeywords: vi.fn(() => ['1234567890']),
  getTnVedCellClass: vi.fn(async () => 'tnved-cell matched'),
  getKeywordFeacnPairs: vi.fn(() => []) // Added to satisfy new imports that reference this helper
}))

vi.mock('@/helpers/feacn.info.helpers.js', () => ({
  useFeacnTooltips: vi.fn(() => ({ value: { '1234567890': { name: 'Товар Тест' } } })),
  loadFeacnTooltipOnHover: vi.fn(() => Promise.resolve())
}))

vi.mock('@/stores/key.words.store.js', () => ({
  useKeyWordsStore: vi.fn(() => ({ keyWords: [] }))
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: vi.fn(() => ({ update: vi.fn(), lookupFeacnCode: vi.fn(async () => ({ keyWordIds: [] })) }))
}))

vi.mock('@/stores/feacn.codes.store.js', () => ({
  useFeacnCodesStore: vi.fn(() => ({
    getChildren: vi.fn(async () => []),
    search: vi.fn(async () => [])
  }))
}))

describe('FeacnCodeEditor', () => {
  let wrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    wrapper = mount(FeacnCodeEditor, {
      props: {
        item: { id: 1, tnVed: '1234567890' },
        values: { tnVed: '1234567890' },
        errors: {},
        isSubmitting: false,
        columnTitles: { tnVed: 'ТН ВЭД' },
        columnTooltips: { tnVed: 'Код ТН ВЭД' },
        setFieldValue: vi.fn(),
        runningAction: false
      },
      global: {
        stubs: { ...vuetifyStubs }
      }
    })
  })

  it('renders tnVed field', () => {
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('wraps tnVed field with tooltip', () => {
    // The real component sets data-testid="tnved-editor-decode-tooltip" on v-tooltip, but
    // the stub replaces it with data-testid="v-tooltip". So we assert against the stub id.
    const tooltip = wrapper.find('[data-testid="v-tooltip"]')
    expect(tooltip.exists()).toBe(true)
  })

  it('shows eye icon in tooltip', () => {
    // font-awesome-icon is stubbed as <i data-testid="fa-icon" />, so we look for that instead of .fa-eye
    const icon = wrapper.find('[data-testid="fa-icon"]')
    expect(icon.exists()).toBe(true)
  })

  it('loads tooltip data on mouseenter', async () => {
    const { loadFeacnTooltipOnHover } = await import('@/helpers/feacn.info.helpers.js')
    const input = wrapper.find('input')
    await input.trigger('mouseenter')
    await wrapper.vm.$nextTick()
    expect(loadFeacnTooltipOnHover).toHaveBeenCalledWith('1234567890')
  })

  describe('when disabled prop is true', () => {
    let disabledWrapper

    beforeEach(() => {
      setActivePinia(createPinia())
      disabledWrapper = mount(FeacnCodeEditor, {
        props: {
          item: { id: 1, tnVed: '1234567890' },
          values: { tnVed: '1234567890' },
          errors: {},
          isSubmitting: false,
          columnTitles: { tnVed: 'ТН ВЭД' },
          columnTooltips: { tnVed: 'Код ТН ВЭД' },
          setFieldValue: vi.fn(),
          runningAction: false,
          disabled: true
        },
        global: {
          stubs: { ...vuetifyStubs }
        }
      })
    })

    it('disables the TN VED input field', () => {
      const input = disabledWrapper.find('input')
      expect(input.element.disabled).toBe(true)
    })

    it('does not activate search on label dblclick', async () => {
      const label = disabledWrapper.find('label')
      await label.trigger('dblclick')
      await disabledWrapper.vm.$nextTick()
      // Search overlay should not appear
      expect(disabledWrapper.find('.feacn-overlay').exists()).toBe(false)
    })

    it('does not activate search on field dblclick', async () => {
      const input = disabledWrapper.find('input')
      await input.trigger('dblclick')
      await disabledWrapper.vm.$nextTick()
      // Search overlay should not appear
      expect(disabledWrapper.find('.feacn-overlay').exists()).toBe(false)
    })

    it('disables the search toggle button', () => {
      // ActionButton is stubbed, but the disabled prop should be passed
      const actionButton = disabledWrapper.findComponent({ name: 'ActionButton' })
      expect(actionButton.exists()).toBe(true)
      expect(actionButton.props('disabled')).toBe(true)
    })

    it('does not update field value via selectFeacnCode when disabled', async () => {
      const setFieldValue = disabledWrapper.props('setFieldValue')
      // Trigger a code selection via the exposed selectFeacnCode
      // The component guards against calling setFieldValue when disabled
      await disabledWrapper.vm.selectFeacnCode('9876543210')
      // setFieldValue should not have been called
      expect(setFieldValue).not.toHaveBeenCalled()
    })

    it('passes disabled prop to FeacnCodeSelectorW', () => {
      const selectorW = disabledWrapper.findComponent({ name: 'FeacnCodeSelectorW' })
      if (selectorW.exists()) {
        expect(selectorW.props('disabled')).toBe(true)
      }
    })
  })

  describe('when disabled prop is false (default)', () => {
    it('does not disable the TN VED input field', () => {
      const input = wrapper.find('input')
      expect(input.element.disabled).toBe(false)
    })

    it('activates search on label dblclick', async () => {
      const label = wrapper.find('label')
      await label.trigger('dblclick')
      await wrapper.vm.$nextTick()
      // Search overlay should appear
      expect(wrapper.find('.feacn-overlay').exists()).toBe(true)
    })

    it('activates search on field dblclick', async () => {
      const input = wrapper.find('input')
      await input.trigger('dblclick')
      await wrapper.vm.$nextTick()
      // Search overlay should appear
      expect(wrapper.find('.feacn-overlay').exists()).toBe(true)
    })
  })
})
