// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ActionButton from '@/components/ActionButton.vue'

// Mock FontAwesome
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}))

// Global component registration
const globalComponents = {
  'font-awesome-icon': {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}

const vuetify = createVuetify({
  components,
  directives
})

describe('ActionButton', () => {
  const defaultProps = {
    item: { id: 1, name: 'Test Item' },
    icon: 'fa-solid fa-pen',
    tooltipText: 'Edit item'
  }

  function createWrapper(props = {}) {
    return mount(ActionButton, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents
      }
    })
  }

  describe('rendering', () => {
    it('renders a button with FontAwesome icon', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.classes()).toContain('anti-btn')
      
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.exists()).toBe(true)
      expect(fontAwesome.props('icon')).toBe('fa-solid fa-pen')
    })

    it('applies default icon size', () => {
      const wrapper = createWrapper()
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.props('size')).toBe('1x')
    })

    it('renders with tooltip', () => {
      const wrapper = createWrapper()
      const tooltip = wrapper.findComponent({ name: 'VTooltip' })
      expect(tooltip.exists()).toBe(true)
      // Since tooltip uses template slots, verify the component exists and the button has proper tooltip ID
      expect(wrapper.find('button[aria-describedby]').exists()).toBe(true)
    })

    it('renders different icons correctly', () => {
      const wrapper = createWrapper({ icon: 'fa-solid fa-trash-can' })
      const fontAwesome = wrapper.findComponent({ name: 'FontAwesomeIcon' })
      expect(fontAwesome.props('icon')).toBe('fa-solid fa-trash-can')
    })
  })

  describe('interactions', () => {
    it('emits click event with item when clicked', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      
      await button.trigger('click')
      
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')[0]).toEqual([defaultProps.item])
    })

    it('emits click with different item data', async () => {
      const customItem = { id: 2, name: 'Different Item' }
      const wrapper = createWrapper({ item: customItem })
      const button = wrapper.find('button')
      
      await button.trigger('click')
      
      expect(wrapper.emitted('click')[0]).toEqual([customItem])
    })
  })

  describe('disabled state', () => {
    it('is enabled by default', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('can be disabled', () => {
      const wrapper = createWrapper({ disabled: true })
      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('does not emit click when disabled', async () => {
      const wrapper = createWrapper({ disabled: true })
      const button = wrapper.find('button')
      
      await button.trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

  })

  describe('props validation', () => {
    it('has default values for optional props', () => {
      expect(ActionButton.props?.iconSize?.default).toBe('1x')
      expect(ActionButton.props?.disabled?.default).toBe(false)
    })
  })

  describe('accessibility', () => {
    it('maintains button semantics', () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      expect(button.attributes('type')).toBe('button')
    })

  })

  describe('integration scenarios', () => {
    it('works with complex item objects', async () => {
      const complexItem = {
        id: 1,
        dealNumber: 'DEAL-789',
        fileName: 'complex-register.xlsx',
        ordersTotal: 25,
        nested: { data: 'value' }
      }
      
      const wrapper = createWrapper({ item: complexItem })
      await wrapper.find('button').trigger('click')
      
      expect(wrapper.emitted('click')[0]).toEqual([complexItem])
    })

    it('handles rapid clicks', async () => {
      const wrapper = createWrapper()
      const button = wrapper.find('button')
      
      await button.trigger('click')
      await button.trigger('click')
      await button.trigger('click')
      
      expect(wrapper.emitted('click')).toHaveLength(3)
    })

    it('maintains state across prop updates', async () => {
      const wrapper = createWrapper()
      
      await wrapper.setProps({ tooltipText: 'Updated tooltip' })
      expect(wrapper.findComponent({ name: 'VTooltip' }).exists()).toBe(true)
      
      await wrapper.setProps({ icon: 'fa-solid fa-star' })
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('fa-solid fa-star')
    })
  })

  describe('error handling', () => {
    it('handles empty tooltip text', () => {
      const wrapper = createWrapper({ tooltipText: '' })
      // Check that tooltip component exists but with empty content
      expect(wrapper.findComponent({ name: 'VTooltip' }).exists()).toBe(true)
    })

    it('handles invalid icon strings gracefully', () => {
      const wrapper = createWrapper({ icon: 'invalid-icon' })
      expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('invalid-icon')
    })
  })
})
