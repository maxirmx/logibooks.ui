/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import FeacnOrderSettings from '@/dialogs/FeacnOrder_Settings.vue'

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  updateScopes: vi.fn(),
  ensureCountriesLoaded: vi.fn(),
  alertError: vi.fn(),
  routerPush: vi.fn(),
  countries: [
    { isoNumeric: 643, nameRuShort: 'Россия' },
    { isoNumeric: 860, nameRuShort: 'Узбекистан' }
  ]
}))

vi.mock('@/stores/feacn.orders.store.js', () => ({
  useFeacnOrdersStore: () => ({
    getById: mocks.getById,
    updateScopes: mocks.updateScopes
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    countries: mocks.countries,
    ensureLoaded: mocks.ensureCountriesLoaded
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ error: mocks.alertError })
}))

vi.mock('@/router', () => ({
  default: { push: mocks.routerPush }
}))

const order = {
  id: 7,
  title: 'Order 7',
  scopes: [
    {
      countryIsoNumeric: 643,
      customsProcedureCode: 10,
      explanation: 'Legacy arbitrary reason'
    }
  ]
}

function createWrapper() {
  return mount(FeacnOrderSettings, {
    props: { orderId: 7 },
    global: {
      stubs: {
        PageAlertRegion: true,
        ActionButton: {
          name: 'ActionButton',
          props: ['item', 'icon', 'iconSize', 'tooltipText', 'disabled'],
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\', item)"></button>'
        },
        RestrictionScopeEditor: {
          name: 'RestrictionScopeEditor',
          props: [
            'modelValue',
            'countries',
            'disabled',
            'errors',
            'explanationsEnabled'
          ],
          emits: ['update:modelValue'],
          template: '<div data-testid="scope-editor"></div>'
        }
      }
    }
  })
}

describe('FeacnOrder_Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getById.mockResolvedValue(order)
    mocks.ensureCountriesLoaded.mockResolvedValue()
    mocks.updateScopes.mockResolvedValue()
    mocks.routerPush.mockResolvedValue()
  })

  it('loads the order and exposes a key-only scope editor', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(mocks.getById).toHaveBeenCalledWith(7)
    expect(mocks.ensureCountriesLoaded).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Order 7')
    expect(wrapper.get('.feacn-order-title').text()).toBe('Order 7')
    expect(wrapper.vm.scopes).toEqual([
      { countryIsoNumeric: 643, customsProcedureCode: 10 }
    ])
    expect(wrapper.getComponent({ name: 'RestrictionScopeEditor' }).props()).toMatchObject({
      explanationsEnabled: false,
      countries: mocks.countries
    })
  })

  it('saves only country and procedure and returns to the orders list', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.scopes = [
      { countryIsoNumeric: '860', customsProcedureCode: '40', explanation: 'Do not submit' }
    ]

    await wrapper.vm.save()

    expect(mocks.updateScopes).toHaveBeenCalledWith(7, [
      { countryIsoNumeric: 860, customsProcedureCode: 40 }
    ])
    expect(mocks.routerPush).toHaveBeenCalledWith('/feacn/orders')
  })

  it('blocks invalid and duplicate scope pairs', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.scopes = [
      { countryIsoNumeric: 643, customsProcedureCode: 10 },
      { countryIsoNumeric: '643', customsProcedureCode: '10' }
    ]

    await wrapper.vm.save()

    expect(wrapper.vm.validationError).toBe(true)
    expect(mocks.updateScopes).not.toHaveBeenCalled()
    expect(mocks.routerPush).not.toHaveBeenCalled()
  })

  it('passes field validation errors to the editor and accepts editor updates', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.scopes = [{ countryIsoNumeric: null, customsProcedureCode: 99 }]
    await flushPromises()

    const editor = wrapper.getComponent({ name: 'RestrictionScopeEditor' })
    expect(editor.props('errors')).toEqual({
      'scopes[0].countryIsoNumeric': 'Выберите страну',
      'scopes[0].customsProcedureCode': 'Выберите процедуру'
    })

    editor.vm.$emit('update:modelValue', [
      { countryIsoNumeric: 860, customsProcedureCode: 40 }
    ])
    await flushPromises()

    expect(wrapper.vm.scopes).toEqual([
      { countryIsoNumeric: 860, customsProcedureCode: 40 }
    ])
  })

  it('reports a rejected save once, preserves values and stays on the page', async () => {
    const error = new Error('save failed')
    mocks.updateScopes.mockRejectedValue(error)
    const wrapper = createWrapper()
    await flushPromises()
    const submitted = [{ countryIsoNumeric: 860, customsProcedureCode: 40 }]
    wrapper.vm.scopes = submitted.map((scope) => ({ ...scope }))

    await wrapper.vm.save()

    expect(mocks.alertError).toHaveBeenCalledOnce()
    expect(mocks.alertError).toHaveBeenCalledWith(error, {
      fallback: 'Не удалось сохранить правила применения нормативного документа'
    })
    expect(wrapper.vm.scopes).toEqual(submitted)
    expect(mocks.routerPush).not.toHaveBeenCalled()
  })

  it('offers a retry after a rejected load', async () => {
    const error = new Error('load failed')
    mocks.getById.mockRejectedValueOnce(error)
    const wrapper = createWrapper()
    await flushPromises()

    expect(mocks.alertError).toHaveBeenCalledOnce()
    const options = mocks.alertError.mock.calls[0][1]
    expect(options.fallback).toBe('Не удалось загрузить правила применения нормативного документа')

    await options.action.handler()
    await flushPromises()

    expect(mocks.getById).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Order 7')
  })

  it('returns to the orders list on cancel', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.cancel()

    expect(mocks.routerPush).toHaveBeenCalledWith('/feacn/orders')
  })
})
