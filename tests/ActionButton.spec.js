// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ActionButton from '@/components/ActionButton.vue'

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}))

const vuetify = createVuetify({ components, directives })

function createWrapper(props = {}) {
  return mount(ActionButton, {
    props: {
      item: { id: 1, name: 'Test Item' },
      icon: 'fa-solid fa-pen',
      tooltipText: 'Edit item',
      ...props
    },
    global: {
      plugins: [vuetify],
      components: {
        'font-awesome-icon': {
          name: 'FontAwesomeIcon',
          template: '<i class="fa-icon" :class="[icon]"></i>',
          props: ['icon', 'size', 'class']
        }
      }
    }
  })
}

describe('ActionButton', () => {
  it('renders the enabled defaults and emits its item', async () => {
    const wrapper = createWrapper()
    const button = wrapper.find('button')
    const icon = wrapper.findComponent({ name: 'FontAwesomeIcon' })

    expect(button.classes()).toContain('anti-btn')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(wrapper.findComponent({ name: 'VTooltip' }).exists()).toBe(true)
    expect(icon.props()).toMatchObject({ icon: 'fa-solid fa-pen', size: '1x' })

    await button.trigger('click')
    expect(wrapper.emitted('click')).toEqual([[{ id: 1, name: 'Test Item' }]])
  })

  it('renders custom disabled state without emitting a click', async () => {
    const wrapper = createWrapper({ disabled: true, icon: 'invalid-icon', tooltipText: '' })
    const button = wrapper.find('button')

    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).props('icon')).toBe('invalid-icon')

    await button.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('keeps a disabled action explanation keyboard-accessible', () => {
    const wrapper = createWrapper({ disabled: true, tooltipText: 'Сначала укажите страну' })
    const activator = wrapper.get('.action-button-tooltip-activator--disabled')
    const tooltip = wrapper.findComponent({ name: 'VTooltip' })

    expect(activator.attributes()).toMatchObject({
      tabindex: '0',
      role: 'button',
      'aria-disabled': 'true',
      'aria-label': 'Сначала укажите страну'
    })
    expect(tooltip.props('disabled')).toBe(false)
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
