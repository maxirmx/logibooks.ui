/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RegisterHistoryList from '@/lists/RegisterHistory_List.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const mocks = vi.hoisted(() => ({
  canView: true,
  getHistory: vi.fn(),
  ensureLoaded: vi.fn(),
  alertError: vi.fn(),
  routerPush: vi.fn()
}))

var mockRefs

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  const { ref } = await vi.importActual('vue')
  mockRefs = {
    items: ref([]),
    totalCount: ref(0),
    loading: ref(false)
  }
  return {
    ...actual,
    storeToRefs: () => mockRefs
  }
})

vi.mock('@/router', () => ({
  default: { push: mocks.routerPush }
}))

vi.mock('@/stores/register.history.store.js', () => ({
  useRegisterHistoryStore: () => ({
    items: mockRefs.items,
    totalCount: mockRefs.totalCount,
    loading: mockRefs.loading,
    getHistory: mocks.getHistory
  })
}))

vi.mock('@/stores/register.statuses.store.js', () => ({
  useRegisterStatusesStore: () => ({
    ensureLoaded: mocks.ensureLoaded,
    getStatusTitle: (id) => id === 2 ? 'На складе' : `Статус ${id}`
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    get isShiftLeadPlus() {
      return mocks.canView
    }
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ error: mocks.alertError })
}))

describe('RegisterHistory_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.canView = true
    mockRefs.items.value = [{
      id: 1,
      changedAt: '2026-07-30T12:00:00Z',
      userName: 'Иванов Иван',
      userEmail: 'ivan@example.com',
      reason: 'Сохранение изменений',
      changes: [{
        field: 'StatusId',
        oldValue: '1',
        newValue: '2'
      }]
    }]
    mockRefs.totalCount.value = 1
    mocks.ensureLoaded.mockResolvedValue()
    mocks.getHistory.mockResolvedValue()
  })

  it('loads and renders structured history for an authorized user', async () => {
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    expect(mocks.ensureLoaded).toHaveBeenCalled()
    expect(mocks.getHistory).toHaveBeenCalledWith(42, { page: 1, pageSize: 50 })
    expect(wrapper.text()).toContain('Иванов Иван')
    expect(wrapper.text()).toContain('Сохранение изменений')
    expect(wrapper.text()).toContain('Статус: Статус 1 → На складе')
  })

  it('does not request or render history for unauthorized roles', async () => {
    mocks.canView = false
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42 },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    expect(mocks.getHistory).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('доступна только администраторам и старшим смены')
    expect(wrapper.findComponent({ name: 'v-data-table-server' }).exists()).toBe(false)
  })

  it('returns to the register list preserving the operation mode', async () => {
    const wrapper = mount(RegisterHistoryList, {
      props: { registerId: 42, mode: 'warehouse' },
      global: { stubs: defaultGlobalStubs }
    })
    await flushPromises()

    wrapper.vm.returnToRegisters()
    expect(mocks.routerPush).toHaveBeenCalledWith({
      path: '/registers',
      query: { mode: 'warehouse' }
    })
  })
})
