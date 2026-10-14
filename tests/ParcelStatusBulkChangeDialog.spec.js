/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ParcelStatusBulkChangeDialog from '@/l2/ParcelStatusBulkChangeDialog.vue'
import {
  GTC_COMPANY_ID,
  OZON_COMPANY_ID,
  WBR_COMPANY_ID,
  WBRN_REGISTER_ID
} from '@/helpers/company.constants.js'

const mocks = vi.hoisted(() => ({
  resolveStatusSelection: vi.fn(),
  updateStatusSelection: vi.fn(),
  setParcelStatuses: vi.fn(),
  confirm: vi.fn(),
  alertSuccess: vi.fn(),
  alertError: vi.fn(),
  getRegisterById: vi.fn(),
  registerItems: [],
  registerItem: null
}))

vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({
    resolveStatusSelection: mocks.resolveStatusSelection,
    updateStatusSelection: mocks.updateStatusSelection
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    items: mocks.registerItems,
    item: mocks.registerItem,
    getById: mocks.getRegisterById,
    setParcelStatuses: mocks.setParcelStatuses
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    success: mocks.alertSuccess,
    error: mocks.alertError
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => mocks.confirm
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'iconSize', 'disabled'],
    emits: ['click'],
    inheritAttrs: false,
    template:
      '<button type="button" v-bind="$attrs" :data-icon="icon" :data-icon-size="iconSize" :title="tooltipText" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

const statusOptions = [
  { id: 3, title: 'Status 3' },
  { id: 4, title: 'Status 4' },
  { id: 5, title: 'Excluded', useAtCustomsProcessing: false }
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
          name: 'VDialog',
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
    mocks.getRegisterById.mockResolvedValue()
    mocks.confirm.mockResolvedValue(true)
    mocks.registerItems = []
    mocks.registerItem = null
  })

  it('renders the parcel-number label from the current register type', async () => {
    const wrapper = mountDialog({ register: { id: 7, registerType: WBR_COMPANY_ID } })
    const label = () => wrapper.find('label[for="parcel-status-bulk-input"]').text()

    expect(label()).toBe('ШК')

    await wrapper.setProps({ register: { id: 7, registerType: WBRN_REGISTER_ID } })
    expect(label()).toBe('ШК')

    await wrapper.setProps({ register: { id: 7, registerType: OZON_COMPANY_ID } })
    expect(label()).toBe('№ отправления')

    await wrapper.setProps({ register: { id: 7, registerType: GTC_COMPANY_ID } })
    expect(label()).toBe('№ посылки')

    await wrapper.setProps({ register: { id: 8, registerType: WBR_COMPANY_ID } })
    expect(label()).toBe('Номер посылки')
  })

  it('falls back to matching registers store entries for the parcel-number label', () => {
    mocks.registerItems = [{ id: 7, registerType: OZON_COMPANY_ID }]
    const wrapper = mountDialog()

    expect(wrapper.find('label[for="parcel-status-bulk-input"]').text()).toBe('№ отправления')
  })

  it('falls back to matching current register store item for the parcel-number label', () => {
    mocks.registerItem = { id: 7, registerType: GTC_COMPANY_ID }
    const wrapper = mountDialog()

    expect(wrapper.find('label[for="parcel-status-bulk-input"]').text()).toBe('№ посылки')
  })

  it('closes when the dialog model is set to false', async () => {
    const wrapper = mountDialog()

    await wrapper.findComponent({ name: 'VDialog' }).vm.$emit('update:modelValue', false)

    expect(wrapper.emitted('update:show')?.[0]).toEqual([false])
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
    expect(wrapper.find('[data-testid="parcel-status-bulk-report"]').element.value).toContain(
      'MISSING-1'
    )
    expect(wrapper.find('[data-testid="parcel-status-bulk-report"]').element.value).toContain(
      'BLOCKED-1'
    )
    expect(wrapper.find('[data-testid="parcel-status-bulk-summary"]').text()).toContain(
      'Найдено: 2'
    )
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

    expect(wrapper.find('[data-testid="parcel-status-bulk-summary"]').text()).toContain(
      'Найдено: 1'
    )
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

  it('refreshes the register after a read-only update conflict', async () => {
    mocks.resolveStatusSelection.mockResolvedValue({
      parcelIds: [11],
      missingNumbers: [],
      blockedItems: []
    })
    const conflict = Object.assign(new Error('Изменения запрещены'), { status: 409 })
    mocks.updateStatusSelection.mockRejectedValue(conflict)
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('3')
    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1')
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="parcel-status-bulk-update-found"]').trigger('click')
    await flushPromises()

    expect(mocks.getRegisterById).toHaveBeenCalledWith(7)
    expect(mocks.alertError).toHaveBeenCalledWith('Изменения запрещены')
  })

  it('does not update all parcels when confirmation is declined', async () => {
    mocks.confirm.mockResolvedValue(false)
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('4')
    await wrapper.find('[data-testid="parcel-status-bulk-update-all"]').trigger('click')
    await flushPromises()

    expect(mocks.confirm).toHaveBeenCalledOnce()
    expect(mocks.setParcelStatuses).not.toHaveBeenCalled()
    expect(mocks.alertSuccess).not.toHaveBeenCalled()
    expect(wrapper.emitted('updated')).toBeUndefined()
  })

  it('uses the exclusion warning for found parcels and cancels the mutation', async () => {
    mocks.resolveStatusSelection.mockResolvedValue({
      parcelIds: [11], missingNumbers: [], blockedItems: []
    })
    mocks.confirm.mockResolvedValue(false)
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('5')
    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1')
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="parcel-status-bulk-update-found"]').trigger('click')
    await flushPromises()

    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Подтверждение',
      confirmationText: 'Изменить',
      cancellationText: 'Не изменять',
      dialogProps: { width: 440, maxWidth: 'calc(100vw - 32px)' },
      cardProps: { class: 'app-dialog-frame' },
      confirmationButtonProps: { color: 'orange-darken-3', variant: 'flat' },
      cancellationButtonProps: { variant: 'text' },
      content: expect.stringContaining('статус посылки на «Excluded»')
    }))
    expect(mocks.updateStatusSelection).not.toHaveBeenCalled()
  })

  it('replaces the generic all-parcels confirmation with the exclusion warning', async () => {
    const wrapper = mountDialog({ register: { id: 7, parcelsTotal: 12 } })

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('5')
    await wrapper.find('[data-testid="parcel-status-bulk-update-all"]').trigger('click')
    await flushPromises()

    expect(mocks.confirm).toHaveBeenCalledOnce()
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Подтверждение',
      confirmationText: 'Изменить',
      cancellationText: 'Не изменять',
      dialogProps: { width: 440, maxWidth: 'calc(100vw - 32px)' },
      cardProps: { class: 'app-dialog-frame' },
      confirmationButtonProps: { color: 'orange-darken-3', variant: 'flat' },
      cancellationButtonProps: { variant: 'text' },
      content: expect.stringContaining('статус посылок на «Excluded»')
    }))
    expect(mocks.setParcelStatuses).toHaveBeenCalledWith(7, 5)
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
    expect(mocks.confirm).not.toHaveBeenCalled()
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
    expect(wrapper.find('[data-testid="parcel-status-bulk-summary"]').text()).toContain(
      'Введите номера'
    )
  })
})
