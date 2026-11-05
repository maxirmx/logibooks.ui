/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ParcelStatusBulkChangeDialog from '@/l2/ParcelStatusBulkChangeDialog.vue'
import { GTC_COMPANY_ID, OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'

enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
  resolveStatusSelection: vi.fn(),
  updateStatusSelection: vi.fn(),
  setParcelStatuses: vi.fn(),
  confirm: vi.fn(),
  refreshReadOnlyRegister: vi.fn(),
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
    refreshReadOnlyRegister: mocks.refreshReadOnlyRegister,
    setParcelStatuses: mocks.setParcelStatuses
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
      plugins: [createPinia()],
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
        'v-switch': {
          props: ['modelValue', 'disabled'],
          emits: ['update:modelValue'],
          inheritAttrs: false,
          template: `<input v-bind="$attrs" type="checkbox" :checked="modelValue" :disabled="disabled"
            @change="$emit('update:modelValue', $event.target.checked)" />`
        },
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

function control(wrapper, name) {
  return wrapper.get(`[data-testid="parcel-status-bulk-${name}"]`)
}

function alert(wrapper) {
  return wrapper.get('[data-testid="page-alert-region"]')
}

describe('ParcelStatusBulkChangeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.resolveStatusSelection.mockResolvedValue({
      parcelIds: [],
      missingNumbers: [],
      blockedItems: []
    })
    mocks.updateStatusSelection.mockResolvedValue({ updatedCount: 0, skippedCount: 0 })
    mocks.setParcelStatuses.mockResolvedValue()
    mocks.refreshReadOnlyRegister.mockResolvedValue()
    mocks.confirm.mockResolvedValue(true)
    mocks.registerItems = []
    mocks.registerItem = null
  })

  afterEach(() => vi.restoreAllMocks())

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
    expect(alert(wrapper).text()).toContain('Статус изменен для 2 посылок. Пропущено: 1')
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

    expect(mocks.refreshReadOnlyRegister).toHaveBeenCalledWith(7)
    expect(alert(wrapper).get('[role="alert"]').text()).toContain('Изменения запрещены')
  })

  it('does not update all parcels when confirmation is declined', async () => {
    mocks.confirm.mockResolvedValue(false)
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('4')
    await wrapper.find('[data-testid="parcel-status-bulk-update-all"]').trigger('click')
    await flushPromises()

    expect(mocks.confirm).toHaveBeenCalledOnce()
    expect(mocks.setParcelStatuses).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
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

  it('shows a localized update-all error and lets the user retry', async () => {
    mocks.setParcelStatuses.mockRejectedValue({ reason: 'update all failed' })
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-status"]').setValue('4')
    await wrapper.find('[data-testid="parcel-status-bulk-update-all"]').trigger('click')
    await flushPromises()

    expect(alert(wrapper).text()).toContain('Ошибка при изменении статусов всех посылок')
    expect(alert(wrapper).text()).not.toContain('update all failed')
    expect(control(wrapper, 'status').element.value).toBe('4')
    expect(wrapper.emitted('update:show')).toBeUndefined()

    mocks.setParcelStatuses.mockResolvedValueOnce()
    await control(wrapper, 'update-all').trigger('click')
    await flushPromises()
    expect(mocks.setParcelStatuses.mock.calls).toEqual([[7, 4], [7, 4]])
    expect(alert(wrapper).text()).toContain('Статус успешно применен ко всем посылкам в реестре')
    expect(wrapper.emitted('updated')).toHaveLength(1)
  })

  it('reports backend errors without clearing user input', async () => {
    mocks.resolveStatusSelection.mockRejectedValue(new Error('resolve failed'))
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1')
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()

    expect(alert(wrapper).text()).toContain('Ошибка при поиске посылок')
    expect(alert(wrapper).text()).not.toContain('resolve failed')
    expect(wrapper.get('hr.hr').element.nextElementSibling).toBe(alert(wrapper).element)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(console.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ message: 'resolve failed' }))
    expect(wrapper.find('[data-testid="parcel-status-bulk-input"]').element.value).toBe('P-1')
  })

  it('uses fallback error text when backend does not provide details', async () => {
    mocks.resolveStatusSelection.mockRejectedValue({})
    const wrapper = mountDialog()

    await wrapper.find('[data-testid="parcel-status-bulk-input"]').setValue('P-1')
    await wrapper.find('[data-testid="parcel-status-bulk-find"]').trigger('click')
    await flushPromises()

    expect(alert(wrapper).text()).toContain('Ошибка при поиске посылок')
  })

  it('preserves input and status on mode change and applies only a fresh sticker result', async () => {
    const wrapper = mountDialog({ register: { id: 7, registerType: WBR_COMPANY_ID } })
    const mode = control(wrapper, 'lookup')
    const apply = control(wrapper, 'update-found')
    const input = control(wrapper, 'input')
    const find = control(wrapper, 'find')
    expect(mode.element.checked).toBe(false)
    mocks.resolveStatusSelection.mockResolvedValueOnce({ parcelIds: [81], missingNumbers: ['A'], blockedItems: [] })

    await control(wrapper, 'status').setValue('3')
    await input.setValue(' 0001, A\t0001 ')
    await find.trigger('click')
    await flushPromises()
    expect(mocks.resolveStatusSelection).toHaveBeenLastCalledWith(7, ['0001', 'A'], 'number')
    expect(apply.element.disabled).toBe(false)

    await mode.setValue(true)
    expect(input.element.value).toBe(' 0001, A\t0001 ')
    expect(input.attributes('placeholder')).toContain('коды со стикеров')
    expect(control(wrapper, 'status').element.value).toBe('3')
    expect(wrapper.get('label[for="parcel-status-bulk-input"]').text()).toBe('Стикеры')
    expect(apply.element.disabled).toBe(true)
    expect(control(wrapper, 'report').element.value).toBe('')
    expect(control(wrapper, 'summary').text()).toContain('Введите коды')

    mocks.resolveStatusSelection.mockResolvedValueOnce({
      lookupBy: 'sticker', parcelIds: [82, 83], missingNumbers: ['A'],
      blockedItems: [{ number: '0001', parcelId: 84 }, { number: '0001', parcelId: 85 }]
    })
    await find.trigger('click')
    await flushPromises()
    expect(mocks.resolveStatusSelection).toHaveBeenLastCalledWith(7, ['0001', 'A'], 'sticker')
    expect(control(wrapper, 'report').element.value).toContain('0001 — посылка #84\n0001 — посылка #85')
    expect(control(wrapper, 'summary').text()).toBe(
      'Обработано кодов: 2. Найдено посылок: 2. Не найдено кодов: 1. Недоступных совпадений: 2.'
    )
    await apply.trigger('click')
    await flushPromises()
    expect(mocks.updateStatusSelection).toHaveBeenCalledWith(7, 3, [82, 83])

    await input.setValue('NEW')
    expect(apply.element.disabled).toBe(true)
    expect(control(wrapper, 'report').element.value).toBe('')
  })

  it('rejects an old Core response and clears a prior selection before retrying', async () => {
    const wrapper = mountDialog({ register: { id: 7, registerType: OZON_COMPANY_ID } })
    await control(wrapper, 'lookup').setValue(true)
    expect(wrapper.get('label[for="parcel-status-bulk-input"]').text()).toBe('Штрихкоды')
    await control(wrapper, 'status').setValue('3')
    await control(wrapper, 'input').setValue('ABC')

    mocks.resolveStatusSelection.mockResolvedValueOnce({ lookupBy: 'sticker', parcelIds: [11] })
    await control(wrapper, 'find').trigger('click')
    await flushPromises()
    expect(control(wrapper, 'update-found').element.disabled).toBe(false)

    mocks.resolveStatusSelection.mockResolvedValueOnce({ parcelIds: [999] })
    await control(wrapper, 'find').trigger('click')
    await flushPromises()
    expect(alert(wrapper).text()).toContain('Сервер не поддерживает поиск по стикерам')
    expect(control(wrapper, 'update-found').element.disabled).toBe(true)
    await wrapper.vm.updateFound()
    expect(mocks.updateStatusSelection).not.toHaveBeenCalled()

    await alert(wrapper).get('button').trigger('click')
    mocks.resolveStatusSelection.mockResolvedValueOnce({ lookupBy: 'sticker', parcelIds: [], missingNumbers: ['ABC'] })
    await control(wrapper, 'find').trigger('click')
    await flushPromises()
    expect(control(wrapper, 'report').element.value).toContain('ABC')
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    expect(control(wrapper, 'input').element.value).toBe('ABC')
  })

  it('shows the disabled GTC switch and resets the mode on a type or register change', async () => {
    const wrapper = mountDialog({ register: { id: 7, registerType: WBR_COMPANY_ID } })
    await control(wrapper, 'lookup').setValue(true)
    await control(wrapper, 'status').setValue('3')
    await control(wrapper, 'input').setValue('ABC')
    await wrapper.setProps({ register: { id: 7, registerType: GTC_COMPANY_ID } })
    expect(control(wrapper, 'lookup').element.checked).toBe(false)
    expect(control(wrapper, 'lookup').element.disabled).toBe(true)
    expect(wrapper.get('#parcel-status-bulk-gtc-hint').text()).toContain('только по номеру посылки')
    expect(control(wrapper, 'input').element.value).toBe('ABC')

    await wrapper.setProps({ registerId: 8, register: { id: 8, registerType: WBR_COMPANY_ID } })
    expect(control(wrapper, 'lookup').element.disabled).toBe(false)
    expect(control(wrapper, 'status').element.value).toBe('')
    expect(control(wrapper, 'input').element.value).toBe('')
  })

  it.each(['update-all', 'update-found'])('ignores an old %s confirmation after switching register', async (action) => {
    const confirmation = Promise.withResolvers()
    mocks.confirm.mockReturnValueOnce(confirmation.promise)
    const wrapper = mountDialog()
    mocks.resolveStatusSelection.mockResolvedValueOnce({ parcelIds: [11] })
    await control(wrapper, 'input').setValue('ABC')
    await control(wrapper, 'find').trigger('click')
    await flushPromises()
    await control(wrapper, 'status').setValue('5')
    await control(wrapper, action).trigger('click')
    expect(mocks.confirm).toHaveBeenCalledOnce()

    await wrapper.setProps({ registerId: 8 })
    confirmation.resolve(true)
    await flushPromises()
    expect(mocks.setParcelStatuses).not.toHaveBeenCalled()
    expect(mocks.updateStatusSelection).not.toHaveBeenCalled()
    expect(wrapper.emitted('updated')).toBeUndefined()
  })

  it('keeps the current lookup busy when a prior mutation completes after reopening', async () => {
    const mutation = Promise.withResolvers()
    const search = Promise.withResolvers()
    mocks.setParcelStatuses.mockReturnValueOnce(mutation.promise)
    const wrapper = mountDialog({ register: { id: 7, registerType: WBR_COMPANY_ID } })
    await control(wrapper, 'status').setValue('4')
    await control(wrapper, 'update-all').trigger('click')
    await flushPromises()
    expect(mocks.setParcelStatuses).toHaveBeenCalledWith(7, 4)

    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true })
    mocks.resolveStatusSelection.mockReturnValueOnce(search.promise)
    await control(wrapper, 'input').setValue('NEW')
    await control(wrapper, 'find').trigger('click')
    expect(control(wrapper, 'lookup').element.disabled).toBe(true)

    mutation.resolve()
    await flushPromises()
    expect(wrapper.emitted('updated')).toBeUndefined()
    expect(wrapper.find('[data-testid="page-alert-region"]').exists()).toBe(false)
    expect(control(wrapper, 'lookup').element.disabled).toBe(true)
    search.resolve({ parcelIds: [12] })
    await flushPromises()
    expect(control(wrapper, 'lookup').element.disabled).toBe(false)
  })

  it('discards a late resolve result after the register changes', async () => {
    const search = Promise.withResolvers()
    mocks.resolveStatusSelection.mockReturnValueOnce(search.promise)
    const wrapper = mountDialog()
    await control(wrapper, 'input').setValue('OLD')
    await control(wrapper, 'find').trigger('click')
    await wrapper.setProps({ registerId: 8 })
    await control(wrapper, 'status').setValue('3')

    search.resolve({ parcelIds: [11] })
    await flushPromises()
    expect(control(wrapper, 'summary').text()).toContain('Введите номера')
    expect(control(wrapper, 'update-found').element.disabled).toBe(true)
  })

  it('shows the original conflict once when its register refresh rejects, then retries the same IDs', async () => {
    const conflict = Object.assign(new Error('Изменения запрещены'), { status: 409 })
    const refreshError = new Error('refresh failed')
    mocks.updateStatusSelection.mockRejectedValueOnce(conflict).mockResolvedValueOnce()
    mocks.refreshReadOnlyRegister.mockRejectedValueOnce(refreshError)
    mocks.resolveStatusSelection.mockResolvedValueOnce({ parcelIds: [11] })
    const wrapper = mountDialog()
    await control(wrapper, 'status').setValue('3')
    await control(wrapper, 'input').setValue('ABC')
    await control(wrapper, 'find').trigger('click')
    await flushPromises()
    await control(wrapper, 'update-found').trigger('click')
    await flushPromises()
    expect(alert(wrapper).text()).toContain('Изменения запрещены')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.any(String), refreshError)
    expect(wrapper.emitted('update:show')).toBeUndefined()
    expect(control(wrapper, 'input').element.value).toBe('ABC')

    await control(wrapper, 'update-found').trigger('click')
    await flushPromises()
    expect(mocks.updateStatusSelection.mock.calls).toEqual([[7, 3, [11]], [7, 3, [11]]])
    expect(alert(wrapper).text()).toContain('Статус изменен для 1 посылок')
  })

  it.each([
    { disabled: true },
    { register: { id: 7, registerType: WBR_COMPANY_ID, readOnly: true } }
  ])('allows closing a disabled form and blocks a now-disabled confirmation (%j)', async (props) => {
    const confirmation = Promise.withResolvers()
    mocks.confirm.mockReturnValueOnce(confirmation.promise)
    const wrapper = mountDialog({ register: { id: 7, registerType: WBR_COMPANY_ID } })
    await control(wrapper, 'status').setValue('4')
    await control(wrapper, 'update-all').trigger('click')
    expect(control(wrapper, 'cancel').element.disabled).toBe(true)

    await wrapper.setProps(props)
    confirmation.resolve(true)
    await flushPromises()
    expect(mocks.setParcelStatuses).not.toHaveBeenCalled()
    expect(control(wrapper, 'lookup').element.disabled).toBe(true)
    expect(control(wrapper, 'cancel').element.disabled).toBe(false)
    await control(wrapper, 'cancel').trigger('click')
    expect(wrapper.emitted('update:show')).toEqual([[false]])
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
