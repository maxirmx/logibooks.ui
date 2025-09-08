// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnLocalPrefix_EditView from '@/views/FeacnLocalPrefix_EditView.vue'
import FeacnLocalPrefix_Settings from '@/dialogs/FeacnLocalPrefix_Settings.vue'

const vuetify = createVuetify()

vi.mock('@/dialogs/FeacnLocalPrefix_Settings.vue', () => ({
  default: {
    name: 'FeacnLocalPrefix_Settings',
    props: ['mode', 'prefixId'],
    template: '<div data-test="fp-settings">Fp Settings {{ prefixId }}</div>'
  }
}))

describe('FeacnLocalPrefix_EditView.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(FeacnLocalPrefix_EditView, {
      props: {
        id: 123
      },
      global: { plugins: [vuetify] }
    })
  })

  it('renders FeacnLocalPrefix_Settings component', () => {
    const comp = wrapper.findComponent(FeacnLocalPrefix_Settings)
    expect(comp.exists()).toBe(true)
  })

  it('passes route id to FeacnLocalPrefix_Settings', () => {
    const comp = wrapper.findComponent(FeacnLocalPrefix_Settings)
    expect(comp.props('prefixId')).toBe(123)
  })

  it('renders stub content', () => {
    expect(wrapper.html()).toContain('Fp Settings 123')
  })
})

