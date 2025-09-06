// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import KeyWord_CreateView from '@/views/KeyWord_CreateView.vue'
import KeyWord_Settings from '@/dialogs/KeyWord_Settings.vue'

const vuetify = createVuetify()

// Mock the KeyWord_Settings component
vi.mock('@/dialogs/KeyWord_Settings.vue', () => ({
  default: {
    name: 'KeyWord_Settings',
    props: ['id'],
    template: '<div data-test="keyword-settings">KeyWord_Settings Component</div>'
  }
}))

describe('KeyWord_CreateView', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(KeyWord_CreateView, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render KeyWord_Settings component', () => {
    const stopWordSettings = wrapper.findComponent(KeyWord_Settings)
    expect(stopWordSettings.exists()).toBe(true)
  })

  it('should not pass id prop to KeyWord_Settings (create mode)', () => {
    const stopWordSettings = wrapper.findComponent(KeyWord_Settings)
    expect(stopWordSettings.props('id')).toBeUndefined()
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="keyword-settings"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component for create mode', () => {
    expect(wrapper.html()).toContain('KeyWord_Settings Component')
  })
})
