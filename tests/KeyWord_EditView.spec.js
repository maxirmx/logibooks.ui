// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import KeyWord_EditView from '@/views/KeyWord_EditView.vue'
import KeyWord_Settings from '@/dialogs/KeyWord_Settings.vue'

const vuetify = createVuetify()

// Mock the KeyWord_Settings component
vi.mock('@/dialogs/KeyWord_Settings.vue', () => ({
  default: {
    name: 'KeyWord_Settings',
    props: ['id'],
    template: '<div data-test="keyword-settings">KeyWord_Settings Component with ID: {{ id }}</div>'
  }
}))

describe('KeyWord_EditView', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(KeyWord_EditView, {
      props: {
        id: 123
      },
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render KeyWord_Settings component', () => {
    const keyWordSettings = wrapper.findComponent(KeyWord_Settings)
    expect(keyWordSettings.exists()).toBe(true)
  })

  it('should pass route id to KeyWord_Settings component', () => {
    const keyWordSettings = wrapper.findComponent(KeyWord_Settings)
    expect(keyWordSettings.props('id')).toBe(123)
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="keyword-settings"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component for edit mode', () => {
    expect(wrapper.html()).toContain('KeyWord_Settings Component with ID: 123')
  })
})
