// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import StopWord_EditView from '@/views/StopWord_EditView.vue'
import StopWord_Settings from '@/dialogs/StopWord_Settings.vue'

const vuetify = createVuetify()

// Mock the StopWord_Settings component
vi.mock('@/dialogs/StopWord_Settings.vue', () => ({
  default: {
    name: 'StopWord_Settings',
    props: ['id'],
    template: '<div data-test="stopword-settings">StopWord_Settings Component with ID: {{ id }}</div>'
  }
}))

describe('StopWord_EditView', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(StopWord_EditView, {
      props: {
        id: 123
      },
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render StopWord_Settings component', () => {
    const stopWordSettings = wrapper.findComponent(StopWord_Settings)
    expect(stopWordSettings.exists()).toBe(true)
  })

  it('should pass route id to StopWord_Settings component', () => {
    const stopWordSettings = wrapper.findComponent(StopWord_Settings)
    expect(stopWordSettings.props('id')).toBe(123)
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="stopword-settings"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component for edit mode', () => {
    expect(wrapper.html()).toContain('StopWord_Settings Component with ID: 123')
  })
})
