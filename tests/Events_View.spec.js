/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EventsView from '@/views/Events_View.vue'

vi.mock('@/dialogs/Events_Settings.vue', () => ({
  default: {
    name: 'EventsSettings',
    template: '<div data-testid="events-settings-stub" />'
  }
}))

describe('Events_View.vue', () => {
  it('renders settings dialog wrapper', () => {
    const wrapper = mount(EventsView)
    expect(wrapper.find('[data-testid="events-settings-stub"]').exists()).toBe(true)
  })
})
