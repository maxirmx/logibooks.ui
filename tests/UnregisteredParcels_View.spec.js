/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UnregisteredParcelsView from '@/views/UnregisteredParcels_View.vue'

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouter: () => ({
      back: vi.fn()
    })
  }
})

describe('UnregisteredParcels_View.vue', () => {
  it('renders list with register id', () => {
    const wrapper = mount(UnregisteredParcelsView, {
      props: { registerId: 42 },
      global: {
        stubs: {
          UnregisteredParcelsList: {
            props: ['registerId'],
            template: '<div data-testid="unregistered-list-stub">{{ registerId }}</div>'
          }
        }
      }
    })

    const stub = wrapper.find('[data-testid="unregistered-list-stub"]')
    expect(stub.exists()).toBe(true)
    expect(stub.text()).toBe('42')
  })
})
