// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FeacnInsertItem_EditView from '@/views/FeacnInsertItem_EditView.vue'
import FeacnInsertItem_Settings from '@/dialogs/FeacnInsertItem_Settings.vue'

const vuetify = createVuetify()

vi.mock('@/dialogs/FeacnInsertItem_Settings.vue', () => ({
  default: {
    name: 'FeacnInsertItem_Settings',
    props: ['mode', 'insertItemId'],
    template: '<div data-test="fi-settings">Fi Settings {{ insertItemId }}</div>'
  }
}))

describe('FeacnInsertItem_EditView.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(FeacnInsertItem_EditView, {
      props: {
        id: 123
      },
      global: { plugins: [vuetify] }
    })
  })

  it('renders FeacnInsertItem_Settings component', () => {
    const comp = wrapper.findComponent(FeacnInsertItem_Settings)
    expect(comp.exists()).toBe(true)
  })

  it('passes route id to FeacnInsertItem_Settings', () => {
    const comp = wrapper.findComponent(FeacnInsertItem_Settings)
    expect(comp.props('insertItemId')).toBe(123)
  })

  it('renders stub content', () => {
    expect(wrapper.html()).toContain('Fi Settings 123')
  })
})
