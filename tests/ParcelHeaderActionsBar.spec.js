/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelHeaderActionsBar from '@/components/ParcelHeaderActionsBar.vue'

const actionButtonStub = {
  inheritAttrs: false,
  template: '<button v-bind="$attrs" :disabled="disabled"><slot /></button>',
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
    const events = ['next-parcel', 'next-problem', 'back', 'save', 'cancel', 'download']

    for (const [index, eventName] of events.entries()) {
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
    const regularEvents = ['next-parcel', 'next-problem', 'back', 'save', 'cancel']

    for (const [index, eventName] of regularEvents.entries()) {
      const before = wrapper.emitted()[eventName]?.length ?? 0
      await buttons[index].trigger('click')
      const after = wrapper.emitted()[eventName]?.length ?? 0
      expect(after).toBe(before + 1)
    }

    const downloadBefore = wrapper.emitted()['download']?.length ?? 0
    await buttons[5].trigger('click')
    const downloadAfter = wrapper.emitted()['download']?.length ?? 0
    expect(downloadAfter).toBe(downloadBefore)
  })
})
