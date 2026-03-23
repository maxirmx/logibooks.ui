// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
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
  template: '<div class="v-tooltip-stub"><slot name="activator" :props="{}"></slot><slot></slot></div>'
}

describe('FeacnCodeCurrent', () => {
  const defaultProps = {
    item: { id: 1, tnVed: '1234567890' },
    feacnCodes: ['1234567890', '0987654321']
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTnVedCellClass.mockResolvedValue('feacn-code-tooltip')
    mockUseFeacnTooltips.mockReturnValue({ '1234567890': { name: 'Test tooltip' } })
    mockLoadFeacnTooltipOnHover.mockResolvedValue(undefined)
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

  describe('rendering', () => {
    it('renders the tnVed value', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('1234567890')
    })

    it('renders empty string when tnVed is missing', () => {
      const wrapper = createWrapper({ item: { id: 2 } })
      const span = wrapper.find('span')
      expect(span.exists()).toBe(true)
      expect(span.text()).toBe('')
    })

    it('applies truncated-cell class', () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span.truncated-cell')
      expect(span.exists()).toBe(true)
    })
  })

  describe('click events', () => {
    it('emits click event with item on plain click', async () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span.truncated-cell')
      await span.trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')[0]).toEqual([defaultProps.item])
    })

    it('does not emit click when shift is pressed', async () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span.truncated-cell')
      await span.trigger('click', { shiftKey: true })
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('does not emit click when ctrl is pressed', async () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span.truncated-cell')
      await span.trigger('click', { ctrlKey: true })
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('does not emit click when meta/command is pressed', async () => {
      const wrapper = createWrapper()
      const span = wrapper.find('span.truncated-cell')
      await span.trigger('click', { metaKey: true })
      expect(wrapper.emitted('click')).toBeFalsy()
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
