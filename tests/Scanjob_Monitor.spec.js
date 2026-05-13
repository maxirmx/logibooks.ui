/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ScanjobMonitor from '@/dialogs/Scanjob_Monitor.vue'
import { defaultGlobalStubs } from './helpers/test-utils'

const mockBack = vi.hoisted(() => vi.fn())
const clearAlert = vi.hoisted(() => vi.fn())
const mockAlert = vi.hoisted(() => ({
  __v_isRef: true,
  value: { type: 'alert-danger', message: 'Ошибка монитора' }
}))
const mockScanjob = vi.hoisted(() => ({
  __v_isRef: true,
  value: { id: 42, name: 'Scanjob A' }
}))
const getById = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 42, name: 'Scanjob A' }))

vi.mock('@/router', () => ({
  default: { back: mockBack }
}), { virtual: true })

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    scanjob: mockScanjob,
    getById
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    alert: mockAlert,
    error: vi.fn(),
    clear: clearAlert
  })
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      const refs = {}
      Object.keys(store).forEach((key) => {
        const value = store[key]
        if (value && typeof value === 'object' && 'value' in value) {
          refs[key] = value
        }
      })
      return refs
    }
  }
})

describe('Scanjob_Monitor.vue', () => {
  it('renders scanjob heading and alert store error output', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await flushPromises()

    expect(getById).toHaveBeenCalledWith(42)
    expect(wrapper.text()).toContain('Scanjob A')
    expect(wrapper.text()).toContain('Ошибка монитора')
  })

  it('closes via header action', async () => {
    const wrapper = mount(ScanjobMonitor, {
      props: { scanjobId: 42 },
      global: { stubs: defaultGlobalStubs }
    })

    await wrapper.vm.close()

    expect(mockBack).toHaveBeenCalled()
  })
})
