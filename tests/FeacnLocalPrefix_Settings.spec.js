/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import FeacnLocalPrefix_Settings from '@/dialogs/FeacnLocalPrefix_Settings.vue'

// Stub FieldArrayWithButtons
vi.mock('@/components/FieldArrayWithButtons.vue', () => ({
  default: {
    name: 'FieldArrayWithButtons',
    props: ['name', 'label'],
    template: '<div data-test="fab-stub"></div>'
  }
}))

// Mock FeacnCodeSearch
vi.mock('@/components/FeacnCodeSearch.vue', () => ({
  default: {
    name: 'FeacnCodeSearch',
    props: [],
    emits: ['select', 'refocus'],
    template: '<div data-test="feacn-code-search"></div>'
  }
}))

// Mock ActionButton
vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['icon', 'item', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button data-test="action-button" @click="$emit(\'click\')">{{ icon }}</button>'
  }
}))

// Mock stores
const getById = vi.fn()
const create = vi.fn()
const update = vi.fn()

vi.mock('@/stores/feacn.prefixes.store.js', () => ({
  useFeacnPrefixesStore: () => ({
    getById,
    create,
    update
  })
}))

const alertError = vi.fn()
const alertClear = vi.fn()

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: alertError,
    clear: alertClear
  })
}))

vi.mock('@/router', () => ({
  default: {
    push: vi.fn()
  }
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({
      alert: ref(null)
    })
  }
})

describe('FeacnLocalPrefix_Settings.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mountComponent = (props = { mode: 'create' }) =>
    mount(FeacnLocalPrefix_Settings, {
      props,
      global: {
        stubs: { 'font-awesome-icon': true }
      }
    })

  const expectedCreatePayload = (overrides = {}) => ({
    code: '',
    exceptions: [],
    comment: '',
    explanationForExport: '',
    explanationForImport: '',
    forExport: false,
    forImport: false,
    description: null,
    feacnOrderId: null,
    ...overrides
  })

  it('renders create mode and submits', async () => {
    create.mockResolvedValue({})
    const wrapper = mountComponent()
    wrapper.vm.setFieldValue('code', '0101')
    wrapper.vm.setFieldValue('exceptions', ['111', ''])
    await wrapper.vm.onSubmit()
    expect(create).toHaveBeenCalledWith(expectedCreatePayload({ code: '0101', exceptions: ['111'] }))
  })

  it('loads data in edit mode and updates', async () => {
    // Mock backend response with FeacnPrefixExceptionDto structure
    getById.mockResolvedValue({ 
      code: '0202', 
      comment: ' legacy comment ',
      explanationForExport: 'export reason',
      explanationForImport: 'import reason',
      forExport: true,
      forImport: false,
      description: 'server description',
      feacnOrderId: 7,
      exceptions: [{ id: 1, code: '222', feacnPrefixId: 1 }] 
    })
    update.mockResolvedValue({})
    const wrapper = mountComponent({ mode: 'edit', prefixId: 1 })
    await flushPromises()
    await wrapper.vm.onSubmit()
    expect(getById).toHaveBeenCalledWith(1)
    expect(update).toHaveBeenCalledWith(1, {
      code: '0202',
      exceptions: ['222'],
      comment: ' legacy comment ',
      explanationForExport: 'export reason',
      explanationForImport: 'import reason',
      forExport: true,
      forImport: false,
      description: 'server description',
      feacnOrderId: 7
    })
  })

  it('handles mixed exception formats in edit mode', async () => {
    // Mock backend response with mixed string and object formats for backward compatibility
    getById.mockResolvedValue({ 
      code: '0303', 
      exceptions: ['333', { id: 2, code: '444', feacnPrefixId: 1 }] 
    })
    update.mockResolvedValue({})
    const wrapper = mountComponent({ mode: 'edit', prefixId: 1 })
    await flushPromises()
    await wrapper.vm.onSubmit()
    expect(getById).toHaveBeenCalledWith(1)
    expect(update).toHaveBeenCalledWith(1, expectedCreatePayload({
      code: '0303',
      exceptions: ['333', '444']
    }))
  })

  it('filters out empty exception strings on submit', async () => {
    create.mockResolvedValue({})
    const wrapper = mountComponent()
    wrapper.vm.setFieldValue('code', '0404')
    wrapper.vm.setFieldValue('exceptions', ['555', '', '666', '   '])
    await wrapper.vm.onSubmit()
    expect(create).toHaveBeenCalledWith(expectedCreatePayload({ code: '0404', exceptions: ['555', '666'] }))
  })

  it('renders styled export and import checkboxes', () => {
    const wrapper = mountComponent()
    const checkboxes = wrapper.findAll('input[type="checkbox"].checkbox-styled')
    expect(checkboxes).toHaveLength(2)
    expect(wrapper.find('#forExport').exists()).toBe(true)
    expect(wrapper.find('#forImport').exists()).toBe(true)
  })

  it('hides explanation fields until respective flags are enabled', async () => {
    const wrapper = mountComponent()
    expect(wrapper.find('#explanationForExport').exists()).toBe(false)
    expect(wrapper.find('#explanationForImport').exists()).toBe(false)

    await wrapper.find('#forExport').setValue(true)
    expect(wrapper.find('#explanationForExport').exists()).toBe(true)
    expect(wrapper.find('#explanationForImport').exists()).toBe(false)

    await wrapper.find('#forImport').setValue(true)
    expect(wrapper.find('#explanationForImport').exists()).toBe(true)
  })

  it('does not render an editable comment input', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('#comment').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Причина запрета:')
  })

  it('submits procedure flags and explanations', async () => {
    create.mockResolvedValue({})
    const wrapper = mountComponent()
    wrapper.vm.setFieldValue('code', '0505')
    wrapper.vm.setFieldValue('forExport', true)
    wrapper.vm.setFieldValue('forImport', true)
    wrapper.vm.setFieldValue('explanationForExport', ' export text ')
    wrapper.vm.setFieldValue('explanationForImport', ' import text ')
    await wrapper.vm.onSubmit()
    expect(create).toHaveBeenCalledWith(expectedCreatePayload({
      code: '0505',
      explanationForExport: 'export text',
      explanationForImport: 'import text',
      forExport: true,
      forImport: true
    }))
  })

  it('renders FieldArrayWithButtons', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-test="fab-stub"]').exists()).toBe(true)
  })

  it('renders ActionButton and FeacnCodeSearch when search is toggled', async () => {
    const wrapper = mountComponent()
    
    // Should render ActionButton
    expect(wrapper.find('[data-test="action-button"]').exists()).toBe(true)
    
    // Should not show search initially
    expect(wrapper.find('[data-test="feacn-code-search"]').exists()).toBe(false)
    
    // Click the action button to toggle search
    await wrapper.find('[data-test="action-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    
    // Should show search now
    expect(wrapper.find('[data-test="feacn-code-search"]').exists()).toBe(true)
  })

  it('handles code selection from FeacnCodeSearch', async () => {
    const wrapper = mountComponent()
    
    // Toggle search on
    await wrapper.find('[data-test="action-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    
    // Simulate code selection
    const feacnCodeSearch = wrapper.findComponent({ name: 'FeacnCodeSearch' })
    await feacnCodeSearch.vm.$emit('select', '123456')
    
    // Check that code field is updated
    expect(wrapper.vm.code).toBe('123456')
    
    // Search should be closed
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="feacn-code-search"]').exists()).toBe(false)
  })

  it('restores focus to previously active element after code search closes', async () => {
    const wrapper = mountComponent()
    const focusSpy = vi.fn()
    const activeInput = document.createElement('input')
    activeInput.focus = focusSpy
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => activeInput
    })

    wrapper.vm.toggleCodeSearch()
    wrapper.vm.handleRefocus()
    await wrapper.vm.$nextTick()

    expect(focusSpy).toHaveBeenCalled()
  })

  it('restores focus to previously active element after exception search closes', async () => {
    const wrapper = mountComponent()
    const focusSpy = vi.fn()
    const activeInput = document.createElement('input')
    activeInput.focus = focusSpy
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => activeInput
    })

    wrapper.vm.toggleExceptionSearch(0)
    wrapper.vm.handleRefocus()
    await wrapper.vm.$nextTick()

    expect(focusSpy).toHaveBeenCalled()
  })
})
