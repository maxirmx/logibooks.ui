// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import FeacnCodeSelector from '@/components/FeacnCodeSelector.vue'
import { getFeacnTooltip } from '@/helpers/feacn.info.helpers.js'

vi.mock('@/helpers/feacn.info.helpers.js', async (importOriginal) => ({
  ...await importOriginal(),
  getFeacnTooltip: vi.fn()
}))

const selectTnVed = vi.fn()
const historyCode = '6403999300'
const weakCode = '6403999500'

function mountSelector(tnVed, feacnLookupSuggestions) {
  return mount(FeacnCodeSelector, {
    props: { item: { id: 1, tnVed, feacnLookupSuggestions } },
    global: {
      plugins: [createPinia()],
      provide: { selectTnVed },
      stubs: {
        VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
        FontAwesomeIcon: { props: ['icon'], template: '<i :data-icon="icon" />' }
      }
    }
  })
}

describe('FeacnCodeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFeacnTooltip.mockResolvedValue('Описание кода')
  })

  it('shows a merged code once with its history border, exact match and current tooltip', async () => {
    const wrapper = mountSelector(historyCode, [
      { code: historyCode, fromKeywords: true, fromHistory: true },
      { code: weakCode, fromKeywords: true, fromHistory: false }
    ])
    const chips = wrapper.findAll('.feacn-code-item')
    expect(chips.map(chip => chip.text())).toEqual([historyCode, weakCode])
    const [history, weakMatch] = chips
    expect(history.classes()).toEqual(expect.arrayContaining(['matching-feacn-code-item', 'matched']))
    expect(history.find('[data-icon="fa-solid fa-check-double"]').exists()).toBe(true)
    expect(weakMatch.classes()).toContain('matched-weak')
    expect(weakMatch.find('[data-icon="fa-solid fa-ellipsis-vertical"]').exists()).toBe(true)

    await history.trigger('mouseenter')
    await flushPromises()
    expect(wrapper.text()).toContain('Выбрано')
    expect(wrapper.text()).toContain('Описание кода')
    expect(getFeacnTooltip).toHaveBeenCalledExactlyOnceWith(historyCode)
    await history.trigger('click')
    expect(selectTnVed).not.toHaveBeenCalled()
  })

  it('keeps the history-only border style and selects that code once', async () => {
    const wrapper = mountSelector('1111111111', [
      { code: historyCode, fromKeywords: false, fromHistory: true }
    ])
    const history = wrapper.get('.matching-feacn-code-item')
    expect(history.classes()).not.toContain('unmatched')
    expect(wrapper.text()).toContain('Выбрать')
    await history.trigger('click', { shiftKey: true })
    await history.trigger('click', { ctrlKey: true })
    await history.trigger('click', { metaKey: true })
    expect(selectTnVed).not.toHaveBeenCalled()
    await history.trigger('click')
    expect(selectTnVed).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 1 }), historyCode)
  })

  it('keeps the history class when the same suggestion is also an unmatched keyword code', () => {
    const wrapper = mountSelector('1111111111', [
      { code: historyCode, fromKeywords: true, fromHistory: true }
    ])
    expect(wrapper.get('.matching-feacn-code-item').classes()).toContain('unmatched')
  })

  it('shows the placeholder for an empty suggestion list', () => {
    expect(mountSelector('', []).text()).toBe('-')
  })
})
