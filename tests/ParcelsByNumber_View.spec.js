/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelsByNumberView from '@/views/ParcelsByNumber_View.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

vi.mock('@/lists/ParcelsByNumber_List.vue', () => ({
  default: {
    name: 'ParcelsByNumberList',
    template: '<div class="parcels-by-number-list-stub" data-testid="parcels-by-number-list">Parcels by number List Component</div>'
  }
}))

describe('ParcelsByNumber_View.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(ParcelsByNumberView, {
      global: {
        stubs: defaultGlobalStubs
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('renders correctly', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the ParcelsByNumber list component', () => {
    const list = wrapper.find('[data-testid="parcels-by-number-list"]')
    expect(list.exists()).toBe(true)
  })

  it('does not add unnecessary wrapper elements', () => {
    expect(wrapper.element.tagName.toLowerCase()).toBe('div')
  })
})
