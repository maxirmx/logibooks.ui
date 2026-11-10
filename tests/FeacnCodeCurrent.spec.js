// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import FeacnCodeCurrent from '@/components/FeacnCodeCurrent.vue'

const mockGetTnVedCellClass = vi.fn()

vi.mock('@/helpers/parcels.list.helpers.js', () => ({
  getTnVedCellClass: (...args) => mockGetTnVedCellClass(...args)
}))

const mockUseFeacnTooltips = vi.fn()
const mockLoadFeacnTooltipOnHover = vi.fn()

vi.mock('@/helpers/feacn.info.helpers.js', () => ({
  useFeacnTooltips: () => mockUseFeacnTooltips(),
  loadFeacnTooltipOnHover: (...args) => mockLoadFeacnTooltipOnHover(...args)
}))

// Mock FontAwesome
const globalComponents = {
  'font-awesome-icon': {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon"></i>',
    props: ['icon', 'class']
  }
}

const vuetify = createVuetify({ components, directives })

// Stub v-tooltip to avoid visualViewport errors in test env
const vTooltipStub = {
  template:
    '<div class="v-tooltip-stub"><slot name="activator" :props="{}"></slot><slot></slot></div>'
}

describe('FeacnCodeCurrent', () => {
  const defaultProps = {
    item: {
      id: 1,
      tnVed: '1234567890',
      feacnLookupSuggestions: [
        { code: '1234567890', fromKeywords: false, fromHistory: true },
        { code: '0987654321', fromKeywords: true, fromHistory: false }
      ]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTnVedCellClass.mockResolvedValue('feacn-code-tooltip')
    mockUseFeacnTooltips.mockReturnValue({ 1234567890: { name: 'Test tooltip' } })
    mockLoadFeacnTooltipOnHover.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createWrapper(props = {}) {
    return mount(FeacnCodeCurrent, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents,
        stubs: {
          'v-tooltip': vTooltipStub
        }
      }
    })
  }

  it('classifies the current code using both sources from the list response', async () => {
    mockGetTnVedCellClass.mockResolvedValueOnce('tnved-cell matched')
    const wrapper = createWrapper()
    await flushPromises()
    expect(mockGetTnVedCellClass).toHaveBeenCalledExactlyOnceWith('1234567890', ['1234567890', '0987654321'])
    expect(wrapper.get('span.truncated-cell').classes()).toContain('matched')
  })

  it('keeps the code visible if classification fails', async () => {
    const error = new Error('FEACN dictionary failed')
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockGetTnVedCellClass.mockRejectedValueOnce(error)
    const wrapper = createWrapper()
    await flushPromises()
    const cell = wrapper.get('span.truncated-cell')
    expect(cell.text()).toBe('1234567890')
    expect(cell.classes()).toContain('feacn-code-tooltip')
    expect(log).toHaveBeenCalledExactlyOnceWith('[TN VED cell classification]', error)
  })

  describe('click events', () => {
    it('emits click event with item on plain click', async () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span.truncated-cell')
      await span.trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')[0]).toEqual([defaultProps.item])
    })

    it('does not emit click when shift+ctrl is pressed', async () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span.truncated-cell')
      await span.trigger('click', { shiftKey: true, ctrlKey: true })
      expect(wrapper.emitted('click')).toBeFalsy()
    })
  })

  describe('tooltip loading', () => {
    it('calls loadFeacnTooltipOnHover on mouseenter when tnVed exists', async () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span.truncated-cell')
      await span.trigger('mouseenter')
      expect(mockLoadFeacnTooltipOnHover).toHaveBeenCalledWith('1234567890')
    })

    it('does not call loadFeacnTooltipOnHover on mouseenter when tnVed is empty', async () => {
      const wrapper = createWrapper({ item: { id: 2, tnVed: '' } })
      const span = wrapper.find('span.truncated-cell')
      await span.trigger('mouseenter')
      expect(mockLoadFeacnTooltipOnHover).not.toHaveBeenCalled()
    })
  })
})
