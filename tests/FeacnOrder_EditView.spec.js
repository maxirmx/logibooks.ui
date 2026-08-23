/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FeacnOrderEditView from '@/views/FeacnOrder_EditView.vue'

describe('FeacnOrder_EditView', () => {
  it('passes the numeric route id to the settings component', () => {
    const wrapper = mount(FeacnOrderEditView, {
      props: { id: 17 },
      global: {
        stubs: {
          FeacnOrderSettings: {
            name: 'FeacnOrderSettings',
            props: ['orderId'],
            template: '<div data-testid="feacn-order-settings-stub"></div>'
          }
        }
      }
    })

    expect(wrapper.getComponent({ name: 'FeacnOrderSettings' }).props('orderId')).toBe(17)
  })
})
