/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import ScanjobSettings from '@/dialogs/Scanjob_Settings.vue'
import ActionButton from '@/components/ActionButton.vue'
import { resolveAll, vuetifyStubs } from './helpers/test-utils'

const vuetify = createVuetify()

const mockOps = ref({
  types: [{ value: 1, name: 'Type 1' }],
  operations: [{ value: 2, name: 'Operation 1' }],
  modes: [{ value: 3, name: 'Mode 1' }],
  statuses: [
    { value: 4, name: 'Draft' },
    { value: 5, name: 'Started' },
    { value: 6, name: 'Paused' },
    { value: 7, name: 'Finished' }
  ]
})

const mockScanjob = {
  id: 11,
  name: 'Test scanjob',
  type: 1,
  operation: 2,
  mode: 3,
  status: 4,
  warehouseId: 11,
  registerId: 22,
  allowStart: true,
  allowPause: false,
  allowFinish: false
}

const updatedScanjob = {
  ...mockScanjob,
  status: 5,
  allowStart: false,
  allowPause: true,
  allowFinish: false
}

const ensureOpsLoaded = vi.hoisted(() => vi.fn())
const getById = vi.hoisted(() => vi.fn())
const create = vi.hoisted(() => vi.fn())
const update = vi.hoisted(() => vi.fn())
const start = vi.hoisted(() => vi.fn())
const pause = vi.hoisted(() => vi.fn())
const finish = vi.hoisted(() => vi.fn())
const ensureLoaded = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())
const routerPush = vi.hoisted(() => vi.fn())

const getWarehouseName = vi.hoisted(() => vi.fn((id) => `Warehouse ${id}`))

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    ensureOpsLoaded,
    getById,
    create,
    update,
    start,
    pause,
    finish,
    getOpsLabel: (list, value) => {
      const match = list?.find((item) => Number(item.value) === Number(value))
      return match ? match.name : String(value)
    }
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    ensureLoaded,
    getWarehouseName
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: alertError,
    alert: null,
    clear: vi.fn()
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    hasWhRole: true
  })
}))

vi.mock('@/router', () => ({
  default: {
    push: routerPush
  }
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({
      ops: mockOps
    })
  }
})

describe('Scanjob_Settings.vue', () => {
  const mountComponent = (props) => {
    return mount(ScanjobSettings, {
      props,
      global: {
        plugins: [vuetify, createPinia()],
        components: {
          ActionButton
        },
        stubs: {
          'font-awesome-icon': true,
          ...vuetifyStubs
        }
      }
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ensureOpsLoaded.mockResolvedValue(mockOps.value)
    ensureLoaded.mockResolvedValue()
    getById.mockResolvedValue(mockScanjob)
    create.mockResolvedValue(mockScanjob)
    update.mockResolvedValue(true)
    start.mockResolvedValue(true)
    pause.mockResolvedValue(true)
    finish.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('throws when edit mode is missing scanjobId', () => {
    expect(() => mountComponent({ mode: 'edit' })).toThrow('scanjobId is required when mode is edit')
    expect(alertError).toHaveBeenCalledWith('Невозможно редактировать задание на сканирование: отсутствует идентификатор')
    expect(routerPush).toHaveBeenCalledWith('/scanjobs')
  })

  it('renders create mode with read-only status and header actions', async () => {
    const wrapper = mountComponent({
      mode: 'create',
      registerId: 22,
      warehouseId: 11,
      dealNumber: 'ABC-1'
    })
    await resolveAll()

    const statusInput = wrapper.find('[data-testid="status-display"]')
    expect(statusInput.exists()).toBe(true)
    expect(statusInput.element.value).toBe('Draft')
    expect(wrapper.find('select#status').exists()).toBe(false)
    expect(wrapper.find('[data-testid="scanjob-start-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="scanjob-save-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scanjob-cancel-action"]').exists()).toBe(true)
  })

  it('creates scanjob on header save action', async () => {
    const wrapper = mountComponent({
      mode: 'create',
      registerId: 22,
      warehouseId: 11,
      dealNumber: 'ABC-1'
    })
    await resolveAll()

    await wrapper.find('#name').setValue('Сканирование сделки ABC-1')
    await wrapper.find('#type').setValue('1')
    await wrapper.find('#operation').setValue('2')
    await wrapper.find('#mode').setValue('3')
    await wrapper.find('input[name="registerId"]').setValue(22)
    await wrapper.find('input[name="warehouseId"]').setValue(11)

    await wrapper.vm.$.setupState.onSubmit()
    await resolveAll()

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Сканирование сделки ABC-1',
      registerId: 22,
      warehouseId: 11,
      status: 4
    }))
    expect(routerPush).toHaveBeenCalledWith('/scanjobs')
  })

  it('renders edit mode and updates scanjob on save action', async () => {
    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    await wrapper.find('#name').setValue('Test scanjob')
    await wrapper.find('#type').setValue('1')
    await wrapper.find('#operation').setValue('2')
    await wrapper.find('#mode').setValue('3')
    await wrapper.find('input[name="registerId"]').setValue(22)
    await wrapper.find('input[name="warehouseId"]').setValue(11)

    await wrapper.vm.$.setupState.onSubmit()
    await resolveAll()

    expect(update).toHaveBeenCalledWith(11, expect.objectContaining({
      name: 'Test scanjob',
      registerId: 22,
      warehouseId: 11
    }))
    expect(routerPush).toHaveBeenCalledWith('/scanjobs')
  })

  it('handles start action and refreshes status display', async () => {
    getById.mockResolvedValueOnce(mockScanjob).mockResolvedValueOnce(updatedScanjob)
    update.mockResolvedValue(true)
    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    const startButton = wrapper.find('[data-testid="scanjob-start-action"]')
    await startButton.trigger('click')
    await resolveAll()

    expect(update).toHaveBeenCalled()
    expect(start).toHaveBeenCalledWith(11)
    expect(getById).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="status-display"]').element.value).toBe('Started')
  })

  it('reports status action errors for pause and finish', async () => {
    pause.mockRejectedValue(new Error('403 Forbidden'))
    finish.mockRejectedValue(new Error('404 Not Found'))
    update.mockResolvedValue(true)
    getById.mockResolvedValue({
      ...mockScanjob,
      allowPause: true,
      allowFinish: true
    })

    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    await wrapper.find('[data-testid="scanjob-pause-action"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('Нет прав для приостановки сканирования')

    await wrapper.find('[data-testid="scanjob-finish-action"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('Задание на сканирование не найдено')
  })

  it('shows api error when update fails with conflict', async () => {
    update.mockRejectedValue(new Error('409 Conflict'))
    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    await wrapper.find('#name').setValue('Test scanjob')
    await wrapper.find('#type').setValue('1')
    await wrapper.find('#operation').setValue('2')
    await wrapper.find('#mode').setValue('3')
    await wrapper.find('input[name="registerId"]').setValue(22)
    await wrapper.find('input[name="warehouseId"]').setValue(11)

    await wrapper.vm.$.setupState.onSubmit()
    await resolveAll()

    expect(wrapper.text()).toContain('Такое задание на сканирование уже существует')
  })

  it('reports refresh errors when status update fails', async () => {
    getById.mockResolvedValueOnce(mockScanjob).mockResolvedValueOnce(null)
    update.mockResolvedValue(true)
    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    await wrapper.find('[data-testid="scanjob-start-action"]').trigger('click')
    await resolveAll()

    expect(alertError).toHaveBeenCalledWith('Не удалось обновить задание на сканирование')
  })
})
