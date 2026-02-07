/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScannedItemsView from '@/views/ScannedItems_View.vue'

const scannedItemsListStub = {
  name: 'ScannedItems_List',
  props: ['scanjobId'],
  template: '<div data-test="scanned-items-list">Scanned Items {{ scanjobId }}</div>'
}

describe('ScannedItems_View.vue', () => {
  it('passes scanjob id to list component', () => {
    const wrapper = mount(ScannedItemsView, {
      props: { id: 42 },
      global: {
        stubs: {
          ScannedItemsList: scannedItemsListStub
        }
      }
    })

    const list = wrapper.find('[data-test="scanned-items-list"]')
    expect(list.exists()).toBe(true)

    const listComponent = wrapper.findComponent({ name: 'ScannedItems_List' })
    expect(listComponent.exists()).toBe(true)
    expect(listComponent.props('scanjob-id') || listComponent.props('scanjobId')).toBe(42)
  })
})
