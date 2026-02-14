// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HotKeysActionSchemeEditView from '@/views/HotKeysActionScheme_EditView.vue'

vi.mock('@/dialogs/HotKeysActionScheme_Settings.vue', () => ({
  default: {
    name: 'HotKeysActionScheme_Settings',
    template: '<div data-testid="scheme-settings">Settings</div>',
    props: ['mode', 'hotKeyActionSchemeId']
  }
}))

describe('HotKeysActionScheme_EditView.vue', () => {
  it('passes edit mode and id', () => {
    const wrapper = mount(HotKeysActionSchemeEditView, { props: { id: 11 } })
    const settings = wrapper.findComponent({ name: 'HotKeysActionScheme_Settings' })
    expect(settings.props('mode')).toBe('edit')
    expect(settings.props('hotKeyActionSchemeId')).toBe(11)
  })
})
