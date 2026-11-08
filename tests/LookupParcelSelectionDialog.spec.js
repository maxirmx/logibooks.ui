/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import LookupParcelSelectionDialog from '@/dialogs/LookupParcelSelectionDialog.vue'
import { WBR_COMPANY_ID } from '@/helpers/company.constants.js'
import { useAlertStore } from '@/stores/alert.store.js'

const resolveStatusSelection = vi.hoisted(() => vi.fn())
vi.mock('@/stores/parcels.store.js', () => ({
  useParcelsStore: () => ({ resolveStatusSelection })
}))

enableAutoUnmount(afterEach)
afterEach(() => resolveStatusSelection.mockReset())

function mountDialog(registerType = WBR_COMPANY_ID, pinia = createPinia()) {
  return mount(LookupParcelSelectionDialog, {
    props: { modelValue: true, register: { id: 7, registerType } },
    global: {
      plugins: [pinia],
      stubs: {
        'v-dialog': { template: '<div><slot /></div>' },
        'v-card': { template: '<div><slot /></div>' },
        'v-card-text': { template: '<div><slot /></div>' },
        ActionButton: { template: '<button type="button"></button>' },
        'v-switch': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />'
        }
      }
    }
  })
}

function action(wrapper, name) {
  return wrapper.get('[data-testid="lookup-parcels-' + name + '"]')
}

const match = (identifier, ...ids) => ({
  identifier,
  parcels: ids.map(parcelId => ({ parcelId, parcelNumber: 'P-' + parcelId, boxNumber: 'BOX' }))
})

describe('LookupParcelSelectionDialog', () => {
  it.each([
    'close'
  ])('dismisses only its own error (%s)', async (scenario) => {
    const pinia = createPinia()
    const alertStore = useAlertStore(pinia)
    const wrapper = mountDialog(WBR_COMPANY_ID, pinia)
    resolveStatusSelection.mockRejectedValueOnce(Object.assign(new Error('Нет доступа к реестру'), { status: 403 }))
    await wrapper.get('[data-testid="lookup-parcels-input"]').setValue('P-7')
    await action(wrapper, 'find').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Нет доступа к реестру')

    if (scenario === 'replacement') alertStore.error('Не удалось сохранить задание')
    if (scenario === 'unmount') wrapper.unmount()
    else {
      await action(wrapper, 'cancel').trigger('click')
      expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
      await wrapper.setProps({ modelValue: false })
    }
    if (scenario === 'replacement') expect(alertStore.alert.message).toBe('Не удалось сохранить задание')
    else expect(alertStore.alert).toBeNull()
  })

  it('ignores a lookup failure after the picker closes', async () => {
    const pinia = createPinia()
    const alertStore = useAlertStore(pinia)
    const wrapper = mountDialog(WBR_COMPANY_ID, pinia)
    let rejectLookup
    resolveStatusSelection.mockImplementationOnce(() => new Promise((_, reject) => { rejectLookup = reject }))
    await wrapper.get('[data-testid="lookup-parcels-input"]').setValue('P-7')
    await action(wrapper, 'find').trigger('click')

    await wrapper.setProps({ modelValue: false })
    rejectLookup(Object.assign(new Error('Нет доступа к реестру'), { status: 403 }))
    await flushPromises()
    expect(alertStore.alert).toBeNull()
  })

  it('summarizes pasted or scanned codes and confirms every distinct matching parcel', async () => {
    const wrapper = mountDialog()
    resolveStatusSelection.mockResolvedValue({
      purpose: 'lookup', lookupBy: 'sticker', missingNumbers: ['absent'],
      matches: [match('0007', 7), match('ambiguous', 7, 8), match('alias', 7)]
    })
    await wrapper.get('[data-testid="lookup-parcels-lookup"]').setValue(true)
    await wrapper.get('[data-testid="lookup-parcels-input"]').setValue('0007\nambiguous\talias, 0007\r\nabsent')
    await action(wrapper, 'find').trigger('click')
    await flushPromises()

    expect(resolveStatusSelection).toHaveBeenCalledWith(7, ['0007', 'ambiguous', 'alias', 'absent'], 'sticker', 'lookup')
    expect(action(wrapper, 'report').element.value).toBe('Не найдены:\nabsent')
    expect(action(wrapper, 'summary').text()).toBe(
      'Обработано: 4. Найдено: 2. Не найдено: 1. Недоступно: 0.'
    )
    expect(wrapper.find('table, details, fieldset').exists()).toBe(false)
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(1)
    const confirm = action(wrapper, 'confirm')
    expect(confirm.attributes('aria-label')).toBe('Использовать только найденные')
    await confirm.trigger('click')
    expect(wrapper.emitted('selected')).toEqual([[[
      expect.objectContaining({ identifier: '0007', parcelId: 7, parcelNumber: 'P-7', boxNumber: 'BOX' }),
      expect.objectContaining({ identifier: 'ambiguous', parcelId: 8, parcelNumber: 'P-8', boxNumber: 'BOX' })
    ], 7]])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('rejects a legacy bulk status response before enabling confirmation', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const wrapper = mountDialog()
      resolveStatusSelection.mockResolvedValueOnce({ parcelIds: [7] })
      await wrapper.get('[data-testid="lookup-parcels-input"]').setValue('test')
      await action(wrapper, 'find').trigger('click')
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toContain('Сервер не поддерживает выбор посылок для поиска')
      expect(action(wrapper, 'confirm').element.disabled).toBe(true)
      expect(wrapper.emitted('selected')).toBeUndefined()
    } finally {
      log.mockRestore()
    }
  })

  it('ignores a stale preview and displays one failure before retry', async () => {
    const wrapper = mountDialog()
    const field = wrapper.get('[data-testid="lookup-parcels-input"]')
    let finishFirst
    resolveStatusSelection.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
    await field.setValue('old')
    await action(wrapper, 'find').trigger('click')
    await field.setValue('new')
    finishFirst({ purpose: 'lookup', lookupBy: 'number', matches: [match('old', 7)] })
    await flushPromises()
    expect(action(wrapper, 'summary').text()).toBe('Введите номера отправлений и нажмите «Найти».')
    expect(action(wrapper, 'confirm').element.disabled).toBe(true)

    resolveStatusSelection.mockRejectedValueOnce(Object.assign(new Error('Нет доступа к реестру'), { status: 403 }))
    await action(wrapper, 'find').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Нет доступа к реестру')

    resolveStatusSelection.mockResolvedValueOnce({
      purpose: 'lookup', lookupBy: 'number',
      matches: [{ identifier: 'new', parcels: [{ parcelId: 8, parcelNumber: 'P-8', boxNumber: null }] }]
    })
    await action(wrapper, 'find').trigger('click')
    await flushPromises()
    await action(wrapper, 'confirm').trigger('click')
    expect(wrapper.emitted('selected')).toEqual([[[
      expect.objectContaining({ identifier: 'new', parcelId: 8, parcelNumber: 'P-8', boxNumber: null })
    ], 7]])
  })
})
