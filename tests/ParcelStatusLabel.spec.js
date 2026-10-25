// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelStatusLabel from '@/components/ParcelStatusLabel.vue'
import ClickableCell from '@/components/ClickableCell.vue'

describe('ParcelStatusLabel', () => {
  it.each([762, '762'])('prepends the real skull icon with a Russian accessible description (%s)', async country => {
    const wrapper = mount(ParcelStatusLabel, {
      props: { dangerousGoods: true, theOtherCountryCode: country },
      slots: { default: 'Сортировка / Status' }
    })
    const indicator = wrapper.get('.parcel-status-label__dangerous')
    expect(indicator.attributes('role')).toBe('img')
    expect(indicator.attributes('aria-label')).toBe('Опасный груз')
    expect(indicator.attributes('title')).toBe('Опасный груз')
    expect(indicator.get('svg').attributes('data-icon')).toBe('skull-crossbones')
    expect(indicator.element.compareDocumentPosition(wrapper.get('.parcel-status-label__value').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(wrapper.text()).toBe('Сортировка / Status')
    await wrapper.setProps({ dangerousGoods: false })
    expect(wrapper.find('[role="img"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('Сортировка / Status')
    wrapper.unmount()
  })

  it.each([false, null, undefined])('preserves ordinary status text without an icon (%s)', flag => {
    const wrapper = mount(ParcelStatusLabel, {
      props: { dangerousGoods: flag, theOtherCountryCode: 762 },
      slots: { default: 'Возврат' }
    })
    expect(wrapper.find('[role="img"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('Возврат')
    wrapper.unmount()
  })

  it.each([860, null, undefined])('hides the indicator outside the established country scope (%s)', country => {
    const wrapper = mount(ParcelStatusLabel, {
      props: { dangerousGoods: true, theOtherCountryCode: country },
      slots: { default: 'Сохранённый признак' }
    })
    expect(wrapper.find('[role="img"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps icon clicks inside the existing cell navigation and modifier guards', async () => {
    const item = { id: 980 }
    const wrapper = mount(ClickableCell, {
      props: { item },
      slots: { default: { components: { ParcelStatusLabel }, template: '<ParcelStatusLabel dangerous-goods :the-other-country-code="762">Возврат</ParcelStatusLabel>' } }
    })
    const icon = wrapper.get('.parcel-status-label__dangerous')
    await icon.trigger('click')
    expect(wrapper.emitted('click')).toEqual([[item]])
    await icon.trigger('click', { ctrlKey: true })
    expect(wrapper.emitted('click')).toHaveLength(1)
    await wrapper.setProps({ disabled: true })
    await icon.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
    wrapper.unmount()
  })
})
