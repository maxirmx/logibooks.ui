/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import LookupParcelSelectionDialog from '@/dialogs/LookupParcelSelectionDialog.vue'
import { GTC_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'
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
        'v-card-title': { template: '<div><slot /></div>' },
        'v-card-text': { template: '<div><slot /></div>' },
        'v-card-actions': { template: '<div><slot /></div>' },
        'v-btn': { template: '<button type="button"><slot /></button>' },
        'v-switch': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />'
        }
      }
    }
  })
}

function action(wrapper, text) {
  return wrapper.findAll('button').find(button => button.text() === text)
}

const match = (identifier, ...ids) => ({
  identifier,
  parcels: ids.map(parcelId => ({ parcelId, parcelNumber: 'P-' + parcelId, boxNumber: 'BOX' }))
})

describe('LookupParcelSelectionDialog', () => {
  it('disables sticker mode on registers without sticker support', () => {
    const wrapper = mountDialog(GTC_COMPANY_ID)
    expect(wrapper.get('[data-testid="lookup-parcels-lookup"]').element.disabled).toBe(true)
    expect(wrapper.text()).toContain('В реестрах GTC поиск доступен только по номеру посылки')
  })

  it('preserves the active error while opening and closing the picker', async () => {
    const pinia = createPinia()
    const alertStore = useAlertStore(pinia)
    alertStore.error('Не удалось сохранить задание')
    const wrapper = mountDialog(WBR_COMPANY_ID, pinia)
    expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось сохранить задание')
    await wrapper.setProps({ modelValue: false })
    expect(alertStore.alert.message).toBe('Не удалось сохранить задание')
  })

  it('previews pasted or scanned codes and confirms only explicitly chosen IDs', async () => {
    const wrapper = mountDialog()
    resolveStatusSelection.mockResolvedValue({
      purpose: 'lookup', lookupBy: 'sticker', missingNumbers: ['absent'],
      matches: [match('0007', 7), match('ambiguous', 7, 8), match('alias', 7)]
    })
    await wrapper.get('[data-testid="lookup-parcels-lookup"]').setValue(true)
    await wrapper.get('[data-testid="lookup-parcels-input"]').setValue('0007\nambiguous\talias, 0007\r\nabsent')
    await action(wrapper, 'Найти').trigger('click')
    await flushPromises()

    expect(resolveStatusSelection).toHaveBeenCalledWith(7, ['0007', 'ambiguous', 'alias', 'absent'], 'sticker', 'lookup')
    expect(wrapper.get('[data-testid="lookup-parcels-report"]').element.value).toBe('absent')
    const candidates = wrapper.findAll('tbody input')
    expect(candidates.map(input => input.element.checked)).toEqual([true, false, false, true])
    await candidates[2].setValue(true)
    await action(wrapper, 'Использовать только выбранные').trigger('click')
    expect(wrapper.emitted('selected')).toEqual([[[7, 8], 7]])
  })

  it('rejects a legacy bulk status response before enabling confirmation', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const wrapper = mountDialog()
      resolveStatusSelection.mockResolvedValueOnce({ parcelIds: [7] })
      await wrapper.get('[data-testid="lookup-parcels-input"]').setValue('test')
      await action(wrapper, 'Найти').trigger('click')
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toContain('Сервер не поддерживает выбор посылок для поиска')
      expect(action(wrapper, 'Подтвердить выбор').element.disabled).toBe(true)
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
    await action(wrapper, 'Найти').trigger('click')
    await field.setValue('new')
    finishFirst({ purpose: 'lookup', lookupBy: 'number', matches: [match('old', 7)] })
    await flushPromises()
    expect(wrapper.find('tbody').exists()).toBe(false)

    resolveStatusSelection.mockRejectedValueOnce(Object.assign(new Error('Нет доступа к реестру'), { status: 403 }))
    await action(wrapper, 'Найти').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Нет доступа к реестру')

    resolveStatusSelection.mockResolvedValueOnce({ purpose: 'lookup', lookupBy: 'number', matches: [match('new', 8)] })
    await action(wrapper, 'Найти').trigger('click')
    await flushPromises()
    await action(wrapper, 'Подтвердить выбор').trigger('click')
    expect(wrapper.emitted('selected')).toEqual([[[8], 7]])
  })
})
