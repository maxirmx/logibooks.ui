/* @vitest-environment jsdom */
/* global KeyboardEvent */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelHeaderActionsBar from '@/components/ParcelHeaderActionsBar.vue'

const actionButtonStub = {
  inheritAttrs: false,
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  props: {
    disabled: { type: Boolean, default: false },
    item: { type: Object, default: () => ({}) },
    icon: { type: String, default: '' },
    iconSize: { type: String, default: '2x' },
    tooltipText: { type: String, default: '' },
    variant: { type: String, default: '' }
  }
}

describe('ParcelHeaderActionsBar', () => {
  it('emits corresponding events when enabled', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    const buttons = wrapper.findAll('button')
    // New groups and template order:
    // group1: next-parcel(0), next-issue(1), back(2)
    // group2: lookup(3)
    // group3: download(4)
    // group4: save(5), cancel(6)
    const eventsByIndex = [
      'next-parcel', // 0
      'next-issue', // 1
      'back', // 2
      'lookup', // 3
      'download', // 4
      'save', // 5
      'cancel' // 6
    ]

    for (const [index, eventName] of eventsByIndex.entries()) {
      const before = wrapper.emitted()[eventName]?.length ?? 0
      await buttons[index].trigger('click')
      const after = wrapper.emitted()[eventName]?.length ?? 0
      expect(after).toBe(before + 1)
    }
  })

  it('does not emit events when disabled', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { disabled: true },
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    const buttons = wrapper.findAll('button')

    for (const button of buttons) {
      const eventsBefore = { ...wrapper.emitted() }
      await button.trigger('click')
      expect(wrapper.emitted()).toEqual(eventsBefore)
    }
  })

  it('prevents only download when downloadDisabled is true', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { downloadDisabled: true },
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    const buttons = wrapper.findAll('button')
    // indices in template: 0..6 -> next-parcel, next-issue, back, lookup, download, save, cancel
    // test non-download events: indices [0,1,2,3,5,6]
    const eventNames = ['next-parcel', 'next-issue', 'back', 'lookup', 'save', 'cancel']
    const eventIndexes = [0, 1, 2, 3, 5, 6]

    for (let i = 0; i < eventIndexes.length; i++) {
      const idx = eventIndexes[i]
      const eventName = eventNames[i]
      const before = wrapper.emitted()[eventName]?.length ?? 0
      await buttons[idx].trigger('click')
      const after = wrapper.emitted()[eventName]?.length ?? 0
      expect(after).toBe(before + 1)
    }

    const downloadBefore = wrapper.emitted()['download']?.length ?? 0
    // attempt to click download button (index 4) - should not emit because downloadDisabled true
    await buttons[4].trigger('click')
    const downloadAfter = wrapper.emitted()['download']?.length ?? 0
    expect(downloadAfter).toBe(downloadBefore)
  })

  it('responds to F1/F2/F3 keyboard events when enabled', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-parcel']?.length ?? 0).toBeGreaterThan(0)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-issue']?.length ?? 0).toBeGreaterThan(0)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F3' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['back']?.length ?? 0).toBeGreaterThan(0)
  })

  it('does not respond to function keys when disabled', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { disabled: true },
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toEqual({})
  })
})
