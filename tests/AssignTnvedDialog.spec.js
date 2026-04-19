// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AssignTnvedDialog from '@/l2/AssignTnvedDialog.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

const { mockGetFeacnInfo } = vi.hoisted(() => ({
  mockGetFeacnInfo: vi.fn()
}))

vi.mock('@/helpers/feacn.info.helpers.js', () => ({
  getFeacnInfo: mockGetFeacnInfo
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['icon', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button class="action-btn" :data-icon="icon" :disabled="disabled" @click="$emit(\'click\')"></button>'
  }
}))

vi.mock('@/components/FeacnCodeSearch.vue', () => ({
  default: {
    name: 'FeacnCodeSearch',
    emits: ['select', 'refocus'],
    template: '<div class="feacn-search-stub" data-testid="feacn-search-stub"></div>'
  }
}))

vi.mock('@/components/FeacnCodeSearchByKeyword.vue', () => ({
  default: {
    name: 'FeacnCodeSearchByKeyword',
    props: ['modelValue'],
    emits: ['update:modelValue', 'select', 'refocus'],
    template: '<div class="feacn-keyword-search-stub" data-testid="feacn-keyword-search-stub"></div>'
  }
}))

function createWrapper(props = {}) {
  return mount(AssignTnvedDialog, {
    props: {
      show: true,
      selectedIds: [101, 102],
      ...props,
    },
    global: {
      stubs: {
        teleport: true,
        ...vuetifyStubs,
        'v-btn': {
          name: 'v-btn',
          props: ['disabled', 'variant', 'color'],
          emits: ['click'],
          template: '<button class="v-btn-stub" data-testid="v-btn" :disabled="disabled" @click="$emit(\'click\')"><slot></slot></button>'
        }
      },
    },
  })
}

describe('AssignTnvedDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetFeacnInfo.mockReset()
    mockGetFeacnInfo.mockResolvedValue({
      name: 'Тестовое наименование ТН ВЭД',
      found: true,
      loading: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function setInputAndWaitLookup(wrapper, value) {
    const input = wrapper.find('[data-testid="target-tnved-input"]')
    await input.setValue(value)
    // Advance past 500ms debounce
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()
  }

  it('keeps confirm button disabled for invalid TN VED (wrong length)', async () => {
    const wrapper = createWrapper()

    const input = wrapper.find('[data-testid="target-tnved-input"]')
    await input.setValue(' 123456789 ')

    const confirmBtn = wrapper.findAll('[data-testid="v-btn"]')[1]
    expect(confirmBtn.element.disabled).toBe(true)
    expect(wrapper.find('[data-testid="target-tnved-message"]').exists()).toBe(true)
  })

  it('keeps confirm disabled until lookup confirms code exists', async () => {
    // Make lookup slow — never resolve during this test
    mockGetFeacnInfo.mockReturnValue(new Promise(() => {}))
    const wrapper = createWrapper()

    const input = wrapper.find('[data-testid="target-tnved-input"]')
    await input.setValue('1234567890')

    // Before debounce fires: checking flag set, button still disabled
    const confirmBtn = wrapper.findAll('[data-testid="v-btn"]')[1]
    expect(confirmBtn.element.disabled).toBe(true)

    // Advance debounce
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()

    // Still disabled (lookup hasn't resolved)
    expect(confirmBtn.element.disabled).toBe(true)
    const message = wrapper.find('[data-testid="target-tnved-message"]')
    expect(message.text()).toContain('Проверка')
    expect(message.classes()).toContain('validation-info')
    expect(message.classes()).not.toContain('validation-error')
  })

  it('enables confirm and emits trimmed 10-digit code after successful lookup', async () => {
    const wrapper = createWrapper()

    await setInputAndWaitLookup(wrapper, ' 1234567890 ')

    const confirmBtn = wrapper.findAll('[data-testid="v-btn"]')[1]
    expect(confirmBtn.element.disabled).toBe(false)

    await confirmBtn.trigger('click')

    const confirmEvents = wrapper.emitted('confirm')
    expect(confirmEvents).toBeTruthy()
    expect(confirmEvents[0]).toEqual([[101, 102], '1234567890'])
    expect(wrapper.emitted('update:show')).toBeFalsy()
  })

  it('shows FEACN name in success style when code is valid', async () => {
    const wrapper = createWrapper()

    await setInputAndWaitLookup(wrapper, '1234567890')

    expect(mockGetFeacnInfo).toHaveBeenCalledWith('1234567890')
    const message = wrapper.find('[data-testid="target-tnved-message"]')
    expect(message.text()).toContain('Тестовое наименование ТН ВЭД')
    expect(message.classes()).toContain('validation-success')
  })

  it('disables confirm when code does not exist in catalog', async () => {
    mockGetFeacnInfo.mockResolvedValue({
      name: 'Несуществующий код ТН ВЭД',
      found: false,
      loading: false,
    })
    const wrapper = createWrapper()

    await setInputAndWaitLookup(wrapper, '9999999999')

    const confirmBtn = wrapper.findAll('[data-testid="v-btn"]')[1]
    expect(confirmBtn.element.disabled).toBe(true)
    expect(wrapper.find('[data-testid="target-tnved-message"]').text()).toContain('Несуществующий код ТН ВЭД')
  })

  it('disables confirm when lookup throws an error', async () => {
    mockGetFeacnInfo.mockRejectedValue(new Error('Network error'))
    const wrapper = createWrapper()

    await setInputAndWaitLookup(wrapper, '1234567890')

    const confirmBtn = wrapper.findAll('[data-testid="v-btn"]')[1]
    expect(confirmBtn.element.disabled).toBe(true)
    expect(wrapper.find('[data-testid="target-tnved-message"]').text()).toContain('Несуществующий код ТН ВЭД')
  })

  it('opens FEACN tree search overlay and applies selected code', async () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAll('.action-btn')

    await buttons[0].trigger('click')
    expect(wrapper.find('[data-testid="assign-tnved-feacn-search-overlay"]').exists()).toBe(true)

    await wrapper.findComponent({ name: 'FeacnCodeSearch' }).vm.$emit('select', '9876543210')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="target-tnved-input"]')
    expect(input.element.value).toBe('9876543210')
    expect(wrapper.find('[data-testid="assign-tnved-feacn-search-overlay"]').exists()).toBe(false)
  })

  it('opens keyword search overlay and applies selected code', async () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAll('.action-btn')

    await buttons[1].trigger('click')
    expect(wrapper.find('[data-testid="assign-tnved-feacn-keyword-overlay"]').exists()).toBe(true)

    await wrapper.findComponent({ name: 'FeacnCodeSearchByKeyword' }).vm.$emit('select', '1111222233')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="target-tnved-input"]')
    expect(input.element.value).toBe('1111222233')
    expect(wrapper.find('[data-testid="assign-tnved-feacn-keyword-overlay"]').exists()).toBe(false)
  })

  it('closes overlays when dialog is hidden', async () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAll('.action-btn')

    await buttons[0].trigger('click')
    expect(wrapper.find('[data-testid="assign-tnved-feacn-search-overlay"]').exists()).toBe(true)

    await wrapper.setProps({ show: false })

    expect(wrapper.find('[data-testid="assign-tnved-feacn-search-overlay"]').exists()).toBe(false)
  })

  it('does not allow non-digit values even with ten symbols', async () => {
    const wrapper = createWrapper()

    const input = wrapper.find('[data-testid="target-tnved-input"]')
    await input.setValue('12345A7890')

    const confirmBtn = wrapper.findAll('[data-testid="v-btn"]')[1]
    expect(confirmBtn.element.disabled).toBe(true)

    await confirmBtn.trigger('click')

    expect(wrapper.emitted('confirm')).toBeFalsy()
    // getFeacnInfo should never be called for non-digit input
    expect(mockGetFeacnInfo).not.toHaveBeenCalled()
  })

  it('debounces lookup calls when input changes rapidly', async () => {
    const wrapper = createWrapper()

    const input = wrapper.find('[data-testid="target-tnved-input"]')
    await input.setValue('1234567890')
    await vi.advanceTimersByTimeAsync(200)
    await input.setValue('1234567891')
    await vi.advanceTimersByTimeAsync(200)
    await input.setValue('1234567892')
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()

    // Only the last value should have triggered a lookup
    expect(mockGetFeacnInfo).toHaveBeenCalledTimes(1)
    expect(mockGetFeacnInfo).toHaveBeenCalledWith('1234567892')
  })
})
