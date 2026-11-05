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
        stubs: {
          'v-tooltip': {
            name: 'VTooltip',
            props: ['text', 'location', 'openDelay'],
            template: '<div><slot name="activator" :props="{ \'data-tooltip-activator\': true }" /></div>'
          }
        },
        components: {
          ClickableCell,
          ActionButton
        }
      }
    })
  }

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
