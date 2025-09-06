// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import StopWord_CreateView from '@/views/StopWord_CreateView.vue'
import StopWord_Settings from '@/dialogs/StopWord_Settings.vue'

const vuetify = createVuetify()

// Mock the StopWord_Settings component
vi.mock('@/dialogs/StopWord_Settings.vue', () => ({
  default: {
    name: 'StopWord_Settings',
    props: ['id'],
    template: '<div data-test="stopword-settings">StopWord_Settings Component</div>'
  }
}))

describe('StopWord_CreateView', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(StopWord_CreateView, {
      global: {
        plugins: [vuetify]
      }
    })
  })

  it('should render StopWord_Settings component', () => {
    const stopWordSettings = wrapper.findComponent(StopWord_Settings)
    expect(stopWordSettings.exists()).toBe(true)
  })

  it('should not pass id prop to StopWord_Settings (create mode)', () => {
    const stopWordSettings = wrapper.findComponent(StopWord_Settings)
    expect(stopWordSettings.props('id')).toBeUndefined()
  })

  it('should have correct component structure', () => {
    expect(wrapper.find('[data-test="stopword-settings"]').exists()).toBe(true)
  })

  it('should be a simple wrapper component for create mode', () => {
    expect(wrapper.html()).toContain('StopWord_Settings Component')
  })
})
