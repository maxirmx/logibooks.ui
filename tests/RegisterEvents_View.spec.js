/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterEventsView from '@/views/RegisterEvents_View.vue'

vi.mock('@/dialogs/RegisterEvents_Settings.vue', () => ({
  default: {
    name: 'RegisterEventsSettings',
    template: '<div data-testid="register-events-processing-settings-stub" />'
  }
}))

describe('RegisterEvents_View.vue', () => {
  it('renders settings dialog wrapper', () => {
    const wrapper = mount(RegisterEventsView)
    expect(wrapper.find('[data-testid="register-events-processing-settings-stub"]').exists()).toBe(true)
  })
})