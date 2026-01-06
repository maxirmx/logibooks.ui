// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ParcelProductLinkPanel from '@/components/ParcelProductLinkPanel.vue'
import ActionButton from '@/components/ActionButton.vue'

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}))

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

describe('ParcelProductLinkPanel', () => {
  const baseProps = {
    item: { id: 1, hasImage: true },
    label: 'Ссылка на товар',
    productLink: 'example.com'
  }

  function createWrapper(props = {}) {
    return mount(ParcelProductLinkPanel, {
      props: { ...baseProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents
      }
    })
  }

  it('renders the label text', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('label').text()).toBe('Ссылка на товар:')
  })

  it('renders a product link with https protocol', () => {
    const wrapper = createWrapper({ productLink: 'example.com' })
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('https://example.com')
    expect(link.attributes('href')).toBe('https://example.com')
  })

  it('renders no-link text when productLink is empty', () => {
    const wrapper = createWrapper({ productLink: '' })
    expect(wrapper.find('.no-link').text()).toBe('Ссылка отсутствует')
  })

  it('disables action buttons when item has no image', () => {
    const wrapper = createWrapper({ item: { id: 2, hasImage: false } })
    const buttons = wrapper.findAllComponents(ActionButton)
    expect(buttons).toHaveLength(2)
    buttons.forEach(button => {
      expect(button.props('disabled')).toBe(true)
    })
  })

  it('disables action buttons when disabled prop is true', () => {
    const wrapper = createWrapper({ disabled: true })
    const buttons = wrapper.findAllComponents(ActionButton)
    buttons.forEach(button => {
      expect(button.props('disabled')).toBe(true)
    })
  })

  it('enables action buttons when item has image and disabled is false', () => {
    const wrapper = createWrapper({ item: { id: 3, hasImage: true }, disabled: false })
    const buttons = wrapper.findAllComponents(ActionButton)
    buttons.forEach(button => {
      expect(button.props('disabled')).toBe(false)
    })
  })

  it('emits view-image when view button is clicked', async () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAllComponents(ActionButton)

    await buttons[0].vm.$emit('click')

    expect(wrapper.emitted('view-image')).toBeTruthy()
  })

  it('emits delete-image when delete button is clicked', async () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAllComponents(ActionButton)

    await buttons[1].vm.$emit('click')

    expect(wrapper.emitted('delete-image')).toBeTruthy()
  })
})
