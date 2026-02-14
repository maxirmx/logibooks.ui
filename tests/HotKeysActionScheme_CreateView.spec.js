// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HotKeyActionSchemeCreateView from '@/views/HotKeyActionScheme_CreateView.vue'

vi.mock('@/dialogs/HotKeyActionScheme_Settings.vue', () => ({
  default: {
    name: 'HotKeyActionScheme_Settings',
    template: '<div data-testid="scheme-settings">Settings</div>',
    props: ['mode']
  }
}))

describe('HotKeyActionScheme_CreateView.vue', () => {
  it('passes create mode', () => {
    const wrapper = mount(HotKeyActionSchemeCreateView)
    const settings = wrapper.findComponent({ name: 'HotKeyActionScheme_Settings' })
    expect(settings.props('mode')).toBe('create')
  })
})
