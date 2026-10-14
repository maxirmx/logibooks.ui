/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ParcelHeaderActionsBar from '@/components/ParcelHeaderActionsBar.vue'

const actionButtonStub = {
  inheritAttrs: false,
  template:
    '<button :data-tooltip="tooltipText" :data-icon="icon" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
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
const mockIsSrLogistPlus = ref(true)

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
    user: mockUser.value,
    get isSrLogistPlus() {
      return mockIsSrLogistPlus.value
    }
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
    mockIsSrLogistPlus.value = true
    ensureOpsLoadedMock.mockResolvedValue(mockOps)
    getByIdMock.mockResolvedValue(mockScheme)
    getOpsEventMock.mockImplementation((actions, actionValue) => {
      const action = actions.find((a) => a.value === actionValue)
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

  it('keeps navigation and downloads available while mutations are disabled', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'Read-only scheme',
      actions: [
        { id: 1, action: 1, keyCode: 'F1', shift: false, ctrl: false, alt: false, schemeId: 1 },
        { id: 2, action: 4, keyCode: 'F4', shift: false, ctrl: false, alt: false, schemeId: 1 },
        { id: 3, action: 6, keyCode: 'F6', shift: false, ctrl: false, alt: false, schemeId: 1 },
        { id: 4, action: 7, keyCode: 'F7', shift: false, ctrl: false, alt: false, schemeId: 1 }
      ]
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { mutationDisabled: true },
      global: { stubs: { ActionButton: actionButtonStub } }
    })
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
    expect(buttons[2].attributes('disabled')).toBeUndefined()
    expect(buttons[3].attributes('disabled')).toBeDefined()
    expect(buttons[4].attributes('disabled')).toBeUndefined()
    expect(buttons[5].attributes('disabled')).toBeDefined()

    for (const code of ['F1', 'F4', 'F6', 'F7']) {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          code,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
          altKey: false
        })
      )
      await wrapper.vm.$nextTick()
    }

    expect(wrapper.emitted()['next-parcel']).toHaveLength(1)
    expect(wrapper.emitted()['download']).toHaveLength(1)
    expect(wrapper.emitted()['save']).toBeUndefined()
    expect(wrapper.emitted()['lookup']).toBeUndefined()
  })

  it('disables all action buttons except cancel when actionsDisabled is true', () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { actionsDisabled: true },
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(7)

    const disabledIndexes = [0, 1, 2, 3, 4, 5]
    for (const index of disabledIndexes) {
      expect(buttons[index].attributes('disabled')).toBeDefined()
    }

    expect(buttons[6].attributes('disabled')).toBeUndefined()
  })

  it('allows lookup hotkeys when lookupDisabled is false', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'Lookup Scheme',
      actions: [
        { id: 1, action: 6, keyCode: 'KeyL', shift: false, ctrl: true, alt: false, schemeId: 1 }
      ]
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { lookupDisabled: false },
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Ctrl+L should trigger lookup when lookupDisabled is false
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'KeyL',
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['lookup']?.length ?? 0).toBeGreaterThan(0)
  })

  it('does not respond to hotkeys when disabled', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { disabled: true },
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F1',
        shiftKey: false,
        ctrlKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toEqual({})
  })

  it('does not respond to hotkeys with incorrect modifiers', async () => {
    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // F2 without Shift (should not trigger because F2 requires Shift)
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F2',
        shiftKey: false,
        ctrlKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-issue']).toBeUndefined()

    // F1 with Shift (should not trigger because F1 requires no modifiers)
    // Record count before to verify no new event is emitted
    const countBefore = wrapper.emitted()['next-parcel']?.length ?? 0

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F1',
        shiftKey: true,
        ctrlKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    const countAfter = wrapper.emitted()['next-parcel']?.length ?? 0
    expect(countAfter).toBe(countBefore)
  })

  it('handles scheme loading error gracefully', async () => {
    getByIdMock.mockRejectedValue(new Error('Scheme not found'))

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getByIdMock).toHaveBeenCalled()

    // Should not respond to hotkeys since loading failed
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F1',
        shiftKey: false,
        ctrlKey: false,
        altKey: false
      })
    )
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
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Should not crash and should not respond to hotkeys
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F1',
        shiftKey: false,
        ctrlKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toEqual({})
  })

  it('filters out actions with empty event', async () => {
    getOpsEventMock.mockImplementation((actions, actionValue) => {
      if (actionValue === 2) return '' // Return empty event for action 2
      const action = actions.find((a) => a.value === actionValue)
      return action ? action.event : String(actionValue)
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // F2 should not work because its event is empty
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F2',
        shiftKey: true,
        ctrlKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-issue']).toBeUndefined()

    // F1 should still work
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F1',
        shiftKey: false,
        ctrlKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-parcel']?.length ?? 0).toBeGreaterThan(0)
  })

  it('handles ensureOpsLoaded error gracefully', async () => {
    ensureOpsLoadedMock.mockRejectedValue(new Error('Ops loading failed'))

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getByIdMock).not.toHaveBeenCalled()
  })

  it('does not fire ctrl:false actions when Ctrl or Cmd is pressed', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'No Modifier Scheme',
      actions: [
        { id: 1, action: 1, keyCode: 'F1', shift: false, ctrl: false, alt: false, schemeId: 1 }
      ]
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Ctrl+F1 should NOT trigger the action (action requires ctrl: false)
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F1',
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-parcel'] ?? []).toHaveLength(0)

    // Cmd+F1 should also NOT trigger the action
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F1',
        shiftKey: false,
        ctrlKey: false,
        metaKey: true,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-parcel'] ?? []).toHaveLength(0)

    // Plain F1 (no modifiers) SHOULD trigger the action
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F1',
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['next-parcel']?.length ?? 0).toBeGreaterThan(0)
  })

  it('respects downloadDisabled for download hotkeys', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'Download Scheme',
      actions: [
        { id: 1, action: 7, keyCode: 'KeyD', shift: false, ctrl: true, alt: false, schemeId: 1 }
      ]
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { downloadDisabled: true },
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Ctrl+D should NOT trigger download when downloadDisabled is true
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'KeyD',
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()['download']).toBeUndefined()
  })

  it('skips hotkey mapping when ops metadata is unavailable', async () => {
    // ensureOpsLoaded resolves with null when the fetch fails
    ensureOpsLoadedMock.mockResolvedValue(null)

    const wrapper = mount(ParcelHeaderActionsBar, {
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // getById should not have been called since we returned early when ops unavailable
    expect(getByIdMock).not.toHaveBeenCalled()

    // Key presses on this wrapper should not emit any event (hotkeyActions is empty)
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F1',
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()

    // No declared events should have been emitted by this wrapper
    const emittedEvents = Object.keys(wrapper.emitted())
    expect(emittedEvents).toHaveLength(0)

    wrapper.unmount()
  })

  it('respects disabled prop for download hotkeys', async () => {
    getByIdMock.mockResolvedValue({
      id: 1,
      name: 'Download Scheme',
      actions: [
        { id: 1, action: 7, keyCode: 'KeyD', shift: false, ctrl: true, alt: false, schemeId: 1 }
      ]
    })

    const wrapper = mount(ParcelHeaderActionsBar, {
      props: { disabled: true, downloadDisabled: false },
      global: { stubs: { ActionButton: actionButtonStub } }
    })

    // Wait for onMounted to complete
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Ctrl+D should NOT trigger download when disabled is true
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'KeyD',
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        altKey: false
      })
    )
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toEqual({})
  })
})
