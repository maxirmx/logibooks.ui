// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ActionButton2L } from '@sw-consulting/tooling.ui.kit'

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}))

const vuetify = createVuetify({
  components,
  directives
})

const globalComponents = {
  'font-awesome-icon': {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}

describe('ActionButton2L', () => {
  const item = { id: 1 }
  const icon = 'fa-solid fa-ellipsis-v'
  const tooltipText = 'More actions'

  let options

  beforeEach(() => {
    options = [
      { label: 'First action', action: vi.fn().mockResolvedValue(undefined) },
      { label: 'Second action', action: vi.fn().mockResolvedValue(undefined) },
      { label: 'Disabled action', action: vi.fn().mockResolvedValue(undefined), disabled: true }
    ]
  })

  function createWrapper(props = {}) {
    return mount(ActionButton2L, {
      props: {
        item,
        icon,
        tooltipText,
        iconSize: '1x',
        options,
        ...props
      },
      global: {
        plugins: [vuetify],
        components: globalComponents,
        stubs: {
          transition: false
        }
      }
    })
  }

  function exposed(wrapper) {
    return wrapper.vm.$.exposed || {}
  }

  async function settle(wrapper) {
    await flushPromises()
    await wrapper.vm.$nextTick()
    await flushPromises()
  }

  it('renders base action button and hides menu by default', () => {
    const wrapper = createWrapper()
    expect(wrapper.findComponent({ name: 'ActionButton' }).exists()).toBe(true)
    expect(wrapper.find('.action-button-2l__menu').exists()).toBe(false)
  })

  it('opens menu on button click and displays options', async () => {
    const wrapper = createWrapper()
    await wrapper.find('button').trigger('click')

    await settle(wrapper)

    expect(exposed(wrapper).isMenuOpen.value).toBe(true)
    expect(wrapper.find('.action-button-2l__menu').exists()).toBe(true)
    const items = wrapper.findAll('.action-button-2l__menu-item')
    expect(items).toHaveLength(options.length)
    expect(items[0].text()).toBe('First action')
  })

  it('calls dedicated function when option is selected and closes afterwards', async () => {
    const wrapper = createWrapper()
    const firstAction = options[0].action

    await wrapper.find('button').trigger('click')
    await wrapper.findAll('.action-button-2l__menu-item')[0].trigger('click')
    await settle(wrapper)

    expect(firstAction).toHaveBeenCalledWith(item)
    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
  })

  it('disables menu interactions while action is executing', async () => {
    let resolveAction
    options[0].action = vi.fn(() => new Promise(resolve => {
      resolveAction = resolve
    }))
    const wrapper = createWrapper({ options })

    await wrapper.find('button').trigger('click')
    await wrapper.findAll('.action-button-2l__menu-item')[0].trigger('click')
    await settle(wrapper)

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()

    resolveAction()
    await settle(wrapper)

    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
  })

  it('supports keyboard navigation and selection', async () => {
    const wrapper = createWrapper()

    await wrapper.trigger('keydown', { key: 'ArrowDown' })
    await settle(wrapper)
    let items = wrapper.findAll('.action-button-2l__menu-item')
    expect(exposed(wrapper).isMenuOpen.value).toBe(true)
    expect(items[0].attributes('tabindex')).toBe('0')

    await wrapper.trigger('keydown', { key: 'ArrowDown' })
    await settle(wrapper)
    items = wrapper.findAll('.action-button-2l__menu-item')
    expect(exposed(wrapper).focusedIndex.value).toBe(1)
    expect(items[0].attributes('tabindex')).toBe('-1')
    expect(items[1].attributes('tabindex')).toBe('0')

    await wrapper.trigger('keydown', { key: 'Enter' })
    await settle(wrapper)
    expect(options[1].action).toHaveBeenCalledWith(item)
    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
  })

  it('closes menu on escape key', async () => {
    const wrapper = createWrapper()

    await wrapper.find('button').trigger('click')
    await settle(wrapper)
    expect(exposed(wrapper).isMenuOpen.value).toBe(true)
    expect(wrapper.find('.action-button-2l__menu').exists()).toBe(true)

    await wrapper.trigger('keydown', { key: 'Escape' })
    await settle(wrapper)

    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
  })
})
