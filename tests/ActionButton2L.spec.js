// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ActionButton2L from '@/components/ActionButton2L.vue'

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :data-icon="icon"></i>',
    props: ['icon', 'size']
  }
}))

const vuetify = createVuetify({
  components,
  directives
})

const globalComponents = {
  'font-awesome-icon': {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :data-icon="icon"></i>',
    props: ['icon', 'size']
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
    expect(wrapper.find('.action-button-2l__menu-icon').exists()).toBe(false)
  })

  it('renders optional menu icons with symbolic color classes', async () => {
    options = [
      {
        label: 'Issue action',
        icon: 'fa-solid fa-person-circle-xmark',
        color: 'parcel-has-issues',
        action: vi.fn().mockResolvedValue(undefined)
      },
      {
        label: 'Excise action',
        icon: 'fa-solid fa-file-invoice',
        color: 'approved-with-excise',
        action: vi.fn().mockResolvedValue(undefined)
      },
      {
        label: 'Plain action',
        action: vi.fn().mockResolvedValue(undefined)
      }
    ]
    const wrapper = createWrapper({ options })
    await wrapper.find('button').trigger('click')
    await settle(wrapper)

    const items = wrapper.findAll('.action-button-2l__menu-item')
    const icons = wrapper.findAll('.action-button-2l__menu-icon')

    expect(items.map(item => item.text())).toEqual(['Issue action', 'Excise action', 'Plain action'])
    expect(icons).toHaveLength(2)
    expect(icons[0].attributes('data-icon')).toBe('fa-solid fa-person-circle-xmark')
    expect(icons[0].classes()).toContain('action-button-2l__menu-icon--parcel-has-issues')
    expect(icons[1].attributes('data-icon')).toBe('fa-solid fa-file-invoice')
    expect(icons[1].classes()).toContain('action-button-2l__menu-icon--approved-with-excise')
    expect(items[2].find('.action-button-2l__menu-icon').exists()).toBe(false)
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

  it('closes menu on outside click without selecting an option', async () => {
    const wrapper = createWrapper()

    await wrapper.find('button').trigger('click')
    await settle(wrapper)
    expect(exposed(wrapper).isMenuOpen.value).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle(wrapper)

    expect(exposed(wrapper).isMenuOpen.value).toBe(false)
    expect(options[0].action).not.toHaveBeenCalled()
    expect(options[1].action).not.toHaveBeenCalled()
    expect(options[2].action).not.toHaveBeenCalled()
  })
})
