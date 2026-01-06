// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProductImageActionsBar from '@/components/ProductImageActionsBar.vue'
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

describe('ProductImageActionsBar', () => {
  const defaultProps = {
    item: { id: 10, hasImage: true },
    hasImage: true
  }

  function createWrapper(props = {}) {
    return mount(ProductImageActionsBar, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [vuetify],
        components: globalComponents
      }
    })
  }

  it('renders two ActionButton components', () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAllComponents(ActionButton)

    expect(buttons).toHaveLength(2)
  })

  it('renders view image button with correct props', () => {
    const wrapper = createWrapper()
    const [viewButton] = wrapper.findAllComponents(ActionButton)

    expect(viewButton.props('icon')).toBe('fa-solid fa-eye')
    expect(viewButton.props('tooltipText')).toBe('Посмотреть изображение для тех. документации')
    expect(viewButton.props('item')).toEqual(defaultProps.item)
    expect(viewButton.props('disabled')).toBe(false)
    expect(viewButton.props('iconSize')).toBe('1x')
  })

  it('renders remove image button with correct props', () => {
    const wrapper = createWrapper()
    const [, removeButton] = wrapper.findAllComponents(ActionButton)

    expect(removeButton.props('icon')).toBe('fa-solid fa-trash-can')
    expect(removeButton.props('tooltipText')).toBe('Удалить изображение для тех. документации')
    expect(removeButton.props('item')).toEqual(defaultProps.item)
    expect(removeButton.props('disabled')).toBe(false)
    expect(removeButton.props('variant')).toBe('red')
    expect(removeButton.props('iconSize')).toBe('1x')
  })

  it('disables both buttons when hasImage is false', () => {
    const wrapper = createWrapper({ hasImage: false })
    const buttons = wrapper.findAllComponents(ActionButton)

    buttons.forEach(button => {
      expect(button.props('disabled')).toBe(true)
    })
  })

  it('emits view event when view button is clicked', async () => {
    const wrapper = createWrapper()
    const [viewButton] = wrapper.findAllComponents(ActionButton)

    await viewButton.vm.$emit('click')

    expect(wrapper.emitted('view')).toBeTruthy()
    expect(wrapper.emitted('view')?.[0]).toEqual([defaultProps.item])
  })

  it('emits remove event when remove button is clicked', async () => {
    const wrapper = createWrapper()
    const [, removeButton] = wrapper.findAllComponents(ActionButton)

    await removeButton.vm.$emit('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')?.[0]).toEqual([defaultProps.item])
  })
})
