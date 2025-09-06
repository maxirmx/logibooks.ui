// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnPrefix_EditView from '@/views/FeacnPrefix_EditView.vue'
import FeacnPrefix_Settings from '@/dialogs/FeacnPrefix_Settings.vue'

const vuetify = createVuetify()

vi.mock('@/dialogs/FeacnPrefix_Settings.vue', () => ({
  default: {
    name: 'FeacnPrefix_Settings',
    props: ['mode', 'prefixId'],
    template: '<div data-test="fp-settings">Fp Settings {{ prefixId }}</div>'
  }
}))

describe('FeacnPrefix_EditView.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(FeacnPrefix_EditView, {
      props: {
        id: 123
      },
      global: { plugins: [vuetify] }
    })
  })

  it('renders FeacnPrefix_Settings component', () => {
    const comp = wrapper.findComponent(FeacnPrefix_Settings)
    expect(comp.exists()).toBe(true)
  })

  it('passes route id to FeacnPrefix_Settings', () => {
    const comp = wrapper.findComponent(FeacnPrefix_Settings)
    expect(comp.props('prefixId')).toBe(123)
  })

  it('renders stub content', () => {
    expect(wrapper.html()).toContain('Fp Settings 123')
  })
})

