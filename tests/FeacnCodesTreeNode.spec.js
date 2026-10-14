// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FeacnCodesTreeNode from '@/components/FeacnCodesTreeNode.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const globalStubs = {
  ...defaultGlobalStubs,
  'font-awesome-icon': true
}

describe('FeacnCodesTreeNode.vue', () => {
  function createWrapper(nodeProps = {}, componentProps = {}) {
    const defaultNode = {
      id: 1,
      code: '01',
      codeEx: '01',
      name: 'Test Node',
      expanded: false,
      loaded: false,
      loading: false,
      children: []
    }

    return mount(FeacnCodesTreeNode, {
      props: {
        node: { ...defaultNode, ...nodeProps },
        ...componentProps
      },
      global: { stubs: globalStubs }
    })
  }

  it('shows placeholder when node is loaded but has no children', () => {
    const wrapper = createWrapper({
      loaded: true,
      children: []
    })

    expect(wrapper.find('.toggle-placeholder').exists()).toBe(true)
    expect(wrapper.find('.toggle-icon').exists()).toBe(false)
  })

  it('does not emit toggle when node is loading', async () => {
    const wrapper = createWrapper({ loading: true })

    // Try to click the label (icon won't be there)
    await wrapper.find('.node-label').trigger('click')

    // Should not emit toggle event when loading
    expect(wrapper.emitted('toggle')).toBeFalsy()
  })

  it('emits select event for leaf node in select mode', async () => {
    const wrapper = createWrapper(
      { code: '0123456789', codeEx: '0123456789', name: 'Leaf Node' },
      { selectMode: true }
    )

    const label = wrapper.find('.node-label')
    expect(label.classes()).toContain('clickable')
    const code = wrapper.find('.node-code')
    expect(code.classes()).toContain('clickable')

    await label.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0][0]).toEqual(wrapper.props('node'))
  })

})
