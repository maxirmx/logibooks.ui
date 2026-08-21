/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import FeacnLocalPrefix_Settings from '@/dialogs/FeacnLocalPrefix_Settings.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

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
    template: '<button data-test="action-button" @click="$emit(\'click\', item)">{{ icon }}</button>'
  }
}))

// Mock stores
const getById = vi.fn()
const create = vi.fn()
const update = vi.fn()
const ensureLoaded = vi.fn()
let mockPrefixes = []

vi.mock('@/stores/feacn.prefixes.store.js', () => ({
  useFeacnPrefixesStore: () => ({
    prefixes: mockPrefixes,
    ensureLoaded,
    getById,
    create,
    update
  })
}))

vi.mock('@/stores/countries.store.js', () => ({
  useCountriesStore: () => ({
    countries: ref([
      { isoNumeric: 643, nameRuShort: 'Россия' },
      { isoNumeric: 860, nameRuShort: 'Узбекистан' }
    ]),
    ensureLoaded: vi.fn().mockResolvedValue(undefined)
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
    storeToRefs: (store) => store.countries
      ? { countries: store.countries }
      : { alert: ref(null) }
  }
})

describe('FeacnLocalPrefix_Settings.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockPrefixes = []
    ensureLoaded.mockResolvedValue()
  })

  const mountComponent = (props = { mode: 'create' }) =>
    mount(FeacnLocalPrefix_Settings, {
      props,
      global: {
        stubs: {
          ...vuetifyStubs,
          'font-awesome-icon': true,
          'v-autocomplete': {
            template: '<div class="v-autocomplete-stub scope-country"></div>',
            props: ['modelValue', 'items', 'label', 'disabled']
          }
        }
      }
    })

  const expectedCreatePayload = (overrides = {}) => ({
    code: '',
    exceptions: [],
    comment: '',
    scopes: [],
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
    expect(create).toHaveBeenCalledWith(
      expectedCreatePayload({ code: '0101', exceptions: ['111'] })
    )
  })

  it('calls ensureLoaded on mount', async () => {
    mountComponent()
    await flushPromises()
    expect(ensureLoaded).toHaveBeenCalledOnce()
  })

  it('loads data in edit mode and updates', async () => {
    // Mock backend response with FeacnPrefixExceptionDto structure
    getById.mockResolvedValue({
      code: '0202',
      comment: ' legacy comment ',
      scopes: [
        { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'export reason' }
      ],
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
      scopes: [
        { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'export reason' }
      ],
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
    expect(update).toHaveBeenCalledWith(
      1,
      expectedCreatePayload({
        code: '0303',
        exceptions: ['333', '444']
      })
    )
  })

  it('renders the reusable scope editor', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="restriction-scope-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-restriction-scope"]').exists()).toBe(true)
  })

  it('allows an empty scope collection to make a prefix inactive', () => {
    const wrapper = mountComponent()
    const saveButton = wrapper.find('button.primary')
    expect(saveButton.attributes('disabled')).toBeUndefined()
  })

  it('adds and removes independent scope rows', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-testid="add-restriction-scope"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.scope-row-wrapper')).toHaveLength(1)
    await wrapper.find('.scope-row-wrapper [data-test="action-button"]').trigger('click')
    expect(wrapper.findAll('.scope-row-wrapper')).toHaveLength(0)
  })

  it('loads submitted scope rows when editing', async () => {
    getById.mockResolvedValue({
      id: 1,
      code: '0606',
      scopes: [
        { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'reason' }
      ],
      exceptions: []
    })
    const wrapper = mountComponent({ mode: 'edit', prefixId: 1 })
    await flushPromises()

    expect(wrapper.vm.scopes).toEqual([
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'reason' }
    ])
  })

  it('shows an explanation input on each scope row', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-testid="add-restriction-scope"]').trigger('click')
    expect(wrapper.find('.scope-explanation').exists()).toBe(true)
  })

  it('rejects a scope already assigned to another record with the same code', async () => {
    mockPrefixes = [{
      id: 1,
      code: ' 0505 ',
      scopes: [{ countryIsoNumeric: 643, customsProcedureCode: 10 }]
    }]
    const wrapper = mountComponent()
    wrapper.vm.setFieldValue('code', '0505')
    wrapper.vm.setFieldValue('scopes', [
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: '' }
    ])

    await wrapper.vm.onSubmit()
    await flushPromises()

    expect(create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Страна и процедура уже используются для этого префикса')
  })

  it('allows an edited record to retain its own scope', async () => {
    const scope = { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'reason' }
    mockPrefixes = [{ id: 7, code: '0505', scopes: [scope] }]
    getById.mockResolvedValue({ id: 7, code: '0505', scopes: [scope], exceptions: [] })
    update.mockResolvedValue({})
    const wrapper = mountComponent({ mode: 'edit', prefixId: 7 })
    await flushPromises()

    await wrapper.vm.onSubmit()

    expect(update).toHaveBeenCalledWith(7, expect.objectContaining({
      code: '0505',
      scopes: [scope]
    }))
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
    wrapper.vm.setFieldValue('scopes', [
      { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: ' export text ' },
      { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: ' import text ' }
    ])
    await wrapper.vm.onSubmit()
    expect(create).toHaveBeenCalledWith(
      expectedCreatePayload({
        code: '0505',
        scopes: [
          { countryIsoNumeric: 643, customsProcedureCode: 10, explanation: 'export text' },
          { countryIsoNumeric: 860, customsProcedureCode: 40, explanation: 'import text' }
        ]
      })
    )
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
