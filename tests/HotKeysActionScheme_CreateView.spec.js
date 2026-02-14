// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HotKeysActionSchemeCreateView from '@/views/HotKeysActionScheme_CreateView.vue'

vi.mock('@/dialogs/HotKeysActionScheme_Settings.vue', () => ({
  default: {
    name: 'HotKeysActionScheme_Settings',
    template: '<div data-testid="scheme-settings">Settings</div>',
    props: ['mode']
  }
}))

describe('HotKeysActionScheme_CreateView.vue', () => {
  it('passes create mode', () => {
    const wrapper = mount(HotKeysActionSchemeCreateView)
    const settings = wrapper.findComponent({ name: 'HotKeysActionScheme_Settings' })
    expect(settings.props('mode')).toBe('create')
  })
})
