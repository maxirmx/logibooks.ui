import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

// Mock the child components
vi.mock('@/components/ClickableCell.vue', () => ({
  default: {
    name: 'ClickableCell',
    template: '<div class="clickable-cell" @click="$emit(\'click\', item)">{{ displayValue }}</div>',
    props: ['item', 'displayValue', 'cellClass'],
    emits: ['click']
  }
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    template: '<button class="action-button" :class="variant" @click="$emit(\'click\', item)" :disabled="disabled">{{ icon }}</button>',
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

  describe('Basic rendering', () => {
    it('renders with default props', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.action-buttons').exists()).toBe(true)
    })

    it('renders ClickableCell with postingNumber by default', () => {
      const wrapper = createWrapper()
      const clickableCell = wrapper.findComponent(ClickableCell)
      expect(clickableCell.exists()).toBe(true)
      expect(clickableCell.props('displayValue')).toBe('POST123')
    })

    it('renders ClickableCell with shk field when specified', () => {
      const wrapper = createWrapper({ fieldName: 'shk' })
      const clickableCell = wrapper.findComponent(ClickableCell)
      expect(clickableCell.props('displayValue')).toBe('SHK456')
    })

    it('renders empty string when field value is missing', () => {
      const itemWithoutPostingNumber = { ...defaultItem, postingNumber: undefined }
      const wrapper = createWrapper({ item: itemWithoutPostingNumber })
      const clickableCell = wrapper.findComponent(ClickableCell)
      expect(clickableCell.props('displayValue')).toBe('')
    })
  })

  describe('Fellow items indicators', () => {
    it('shows fellow items indicator when fellowItems exist and no blocks', () => {
      const itemWithFellowItems = {
        ...defaultItem,
        fellowItems: [{ id: 2 }, { id: 3 }],
        blockedByFellowItem: false,
        excsiseByFellowItem: false
      }
      const wrapper = createWrapper({ item: itemWithFellowItems })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      // Should have ClickableCell + 1 ActionButton for fellow items
      expect(actionButtons).toHaveLength(1)
      expect(actionButtons[0].props('icon')).toBe('fa-solid fa-comment-dots')
      expect(actionButtons[0].props('tooltipText')).toBe('Есть товары с тем же номером посылки')
    })

    it('shows blocked indicator when blockedByFellowItem is true', () => {
      const blockedItem = {
        ...defaultItem,
        blockedByFellowItem: true
      }
      const wrapper = createWrapper({ item: blockedItem })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      expect(actionButtons).toHaveLength(1)
      expect(actionButtons[0].props('icon')).toBe('fa-solid fa-comment-slash')
      expect(actionButtons[0].props('variant')).toBe('red')
      expect(actionButtons[0].props('tooltipText')).toBe('Есть запрет товара с тем же номером посылки')
    })

    it('shows excise indicator when excsiseByFellowItem is true', () => {
      const exciseItem = {
        ...defaultItem,
        excsiseByFellowItem: true
      }
      const wrapper = createWrapper({ item: exciseItem })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      expect(actionButtons).toHaveLength(1)
      expect(actionButtons[0].props('icon')).toBe('fa-solid fa-comment-dollar')
      expect(actionButtons[0].props('variant')).toBe('orange')
      expect(actionButtons[0].props('tooltipText')).toBe('Есть подакцизный товар с тем же номером посылки')
    })

    it('shows marked indicator when markedByFellowItem is true', () => {
      const markedItem = {
        ...defaultItem,
        markedByFellowItem: true
      }
      const wrapper = createWrapper({ item: markedItem })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      expect(actionButtons).toHaveLength(1)
      expect(actionButtons[0].props('icon')).toBe('fa-solid fa-comment-nodes')
      expect(actionButtons[0].props('variant')).toBe('blue')
      expect(actionButtons[0].props('tooltipText')).toBe('Товар с тем же номером посылки помечен партнёром')
    })

    it('does not show fellow items indicator when blocked or excise', () => {
      const itemWithFellowItemsButBlocked = {
        ...defaultItem,
        fellowItems: [{ id: 2 }],
        blockedByFellowItem: true,
        excsiseByFellowItem: false
      }
      const wrapper = createWrapper({ item: itemWithFellowItemsButBlocked })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      // Should only show blocked indicator, not fellow items indicator
      expect(actionButtons).toHaveLength(1)
      expect(actionButtons[0].props('icon')).toBe('fa-solid fa-comment-slash')
    })

    it('shows multiple indicators when applicable', () => {
      const multiIndicatorItem = {
        ...defaultItem,
        blockedByFellowItem: true,
        markedByFellowItem: true
      }
      const wrapper = createWrapper({ item: multiIndicatorItem })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      expect(actionButtons).toHaveLength(2)
      expect(actionButtons[0].props('icon')).toBe('fa-solid fa-comment-slash')
      expect(actionButtons[1].props('icon')).toBe('fa-solid fa-comment-nodes')
    })
  })

  describe('Disabled state', () => {
    it('passes disabled prop to ActionButtons', () => {
      const itemWithFellowItems = {
        ...defaultItem,
        fellowItems: [{ id: 2 }]
      }
      const wrapper = createWrapper({ 
        item: itemWithFellowItems,
        disabled: true 
      })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      expect(actionButtons[0].props('disabled')).toBe(true)
    })

    it('does not disable ClickableCell when disabled is true', () => {
      const wrapper = createWrapper({ disabled: true })
      const clickableCell = wrapper.findComponent(ClickableCell)
      
      // ClickableCell should not receive disabled prop
      expect(clickableCell.props('disabled')).toBeUndefined()
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

  describe('Edge cases', () => {
    it('handles null fellowItems', () => {
      const itemWithNullFellowItems = {
        ...defaultItem,
        fellowItems: null
      }
      const wrapper = createWrapper({ item: itemWithNullFellowItems })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      expect(actionButtons).toHaveLength(0)
    })

    it('handles undefined fellowItems', () => {
      const itemWithUndefinedFellowItems = {
        ...defaultItem,
        fellowItems: undefined
      }
      const wrapper = createWrapper({ item: itemWithUndefinedFellowItems })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      expect(actionButtons).toHaveLength(0)
    })

    it('handles empty fellowItems array', () => {
      const itemWithEmptyFellowItems = {
        ...defaultItem,
        fellowItems: []
      }
      const wrapper = createWrapper({ item: itemWithEmptyFellowItems })
      const actionButtons = wrapper.findAllComponents(ActionButton)
      
      expect(actionButtons).toHaveLength(0)
    })

    it('handles missing field name gracefully', () => {
      const itemWithoutField = { ...defaultItem }
      delete itemWithoutField.postingNumber
      const wrapper = createWrapper({ item: itemWithoutField, fieldName: 'nonExistentField' })
      const clickableCell = wrapper.findComponent(ClickableCell)
      
      expect(clickableCell.props('displayValue')).toBe('')
    })
  })

  describe('Component structure', () => {
    it('has correct CSS classes', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.action-buttons').exists()).toBe(true)
    })

    it('maintains correct component hierarchy', () => {
      const itemWithAllIndicators = {
        ...defaultItem,
        fellowItems: [{ id: 2 }],
        blockedByFellowItem: true,
        excsiseByFellowItem: true,
        markedByFellowItem: true
      }
      const wrapper = createWrapper({ item: itemWithAllIndicators })
      
      expect(wrapper.findComponent(ClickableCell).exists()).toBe(true)
      expect(wrapper.findAllComponents(ActionButton)).toHaveLength(3) // blocked, excise, marked (fellow items hidden due to blocks)
    })
  })
})
