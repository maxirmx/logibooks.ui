// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import FeacnOrderScopesDialog from '@/dialogs/FeacnOrderScopes_Dialog.vue'

const mocks = vi.hoisted(() => ({
  updateScopes: vi.fn(),
  ensureLoaded: vi.fn(),
  alertError: vi.fn(),
  countries: [{ isoNumeric: 643, isoAlpha2: 'RU', nameRuShort: 'Россия' }]
}))

vi.mock('@/stores/feacn.orders.store.js', () => ({
  useFeacnOrdersStore: () => ({ updateScopes: mocks.updateScopes })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({ countries: mocks.countries, ensureLoaded: mocks.ensureLoaded })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ error: mocks.alertError })
}))

const order = {
  id: 7,
  title: 'Order 7',
  scopes: [{ countryIsoNumeric: 643, customsProcedureCode: 10, explanation: ' Original ' }]
}

function createWrapper(props = {}) {
  return mount(FeacnOrderScopesDialog, {
    props: { modelValue: true, order, ...props },
    global: {
      stubs: {
        'v-dialog': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div v-if="modelValue" class="dialog"><slot /></div>'
        },
        'v-btn': {
          props: ['disabled', 'loading'],
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
        },
        AppDialogFrame: {
          props: ['title'],
          template: '<section><h1>{{ title }}</h1><slot /><slot name="actions" /></section>'
        },
        PageAlertRegion: true,
        RestrictionScopeEditor: {
          props: ['modelValue', 'countries', 'disabled'],
          emits: ['update:modelValue'],
          template: '<div class="scope-editor-stub"></div>'
        }
      }
    }
  })
}

describe('FeacnOrderScopes_Dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureLoaded.mockResolvedValue()
    mocks.updateScopes.mockResolvedValue()
  })

  it('copies the order scopes and loads countries when opened', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(mocks.ensureLoaded).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Order 7')
    expect(wrapper.vm.scopes).toEqual(order.scopes)
    expect(wrapper.vm.scopes).not.toBe(order.scopes)
  })

  it('normalizes and submits a valid scope collection, then closes once', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.scopes = [
      { countryIsoNumeric: '860', customsProcedureCode: '40', explanation: '  Reason  ' },
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: '   ' }
    ]

    await wrapper.vm.save()

    expect(mocks.updateScopes).toHaveBeenCalledWith(7, [
      { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'Reason' },
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: null }
    ])
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    expect(mocks.alertError).not.toHaveBeenCalled()
  })

  it('blocks duplicate scope pairs before calling the store', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.scopes = [
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'A' },
      { countryIsoNumeric: '643', customsProcedureCode: '10', explanation: 'B' }
    ]

    await wrapper.vm.save()

    expect(wrapper.vm.validationError).toContain('не могут повторяться')
    expect(mocks.updateScopes).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('reports a rejected save once, preserves values and stays open', async () => {
    const error = new Error('save failed')
    mocks.updateScopes.mockRejectedValue(error)
    const wrapper = createWrapper()
    await flushPromises()
    const submitted = [{ countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'Keep me' }]
    wrapper.vm.scopes = submitted.map((scope) => ({ ...scope }))

    await wrapper.vm.save()

    expect(mocks.alertError).toHaveBeenCalledOnce()
    expect(mocks.alertError).toHaveBeenCalledWith(error)
    expect(wrapper.vm.scopes).toEqual(submitted)
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
