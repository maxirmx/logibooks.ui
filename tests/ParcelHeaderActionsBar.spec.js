/* @vitest-environment jsdom */
/* global KeyboardEvent */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
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

// Mock stores
const mockUser = ref({
  id: 1,
  email: 'test@test.com',
  schemeId: 1
})

const mockScheme = {
  id: 1,
  name: 'Test Scheme',
  actions: [
    { id: 1, action: 1, keyCode: 'F1', shift: false, ctrl: false, alt: false, schemeId: 1 },
    { id: 2, action: 2, keyCode: 'F2', shift: true, ctrl: false, alt: false, schemeId: 1 },
    { id: 3, action: 3, keyCode: 'F3', shift: false, ctrl: false, alt: false, schemeId: 1 }
  ]
}

const mockOps = {
  actions: [
    { value: 1, name: 'Next Parcel', event: 'next-parcel' },
    { value: 2, name: 'Next Issue', event: 'next-issue' },
    { value: 3, name: 'Back', event: 'back' },
    { value: 4, name: 'Save', event: 'save' },
    { value: 5, name: 'Cancel', event: 'cancel' },
    { value: 6, name: 'Lookup', event: 'lookup' },
    { value: 7, name: 'Download', event: 'download' }
  ]
}

const getByIdMock = vi.fn()
const ensureOpsLoadedMock = vi.fn()
const getOpsEventMock = vi.fn()

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    user: mockUser.value
  })
}))

vi.mock('@/stores/hotkey.action.schemes.store.js', () => ({
  useHotKeyActionSchemesStore: () => ({
    ops: mockOps,
    ensureOpsLoaded: ensureOpsLoadedMock,
    getById: getByIdMock,
    getOpsEvent: getOpsEventMock
  })
}))

describe('ParcelHeaderActionsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.value = {
      id: 1,
      email: 'test@test.com',
      schemeId: 1
    }
    ensureOpsLoadedMock.mockResolvedValue(mockOps)
    getByIdMock.mockResolvedValue(mockScheme)
    getOpsEventMock.mockImplementation((actions, actionValue) => {
      const action = actions.find(a => a.value === actionValue)
      return action ? action.event : String(actionValue)
    })
  })

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

  it('loads hotkey actions from store on mount', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(ensureOpsLoadedMock).toHaveBeenCalled()
    expect(getByIdMock).toHaveBeenCalledWith(1)
    expect(getOpsEventMock).toHaveBeenCalled()
  })

  it('responds to configured hotkey events when enabled', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Dispatch F1 (configured as next-parcel without modifiers)
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F1', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-parcel']?.length ?? 0).toBeGreaterThan(0)

    // Dispatch F2 with Shift (configured as next-issue with shift)
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F2', 
      shiftKey: true, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-issue']?.length ?? 0).toBeGreaterThan(0)

    // Dispatch F3 (configured as back without modifiers)
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F3', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['back']?.length ?? 0).toBeGreaterThan(0)
  })

  it('does not respond to hotkeys when disabled', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { disabled: true },
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F1', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toEqual({})
  })

  it('does not respond to hotkeys with incorrect modifiers', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // F2 without Shift (should not trigger because F2 requires Shift)
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F2', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-issue']).toBeUndefined()

    // F1 with Shift (should not trigger because F1 requires no modifiers)
    // Record count before to verify no new event is emitted
    const countBefore = wrapper.emitted()['next-parcel']?.length ?? 0
    
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F1', 
      shiftKey: true, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    const countAfter = wrapper.emitted()['next-parcel']?.length ?? 0
    expect(countAfter).toBe(countBefore)
  })

  it('handles missing schemeId gracefully', async () => {
    mockUser.value = {
      id: 1,
      email: 'test@test.com'
      // no schemeId
    }

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(ensureOpsLoadedMock).toHaveBeenCalled()
    expect(getByIdMock).not.toHaveBeenCalled()

    // Should not respond to any hotkeys since no scheme is loaded
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F1', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toEqual({})
  })

  it('handles scheme loading error gracefully', async () => {
    getByIdMock.mockRejectedValue(new Error('Scheme not found'))

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(getByIdMock).toHaveBeenCalled()

    // Should not respond to hotkeys since loading failed
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F1', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toEqual({})

    consoleErrorSpy.mockRestore()
  })

  it('handles scheme with empty actions', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'Empty Scheme',
      actions: []
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Should not respond to hotkeys since no actions are configured
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F1', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toEqual({})
  })

  it('handles scheme with null actions', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'Null Actions Scheme',
      actions: null
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Should not crash and should not respond to hotkeys
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F1', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toEqual({})
  })

  it('filters out actions with empty keyCode', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'Partial Scheme',
      actions: [
        { id: 1, action: 1, keyCode: 'F1', shift: false, ctrl: false, alt: false, schemeId: 1 },
        { id: 2, action: 2, keyCode: '', shift: false, ctrl: false, alt: false, schemeId: 1 },
        { id: 3, action: 3, keyCode: 'F3', shift: false, ctrl: false, alt: false, schemeId: 1 }
      ]
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // F1 should work
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F1', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-parcel']?.length ?? 0).toBeGreaterThan(0)

    // F3 should work
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F3', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['back']?.length ?? 0).toBeGreaterThan(0)
  })

  it('filters out actions with empty event', async () => {
    getOpsEventMock.mockImplementation((actions, actionValue) => {
      if (actionValue === 2) return '' // Return empty event for action 2
      const action = actions.find(a => a.value === actionValue)
      return action ? action.event : String(actionValue)
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // F2 should not work because its event is empty
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F2', 
      shiftKey: true, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-issue']).toBeUndefined()

    // F1 should still work
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'F1', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-parcel']?.length ?? 0).toBeGreaterThan(0)
  })

  it('handles ctrl and alt modifier combinations', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'Modifier Scheme',
      actions: [
        { id: 1, action: 4, keyCode: 'KeyS', shift: false, ctrl: true, alt: false, schemeId: 1 },
        { id: 2, action: 5, keyCode: 'Escape', shift: false, ctrl: false, alt: true, schemeId: 1 }
      ]
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Ctrl+S should trigger save
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'KeyS', 
      shiftKey: false, 
      ctrlKey: true, 
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['save']?.length ?? 0).toBeGreaterThan(0)

    // Alt+Escape should trigger cancel
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'Escape', 
      shiftKey: false, 
      ctrlKey: false, 
      altKey: true 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['cancel']?.length ?? 0).toBeGreaterThan(0)

    // Ctrl+Alt+S should NOT trigger save (wrong modifiers)
    const saveBefore = wrapper.emitted()['save']?.length ?? 0
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'KeyS', 
      shiftKey: false, 
      ctrlKey: true, 
      altKey: true 
    }))
    await wrapper.vm.$nextTick()
    const saveAfter = wrapper.emitted()['save']?.length ?? 0
    expect(saveAfter).toBe(saveBefore)
  })

  it('handles ensureOpsLoaded error gracefully', async () => {
    ensureOpsLoadedMock.mockRejectedValue(new Error('Ops loading failed'))

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(getByIdMock).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('supports Mac Cmd key (metaKey) as Ctrl alternative', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'Mac Scheme',
      actions: [
        { id: 1, action: 4, keyCode: 'KeyS', shift: false, ctrl: true, alt: false, schemeId: 1 }
      ]
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Cmd+S on Mac (metaKey instead of ctrlKey) should trigger save
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'KeyS', 
      shiftKey: false, 
      ctrlKey: false,
      metaKey: true,
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['save']?.length ?? 0).toBeGreaterThan(0)

    // Regular Ctrl+S should also work
    window.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'KeyS', 
      shiftKey: false, 
      ctrlKey: true,
      metaKey: false,
      altKey: false 
    }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['save']?.length ?? 0).toBeGreaterThan(1)
  })

  it('properly prevents default on matched hotkeys', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Use a custom event handler to verify preventDefault is called
    let preventDefaultCalled = false
    const originalPreventDefault = KeyboardEvent.prototype.preventDefault
    KeyboardEvent.prototype.preventDefault = function() {
      preventDefaultCalled = true
      originalPreventDefault.call(this)
    }

    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { 
        code: 'F1', 
        shiftKey: false, 
        ctrlKey: false, 
        altKey: false,
        cancelable: true
      }))
      await wrapper.vm.$nextTick()

      expect(preventDefaultCalled).toBe(true)
      expect(wrapper.emitted()['next-parcel']?.length ?? 0).toBeGreaterThan(0)
    } finally {
      // Restore original preventDefault
      KeyboardEvent.prototype.preventDefault = originalPreventDefault
    }
  })
})
