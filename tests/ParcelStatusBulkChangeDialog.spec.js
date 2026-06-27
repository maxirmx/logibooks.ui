/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ParcelStatusBulkChangeDialog from '@/l2/ParcelStatusBulkChangeDialog.vue'

const mocks = vi.hoisted(() => ({
  resolveStatusSelection: vi.fn(),
  updateStatusSelection: vi.fn(),
  setParcelStatuses: vi.fn(),
  alertSuccess: vi.fn(),
  alertError: vi.fn()
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    resolveStatusSelection: mocks.resolveStatusSelection,
    updateStatusSelection: mocks.updateStatusSelection
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    setParcelStatuses: mocks.setParcelStatuses
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    success: mocks.alertSuccess,
    error: mocks.alertError
  })
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'iconSize', 'disabled'],
    emits: ['click'],
    inheritAttrs: false,
    template: '<button type="button" v-bind="$attrs" :data-icon="icon" :data-icon-size="iconSize" :title="tooltipText" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

const statusOptions = [
  { id: 3, title: 'Status 3' },
  { id: 4, title: 'Status 4' }
]

function mountDialog(props = {}) {
  return mount(ParcelStatusBulkChangeDialog, {
    props: {
      show: true,
      registerId: 7,
      statusOptions,
      ...props
    },
    global: {
      stubs: {
        'v-dialog': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div data-testid="dialog"><slot /></div>'
        },
        'v-card': { template: '<div><slot /></div>' },
        'v-card-title': { template: '<div><slot /></div>' },
        'v-card-text': { template: '<div><slot /></div>' },
        'v-card-actions': { template: '<div data-testid="v-card-actions"><slot /></div>' },
        'v-select': {
          props: ['modelValue', 'items', 'itemTitle', 'itemValue', 'disabled'],
          emits: ['update:modelValue'],
          inheritAttrs: false,
          template: `
            <select v-bind="$attrs" :value="modelValue ?? ''" :disabled="disabled" @change="$emit('update:modelValue', Number($event.target.value))">
              <option value=""></option>
              <option v-for="item in items" :key="item[itemValue]" :value="item[itemValue]">{{ item[itemTitle] }}</option>
            </select>
          `
        },
        'font-awesome-icon': true
      }
    }
  })
}

describe('ParcelStatusBulkChangeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveStatusSelection.mockResolvedValue({
      parcelIds: [],
      missingNumbers: [],
      blockedItems: []
    })
    mocks.updateStatusSelection.mockResolvedValue({ updatedCount: 0, skippedCount: 0 })
    mocks.setParcelStatuses.mockResolvedValue()
  })

  it('keeps action buttons disabled until required input is present', async () => {
    const wrapper = mountDialog()

    expect(wrapper.find('[data-testid="parcel-status-bulk-find"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="parcel-status-bulk-update-found"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="parcel-status-bulk-update-all"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('3')
    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1')

    expect(wrapper.find('[data-testid="parcel-status-bulk-find"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-testid="parcel-status-bulk-update-found"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="parcel-status-bulk-update-all"]').attributes('disabled')).toBeUndefined()
  })

  it('uses the standard header action layout', () => {
    const wrapper = mountDialog()
    const header = wrapper.find('.header-with-actions')

    expect(header.exists()).toBe(true)
    expect(header.find('.primary-heading').text()).toBe('Изменить статус посылок')
    expect(header.find('.header-actions-bar').exists()).toBe(true)
    const actionGroups = header.findAll('.header-actions.header-actions-group')
    expect(actionGroups).toHaveLength(2)
    expect(actionGroups[0].find('[data-testid="parcel-status-bulk-find"]').exists()).toBe(true)
    expect(actionGroups[0].find('[data-testid="parcel-status-bulk-update-found"]').exists()).toBe(true)
    expect(actionGroups[0].find('[data-testid="parcel-status-bulk-update-all"]').exists()).toBe(true)
    expect(actionGroups[1].find('[data-testid="parcel-status-bulk-cancel"]').exists()).toBe(true)
    expect(wrapper.find('.parcel-status-bulk-header hr.hr').exists()).toBe(true)
    expect(wrapper.find('[data-testid="v-card-actions"]').exists()).toBe(false)

    for (const testId of [
      'parcel-status-bulk-find',
      'parcel-status-bulk-update-found',
      'parcel-status-bulk-update-all',
      'parcel-status-bulk-cancel'
    ]) {
      expect(wrapper.find(`[data-testid="${testId}"]`).attributes('data-icon-size')).toBe('2x')
    }
  })

  it('resolves pasted comma and Excel cell values without clearing the textarea', async () => {
    mocks.resolveStatusSelection.mockResolvedValue({
      parcelIds: [11, 12],
      missingNumbers: ['MISSING-1'],
      blockedItems: [{ parcelId: 13, number: 'BLOCKED-1' }]
    })
    const wrapper = mountDialog()
    const input = wrapper.find('[data-testid="parcel-status-bulk-input"]')

    await input.setValue(' P-1, P-2')
    await input.setValue(`${input.element.value}\nP-3\tP-1`)
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()

    expect(mocks.resolveStatusSelection).toHaveBeenCalledWith(7, ['P-1', 'P-2', 'P-3'])
    expect(input.element.value).toBe(' P-1, P-2\nP-3\tP-1')
    expect(wrapper.find('[data-testid="parcel-status-bulk-report"]').element.value).toContain('MISSING-1')
    expect(wrapper.find('[data-testid="parcel-status-bulk-report"]').element.value).toContain('BLOCKED-1')
    expect(wrapper.find('[data-testid="parcel-status-bulk-summary"]').text()).toContain('Найдено: 2')
  })

  it('handles malformed resolve responses with safe defaults', async () => {
    mocks.resolveStatusSelection.mockResolvedValue({
      parcelIds: ['bad', 44],
      missingNumbers: 'bad',
      blockedItems: 'bad'
    })
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-44')
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="parcel-status-bulk-summary"]').text()).toContain('Найдено: 1')
    expect(wrapper.find('[data-testid="parcel-status-bulk-report"]').element.value).toBe('')
  })

  it('updates found parcels and emits refresh event', async () => {
    mocks.resolveStatusSelection.mockResolvedValue({
      parcelIds: [11, 12],
      missingNumbers: [],
      blockedItems: []
    })
    mocks.updateStatusSelection.mockResolvedValue({ updatedCount: 2, skippedCount: 1 })
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('3')
    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1,P-2')
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="parcel-status-bulk-update-found"]').trigger('click')
    await flushPromises()

    expect(mocks.updateStatusSelection).toHaveBeenCalledWith(7, 3, [11, 12])
    expect(mocks.alertSuccess).toHaveBeenCalledWith('Статус изменен для 2 посылок. Пропущено: 1')
    expect(wrapper.emitted('updated')).toHaveLength(1)
  })

  it('reports update-found errors from backend message fields', async () => {
    mocks.resolveStatusSelection.mockResolvedValue({
      parcelIds: [11],
      missingNumbers: [],
      blockedItems: []
    })
    mocks.updateStatusSelection.mockRejectedValue({ msg: 'update found failed' })
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('3')
    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1')
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="parcel-status-bulk-update-found"]').trigger('click')
    await flushPromises()

    expect(mocks.alertError).toHaveBeenCalledWith('update found failed')
  })

  it('updates all parcels in the register through the existing register endpoint', async () => {
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('4')
    await wrapper.find('[data-testid="parcel-status-bulk-update-all"]').trigger('click')
    await flushPromises()

    expect(mocks.setParcelStatuses).toHaveBeenCalledWith(7, 4)
    expect(mocks.alertSuccess).toHaveBeenCalledWith('Статус успешно применен ко всем посылкам в реестре')
    expect(wrapper.emitted('updated')).toHaveLength(1)
  })

  it('reports update-all errors from backend reason fields', async () => {
    mocks.setParcelStatuses.mockRejectedValue({ reason: 'update all failed' })
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('4')
    await wrapper.find('[data-testid="parcel-status-bulk-update-all"]').trigger('click')
    await flushPromises()

    expect(mocks.alertError).toHaveBeenCalledWith('update all failed')
  })

  it('reports backend errors without clearing user input', async () => {
    mocks.resolveStatusSelection.mockRejectedValue(new Error('resolve failed'))
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1')
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()

    expect(mocks.alertError).toHaveBeenCalledWith('resolve failed')
    expect(wrapper.find('[data-testid="parcel-status-bulk-input"]').element.value).toBe('P-1')
  })

  it('uses fallback error text when backend does not provide details', async () => {
    mocks.resolveStatusSelection.mockRejectedValue({})
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1')
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()

    expect(mocks.alertError).toHaveBeenCalledWith('Ошибка при поиске посылок')
  })

  it('guards actions when required state is missing', async () => {
    const wrapper = mountDialog({ registerId: null })

    await wrapper.vm.findParcels()
    await wrapper.vm.updateFound()
    await wrapper.vm.updateAll()

    expect(mocks.resolveStatusSelection).not.toHaveBeenCalled()
    expect(mocks.updateStatusSelection).not.toHaveBeenCalled()
    expect(mocks.setParcelStatuses).not.toHaveBeenCalled()
  })

  it('closes and resets state when hidden', async () => {
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('3')
    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1')
    await wrapper.find('[data-testid="parcel-status-bulk-cancel"]').trigger('click')

    expect(wrapper.emitted('update:show')?.[0]).toEqual([false])

    await wrapper.setProps({ show: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="parcel-status-bulk-input"]').element.value).toBe('')
    expect(wrapper.find('[data-testid="parcel-status-bulk-summary"]').text()).toContain('Введите номера')
  })
})
