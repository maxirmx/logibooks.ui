// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'

// Mock the child components
vi.mock('@/components/ClickableCell.vue', () => ({
  default: {
    name: 'ClickableCell',
    template:
      '<div class="clickable-cell" @click="$emit(\'click\', item)">{{ displayValue }}</div>',
    props: ['item', 'displayValue', 'cellClass'],
    emits: ['click']
  }
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    template:
      '<button class="action-button" :class="variant" @click="$emit(\'click\', item)" :disabled="disabled">{{ icon }}</button>',
    props: ['item', 'icon', 'tooltipText', 'disabled', 'variant'],
    emits: ['click']
  }
}))

describe('ParcelNumberExt', () => {
  const defaultItem = {
    id: 1,
    postingNumber: 'POST123',
    shk: 'SHK456',
    fellowItems: [],
    blockedByFellowItem: false,
    excsiseByFellowItem: false,
    markedByFellowItem: false
  }

  const createWrapper = (props = {}) => {
    return mount(ParcelNumberExt, {
      props: {
        item: defaultItem,
        ...props
      },
      global: {
        components: {
          ClickableCell,
          ActionButton
        }
      }
    })
  }

  describe('Export category marker', () => {
    it('shows an accessible framed marker alongside existing indicators', async () => {
      const wrapper = createWrapper({
        item: { ...defaultItem, matchesExportFeeCategory: true, markedByFellowItem: true },
        disabled: true
      })
      const marker = wrapper.get('.export-fee-category-marker')
      expect(marker.text()).toBe('C')
      expect(marker.attributes('role')).toBe('img')
      expect(marker.attributes('aria-label')).toBe('Код ТН ВЭД входит в справочник экспортных сборов')
      expect(marker.attributes('title')).toBe(marker.attributes('aria-label'))
      expect(wrapper.findComponent(ActionButton).exists()).toBe(true)
      await marker.trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
      expect(wrapper.emitted('fellows')).toBeUndefined()
      await wrapper.setProps({ item: { ...defaultItem, matchesExportFeeCategory: false } })
      expect(wrapper.find('.export-fee-category-marker').exists()).toBe(false)
    })

    it.each([false, undefined])('hides the marker for %s, including older API responses', (flag) => {
      const wrapper = createWrapper({ item: { ...defaultItem, matchesExportFeeCategory: flag } })
      expect(wrapper.find('.export-fee-category-marker').exists()).toBe(false)
    })
  })

  describe('Events', () => {
    it('emits click event when ClickableCell is clicked', async () => {
      const wrapper = createWrapper()
      const clickableCell = wrapper.findComponent(ClickableCell)

      await clickableCell.trigger('click')

      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')[0]).toEqual([defaultItem])
    })

    it('emits fellowsevent when ActionButton is clicked', async () => {
      const itemWithFellowItems = {
        ...defaultItem,
        fellowItems: [{ id: 2 }]
      }
      const wrapper = createWrapper({ item: itemWithFellowItems })
      const actionButton = wrapper.findComponent(ActionButton)

      await actionButton.trigger('click')

      expect(wrapper.emitted('fellows')).toBeTruthy()
      expect(wrapper.emitted('fellows')[0]).toEqual([itemWithFellowItems])
    })
  })

})
