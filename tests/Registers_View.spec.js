/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RegistersView from '@/views/Registers_View.vue'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

vi.mock('@/lists/Registers_List.vue', () => ({
  default: {
    name: 'RegistersList',
    template: '<div data-testid="registers-list">Registers List</div>'
  }
}))

vi.mock('@/lists/Registers_WhList.vue', () => ({
  default: {
    name: 'RegistersWhList',
    template: '<div data-testid="registers-wh-list">Registers Warehouse List</div>'
  }
}))

describe('Registers_View.vue', () => {
  it('renders paperwork registers list by default', () => {
    const wrapper = mount(RegistersView)

    expect(wrapper.find('[data-testid="registers-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="registers-wh-list"]').exists()).toBe(false)
  })

  it('renders paperwork registers list for invalid mode values', () => {
    const wrapper = mount(RegistersView, {
      props: {
        mode: 'unknown'
      }
    })

    expect(wrapper.find('[data-testid="registers-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="registers-wh-list"]').exists()).toBe(false)
  })

  it('renders warehouse parties list for warehouse mode', () => {
    const wrapper = mount(RegistersView, {
      props: {
        mode: OP_MODE_WAREHOUSE
      }
    })

    expect(wrapper.find('[data-testid="registers-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="registers-wh-list"]').exists()).toBe(true)
  })
})
