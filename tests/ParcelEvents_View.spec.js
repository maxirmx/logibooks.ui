/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelEventsView from '@/views/ParcelEvents_View.vue'

vi.mock('@/dialogs/ParcelEvents_Settings.vue', () => ({
  default: {
    name: 'ParcelEventsSettings',
    template: '<div data-testid="parcel-events-processing-settings-stub" />'
  }
}))

describe('ParcelEvents_View.vue', () => {
  it('renders settings dialog wrapper', () => {
    const wrapper = mount(ParcelEventsView)
    expect(wrapper.find('[data-testid="parcel-events-processing-settings-stub"]').exists()).toBe(true)
  })
})