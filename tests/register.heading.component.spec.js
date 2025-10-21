// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RegisterHeadingWithStats from '@/components/RegisterHeadingWithStats.vue'
import { useRegistersStore } from '@/stores/registers.store.js'

// Mock tooltip to simplify DOM
vi.mock('vuetify/components', () => ({}))

vi.mock('@/helpers/parcel.stats.helpers.js', () => ({
  formatParcelsByCheckStatusTooltip: (item) => {
    if (!item?.parcelsByCheckStatus) return ''
    return 'STAT:' + JSON.stringify(item.parcelsByCheckStatus)
  }
}))

describe('RegisterHeadingWithStats', () => {
  it('shows initial stats then refreshes with updated stats', async () => {
    setActivePinia(createPinia())
    const store = useRegistersStore()
    store.item = {
      id: 1,
      parcelsByCheckStatus: { 1: 2 },
      parcelsTotal: 10,
      placesTotal: 20
    }

    const getByIdSpy = vi.spyOn(store, 'getById').mockImplementation(async () => {
      store.item = { id: 1, parcelsByCheckStatus: { 1: 2, 2: 5 }, parcelsTotal: 12, placesTotal: 25 }
    })

    const wrapper = mount(RegisterHeadingWithStats, {
      props: {
        registerId: 1,
        register: store.item,
        heading: 'Heading Text'
      },
      global: {
        stubs: {
          'v-tooltip': {
            template: '<div><slot name="activator" :props="{}"></slot><slot /></div>'
          }
        }
      }
    })

    // Initial tooltip content
    expect(wrapper.text()).toContain('Heading Text')
  expect(wrapper.text()).toContain('Всего товаров: 10')
  expect(wrapper.text()).toContain('Всего посылок: 20')
  // No separator yet until stats appended on initial display (stats present so separator should appear)
  expect(wrapper.text()).toContain('----------------')
  expect(wrapper.text()).toContain('STAT:{"1":2}')

    // Wait microtasks for refresh
    await Promise.resolve()
    await Promise.resolve()

    expect(getByIdSpy).toHaveBeenCalled()
    // Updated stats
  expect(wrapper.text()).toContain('Всего товаров: 12')
  expect(wrapper.text()).toContain('Всего посылок: 25')
  expect(wrapper.text()).toContain('STAT:{"1":2,"2":5}')
  })
})
