/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UnregisteredParcelsView from '@/views/UnregisteredParcels_View.vue'

const mockBack = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())
const mockRoute = vi.hoisted(() => ({
  query: {}
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouter: () => ({
      back: mockBack,
      push: mockPush
    }),
    useRoute: () => mockRoute
  }
})

describe('UnregisteredParcels_View.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.query = {}
  })

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

  it('closes to returnUrl when provided by caller', async () => {
    mockRoute.query = { returnUrl: '/scanjobs/42/monitor' }

    const wrapper = mount(UnregisteredParcelsView, {
      props: { registerId: 42 },
      global: {
        stubs: {
          UnregisteredParcelsList: {
            props: ['registerId'],
            emits: ['close'],
            template: '<button data-testid="close-list" @click="$emit(\'close\')">{{ registerId }}</button>'
          }
        }
      }
    })

    await wrapper.find('[data-testid="close-list"]').trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/scanjobs/42/monitor')
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('falls back to router back when caller returnUrl is absent', async () => {
    const wrapper = mount(UnregisteredParcelsView, {
      props: { registerId: 42 },
      global: {
        stubs: {
          UnregisteredParcelsList: {
            props: ['registerId'],
            emits: ['close'],
            template: '<button data-testid="close-list" @click="$emit(\'close\')">{{ registerId }}</button>'
          }
        }
      }
    })

    await wrapper.find('[data-testid="close-list"]').trigger('click')

    expect(mockBack).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
