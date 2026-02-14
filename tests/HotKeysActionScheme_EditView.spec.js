// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HotKeyActionSchemeEditView from '@/views/HotKeyActionScheme_EditView.vue'

vi.mock('@/dialogs/HotKeyActionScheme_Settings.vue', () => ({
  default: {
    name: 'HotKeyActionScheme_Settings',
    template: '<div data-testid="scheme-settings">Settings</div>',
    props: ['mode', 'hotKeyActionSchemeId']
  }
}))

describe('HotKeyActionScheme_EditView.vue', () => {
  it('passes edit mode and id', () => {
    const wrapper = mount(HotKeyActionSchemeEditView, { props: { id: 11 } })
    const settings = wrapper.findComponent({ name: 'HotKeyActionScheme_Settings' })
    expect(settings.props('mode')).toBe('edit')
    expect(settings.props('hotKeyActionSchemeId')).toBe(11)
  })
})
