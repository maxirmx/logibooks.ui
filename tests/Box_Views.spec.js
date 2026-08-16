/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BoxesView from '@/views/Boxes_View.vue'
import BoxCreateView from '@/views/Box_CreateView.vue'
import BoxEditView from '@/views/Box_EditView.vue'

vi.mock('@/lists/Boxes_List.vue', () => ({
  default: {
    props: ['registerId'],
    template: '<div data-testid="boxes-list" :data-register-id="registerId"></div>'
  }
}))

vi.mock('@/dialogs/Box_EditDialog.vue', () => ({
  default: {
    props: ['mode', 'registerId', 'boxId'],
    template:
      '<div data-testid="box-dialog" :data-mode="mode" :data-register-id="registerId" :data-box-id="boxId"></div>'
  }
}))

describe('box route views', () => {
  it('passes the register to Boxes_List', () => {
    const wrapper = mount(BoxesView, { props: { registerId: 42 } })
    expect(wrapper.get('[data-testid="boxes-list"]').attributes('data-register-id')).toBe('42')
  })

  it('configures the shared dialog for creation', () => {
    const wrapper = mount(BoxCreateView, { props: { registerId: 42 } })
    const dialog = wrapper.get('[data-testid="box-dialog"]')
    expect(dialog.attributes('data-mode')).toBe('create')
    expect(dialog.attributes('data-register-id')).toBe('42')
  })

  it('configures the shared dialog for editing', () => {
    const wrapper = mount(BoxEditView, { props: { registerId: 42, id: 7 } })
    const dialog = wrapper.get('[data-testid="box-dialog"]')
    expect(dialog.attributes('data-mode')).toBe('edit')
    expect(dialog.attributes('data-register-id')).toBe('42')
    expect(dialog.attributes('data-box-id')).toBe('7')
  })
})
