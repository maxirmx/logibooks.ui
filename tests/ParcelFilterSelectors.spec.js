/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelFilterSelectors from '@/components/ParcelFilterSelectors.vue'

describe('ParcelFilterSelectors', () => {
  const mountComponent = (props = {}) => mount(ParcelFilterSelectors, {
    props: {
      statusOptions: [{ title: 'Все', value: null }],
      checkStatusOptionsSw: [{ title: 'Все', value: null }],
      checkStatusOptionsFc: [{ title: 'Все', value: null }],
      parcelsStatus: null,
      parcelsCheckStatusSw: null,
      parcelsCheckStatusFc: null,
      localTnvedSearch: '',
      localParcelNumberSearch: '',
      localProductNameSearch: '',
      ...props,
    },
    global: {
      stubs: {
        'v-select': {
          name: 'v-select',
          props: ['disabled', 'label'],
          template: '<div class="v-select-stub" :data-label="label" :data-disabled="String(disabled)"></div>',
        },
        'v-text-field': {
          name: 'v-text-field',
          props: ['disabled', 'label'],
          template: '<div class="v-text-field-stub" :data-label="label" :data-disabled="String(disabled)"></div>',
        },
      },
    },
  })

  const assertDisabledState = (wrapper, expectedSelectDisabled, expectedTextFieldDisabled) => {
    const selectNodes = wrapper.findAll('.v-select-stub')
    const textFieldNodes = wrapper.findAll('.v-text-field-stub')

    expect(selectNodes).toHaveLength(3)
    expect(textFieldNodes).toHaveLength(3)

    selectNodes.forEach((node) => {
      expect(node.attributes('data-disabled')).toBe(String(expectedSelectDisabled))
    })

    textFieldNodes.forEach((node) => {
      expect(node.attributes('data-disabled')).toBe(String(expectedTextFieldDisabled))
    })
  }

  it('keeps all controls enabled when no flags are active', () => {
    const wrapper = mountComponent({ runningAction: false, loading: false, isInitializing: false })
    assertDisabledState(wrapper, false, false)
  })

  it('disables both selects and text fields when action is running', () => {
    const wrapper = mountComponent({ runningAction: true, loading: false, isInitializing: false })
    assertDisabledState(wrapper, true, true)
  })

  it('disables only selects while loading to preserve text input focus', () => {
    const wrapper = mountComponent({ runningAction: false, loading: true, isInitializing: false })
    assertDisabledState(wrapper, true, false)
  })

  it('disables both selects and text fields while initializing', () => {
    const wrapper = mountComponent({ runningAction: false, loading: false, isInitializing: true })
    assertDisabledState(wrapper, true, true)
  })


  it('emits update events for all v-model bindings', async () => {
    const wrapper = mountComponent()

    wrapper.vm.parcelsStatusModel = 'status'
    wrapper.vm.parcelsCheckStatusSwModel = 'sw'
    wrapper.vm.parcelsCheckStatusFcModel = 'fc'
    wrapper.vm.localTnvedSearchModel = '1234'
    wrapper.vm.localParcelNumberSearchModel = 'ABC'
    wrapper.vm.localProductNameSearchModel = 'Product X'

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:parcelsStatus')?.[0]).toEqual(['status'])
    expect(wrapper.emitted('update:parcelsCheckStatusSw')?.[0]).toEqual(['sw'])
    expect(wrapper.emitted('update:parcelsCheckStatusFc')?.[0]).toEqual(['fc'])
    expect(wrapper.emitted('update:localTnvedSearch')?.[0]).toEqual(['1234'])
    expect(wrapper.emitted('update:localParcelNumberSearch')?.[0]).toEqual(['ABC'])
    expect(wrapper.emitted('update:localProductNameSearch')?.[0]).toEqual(['Product X'])
  })
  it('keeps controls disabled when multiple blocking flags are active', () => {
    const wrapper = mountComponent({ runningAction: true, loading: true, isInitializing: true })
    assertDisabledState(wrapper, true, true)
  })
})
