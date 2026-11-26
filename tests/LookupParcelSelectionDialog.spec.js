/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import LookupParcelSelectionDialog from '@/dialogs/LookupParcelSelectionDialog.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'
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

const row = (parcelId, parcelNumber = 'P-' + parcelId, boxNumber = 'BOX') => ({ parcelId, parcelNumber, boxNumber })
const match = (identifier, ...parcels) => ({ identifier, parcels })

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
      matches: [match('0007', row(7)), match('ambiguous', row(7), row(8)), match('alias', row(7))]
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

  it.each([
    ['number', '0100194380-0056-3'],
    ['sticker', 'STICKER']
  ])('counts three product rows under one shipment when searching by %s', async (lookupBy, identifier) => {
    const wrapper = mountDialog(OZON_COMPANY_ID)
    const shipment = '0100194380-0056-3'
    const rows = [row(7, shipment), row(8, shipment), row(9, shipment)]
    resolveStatusSelection.mockResolvedValueOnce({
      purpose: 'lookup', lookupBy, matches: [match(identifier, ...rows)]
    })

    await action(wrapper, 'lookup').setValue(lookupBy === 'sticker')
    await action(wrapper, 'input').setValue(identifier)
    await action(wrapper, 'find').trigger('click')
    await flushPromises()

    expect(resolveStatusSelection).toHaveBeenCalledWith(7, [identifier], lookupBy, 'lookup')
    expect(action(wrapper, 'summary').text()).toBe(
      'Обработано: 1. Найдено посылок 1, товаров 3. Не найдено: 0. Недоступно: 0.'
    )
    await action(wrapper, 'confirm').trigger('click')
    expect(wrapper.emitted('selected')).toEqual([[rows.map(parcel => ({ ...parcel, identifier })), 7]])
  })

  it('counts distinct shipments for a shared sticker and deduplicates rows matched by aliases', async () => {
    const wrapper = mountDialog()
    const rows = [row(7, 'P-7'), row(8, 'P-7'), row(9, 'P-9')]
    resolveStatusSelection.mockResolvedValueOnce({
      purpose: 'lookup', lookupBy: 'sticker',
      matches: [match('SHARED', ...rows), match('ALIAS', rows[0], rows[1])]
    })

    await action(wrapper, 'lookup').setValue(true)
    await action(wrapper, 'input').setValue('SHARED\nALIAS\nSHARED')
    await action(wrapper, 'find').trigger('click')
    await flushPromises()

    expect(action(wrapper, 'summary').text()).toBe(
      'Обработано: 2. Найдено посылок 2, товаров 3. Не найдено: 0. Недоступно: 0.'
    )
    await action(wrapper, 'confirm').trigger('click')
    expect(wrapper.emitted('selected')).toEqual([[rows.map(parcel => ({ ...parcel, identifier: 'SHARED' })), 7]])

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    expect(action(wrapper, 'summary').text()).toBe('Введите номера отправлений и нажмите «Найти».')
    expect(action(wrapper, 'confirm').element.disabled).toBe(true)
  })

  it('counts rows without a shipment number separately and clears the summary on changing lookup mode', async () => {
    const wrapper = mountDialog()
    const rows = [row(7, 'P-7'), row(8, 'P-7'), row(9, ''), row(10, null), row(11, '\u0085'), row(12, '\u0085')]
    resolveStatusSelection.mockResolvedValueOnce({
      purpose: 'lookup', lookupBy: 'sticker',
      matches: [match('SHARED', ...rows)]
    })

    await action(wrapper, 'lookup').setValue(true)
    await action(wrapper, 'input').setValue('SHARED')
    await action(wrapper, 'find').trigger('click')
    await flushPromises()

    expect(action(wrapper, 'summary').text()).toBe(
      'Обработано: 1. Найдено посылок 5, товаров 6. Не найдено: 0. Недоступно: 0.'
    )
    await action(wrapper, 'lookup').setValue(false)
    expect(action(wrapper, 'summary').text()).toBe('Введите номера отправлений и нажмите «Найти».')
    expect(action(wrapper, 'confirm').element.disabled).toBe(true)
  })

  it('groups rows by a stored shipment number containing only a byte order mark', async () => {
    const wrapper = mountDialog()
    resolveStatusSelection.mockResolvedValueOnce({
      purpose: 'lookup', lookupBy: 'sticker', matches: [match('STICKER', row(7, '\uFEFF'), row(8, '\uFEFF'))]
    })

    await action(wrapper, 'lookup').setValue(true)
    await action(wrapper, 'input').setValue('STICKER')
    await action(wrapper, 'find').trigger('click')
    await flushPromises()

    expect(action(wrapper, 'summary').text()).toBe(
      'Обработано: 1. Найдено посылок 1, товаров 2. Не найдено: 0. Недоступно: 0.'
    )
  })

  it('keeps the compact summary when no rows match', async () => {
    const wrapper = mountDialog()
    resolveStatusSelection.mockResolvedValueOnce({
      purpose: 'lookup', lookupBy: 'number', matches: [], missingNumbers: ['missing']
    })

    await action(wrapper, 'input').setValue('missing')
    await action(wrapper, 'find').trigger('click')
    await flushPromises()

    expect(action(wrapper, 'summary').text()).toBe(
      'Обработано: 1. Найдено: 0. Не найдено: 1. Недоступно: 0.'
    )
    expect(action(wrapper, 'confirm').element.disabled).toBe(true)
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
    finishFirst({ purpose: 'lookup', lookupBy: 'number', matches: [match('old', row(6, 'old'), row(7, 'old'))] })
    await flushPromises()
    expect(action(wrapper, 'summary').text()).toBe('Введите номера отправлений и нажмите «Найти».')
    expect(action(wrapper, 'confirm').element.disabled).toBe(true)

    resolveStatusSelection.mockRejectedValueOnce(Object.assign(new Error('Нет доступа к реестру'), { status: 403 }))
    await action(wrapper, 'find').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Нет доступа к реестру')
    expect(field.element.value).toBe('new')
    expect(action(wrapper, 'confirm').element.disabled).toBe(true)

    const rows = [row(8, 'new', null), row(9, 'new', null)]
    resolveStatusSelection.mockResolvedValueOnce({
      purpose: 'lookup', lookupBy: 'number', matches: [match('new', ...rows)]
    })
    await action(wrapper, 'find').trigger('click')
    await flushPromises()
    expect(resolveStatusSelection).toHaveBeenNthCalledWith(3, 7, ['new'], 'number', 'lookup')
    expect(action(wrapper, 'summary').text()).toBe(
      'Обработано: 1. Найдено посылок 1, товаров 2. Не найдено: 0. Недоступно: 0.'
    )
    await action(wrapper, 'confirm').trigger('click')
    expect(wrapper.emitted('selected')).toEqual([[rows.map(parcel => ({ ...parcel, identifier: 'new' })), 7]])
  })
})
