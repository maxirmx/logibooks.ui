// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ResponsiveFilterBar from '@/components/ResponsiveFilterBar.vue'

describe('ResponsiveFilterBar', () => {
  it('renders filters as direct slotted children in an accessible group', () => {
    const wrapper = mount(ResponsiveFilterBar, {
      props: { ariaLabel: 'Фильтры реестров' },
      slots: {
        default:
          '<div class="responsive-filter-bar__item--compact">Procedure</div>' +
          '<div class="responsive-filter-bar__item--grow">Search</div>'
      }
    })

    expect(wrapper.attributes('role')).toBe('group')
    expect(wrapper.attributes('aria-label')).toBe('Фильтры реестров')
    expect(wrapper.element.children).toHaveLength(2)
    expect(wrapper.element.children[0].classList).toContain(
      'responsive-filter-bar__item--compact'
    )
    expect(wrapper.element.children[1].classList).toContain('responsive-filter-bar__item--grow')
  })

  it('uses the generic filter label by default', () => {
    const wrapper = mount(ResponsiveFilterBar)

    expect(wrapper.attributes('aria-label')).toBe('Фильтры')
  })
})
