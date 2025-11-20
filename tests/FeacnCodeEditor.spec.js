// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
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
    emits: ['update:modelValue', 'select'],
    template: '<div class="feacn-keyword-lookup-stub" :data-open="modelValue"></div>'
  }
}))

vi.mock('vee-validate', () => ({
  Field: {
    name: 'Field',
    template: '<input />'
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
})
