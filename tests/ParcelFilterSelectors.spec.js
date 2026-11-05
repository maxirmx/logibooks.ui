/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelFilterSelectors from '@/components/ParcelFilterSelectors.vue'
describe('ParcelFilterSelectors', () => {
  const mountComponent = (props = {}) =>
    mount(ParcelFilterSelectors, {
      props: {
        statusOptions: [{ title: 'Все', value: null }],
        checkStatusOptionsSw: [{ title: 'Все', value: null }],
        checkStatusOptionsFc: [{ title: 'Все', value: null }],
        passportCheckStatusOptions: [{ title: 'Все', value: null }],
        parcelsStatus: null,
        parcelsCheckStatusSw: null,
        parcelsCheckStatusFc: null,
        parcelsPassportCheckStatus: null,
        parcelsHideLegacyRestrictions: false,
        localTnvedSearch: '',
        localParcelNumberSearch: '',
        localProductNameSearch: '',
        ...props
      },
      global: {
        stubs: {
          'v-select': {
            name: 'v-select',
            props: ['disabled', 'itemTitle', 'itemValue', 'label'],
            template:
              '<div class="v-select-stub" :data-label="label" :data-disabled="String(disabled)" :data-item-title="itemTitle" :data-item-value="itemValue"></div>'
          },
          'v-text-field': {
            name: 'v-text-field',
            props: ['disabled', 'label'],
            template:
              '<div class="v-text-field-stub" :data-label="label" :data-disabled="String(disabled)"></div>'
          }
        }
      }
    })

  it('emits update events for all v-model bindings', async () => {
    const wrapper = mountComponent()

    wrapper.vm.parcelsStatusModel = 'status'
    wrapper.vm.parcelsCheckStatusSwModel = 'sw'
    wrapper.vm.parcelsCheckStatusFcModel = 'fc'
    wrapper.vm.parcelsPassportCheckStatusModel = 'passport'
    wrapper.vm.parcelsHideLegacyRestrictionsModel = true
    wrapper.vm.localTnvedSearchModel = '1234'
    wrapper.vm.localParcelNumberSearchModel = 'ABC'
    wrapper.vm.localProductNameSearchModel = 'Product X'

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:parcelsStatus')?.[0]).toEqual(['status'])
    expect(wrapper.emitted('update:parcelsCheckStatusSw')?.[0]).toEqual(['sw'])
    expect(wrapper.emitted('update:parcelsCheckStatusFc')?.[0]).toEqual(['fc'])
    expect(wrapper.emitted('update:parcelsPassportCheckStatus')?.[0]).toEqual(['passport'])
    expect(wrapper.emitted('update:parcelsHideLegacyRestrictions')?.[0]).toEqual([true])
    expect(wrapper.emitted('update:localTnvedSearch')?.[0]).toEqual(['1234'])
    expect(wrapper.emitted('update:localParcelNumberSearch')?.[0]).toEqual(['ABC'])
    expect(wrapper.emitted('update:localProductNameSearch')?.[0]).toEqual(['Product X'])
  })

  it('normalizes legacy restrictions select values to booleans', async () => {
    const wrapper = mountComponent()

    wrapper.vm.parcelsHideLegacyRestrictionsModel = { title: 'Скрыть', value: true }
    wrapper.vm.parcelsHideLegacyRestrictionsModel = { title: 'Показать', value: false }
    wrapper.vm.parcelsHideLegacyRestrictionsModel = 'true'

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:parcelsHideLegacyRestrictions')).toEqual([
      [true],
      [false],
      [true]
    ])
  })

  it('keeps passport check status while initializing and clears it if still hidden afterwards', async () => {
    const wrapper = mountComponent({
      parcelsPassportCheckStatus: 30,
      showPassportCheckStatus: false,
      isInitializing: true
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:parcelsPassportCheckStatus')).toBeUndefined()

    await wrapper.setProps({ isInitializing: false })

    expect(wrapper.emitted('update:parcelsPassportCheckStatus')).toEqual([[null]])
  })

})
