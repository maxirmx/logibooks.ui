// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnLocalPrefix_CreateView from '@/views/FeacnLocalPrefix_CreateView.vue'
import FeacnLocalPrefix_Settings from '@/dialogs/FeacnLocalPrefix_Settings.vue'

const vuetify = createVuetify()

vi.mock('@/dialogs/FeacnLocalPrefix_Settings.vue', () => ({
  default: {
    name: 'FeacnLocalPrefix_Settings',
    template: '<div data-test="fp-settings">FeacnLocalPrefix_Settings Component</div>'
  }
}))

describe('FeacnLocalPrefix_CreateView.vue', () => {
  it('renders FeacnLocalPrefix_Settings component', () => {
    const wrapper = mount(FeacnLocalPrefix_CreateView, {
      global: { plugins: [vuetify] }
    })
    const comp = wrapper.findComponent(FeacnLocalPrefix_Settings)
    expect(comp.exists()).toBe(true)
    expect(wrapper.html()).toContain('FeacnLocalPrefix_Settings Component')
  })
})

