// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ParcelStatusSection from '@/components/ParcelStatusSection.vue'
import ActionButton from '@/components/ActionButton.vue'

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: {
    name: 'FontAwesomeIcon',
    template: '<i class="fa-icon" :class="[icon]"></i>',
    props: ['icon', 'size', 'class']
  }
}))

const vuetify = createVuetify({ components, directives })

const defaultProps = {
  item: { id: 1, checkStatus: 0, dTime: '2025-06-07T08:09:00.000Z' },
  values: { statusId: 2, productName: 'Item' },
  parcelStatuses: [
    { id: 1, title: 'Новый' },
    { id: 2, title: 'В работе' }
  ],
  getCheckStatusClass: vi.fn(() => 'check-status-warning'),
  checkStatusInfo: '',
  hasCheckStatusIssues: true,
  disabled: false
}

function createWrapper(props = {}) {
  return mount(ParcelStatusSection, {
    props: { ...defaultProps, ...props },
    global: {
      plugins: [vuetify],
      components: {
        'font-awesome-icon': {
          name: 'FontAwesomeIcon',
          template: '<i class="fa-icon" :class="[icon]"></i>',
          props: ['icon', 'size', 'class']
        }
      }
    }
  })
}

describe('ParcelStatusSection', () => {
  it('renders status selector and all action buttons', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('#statusId').exists()).toBe(true)
    expect(wrapper.findAll('option')).toHaveLength(2)
    expect(wrapper.findAllComponents(ActionButton)).toHaveLength(7)
  })

  it('renders current check status and computed class', () => {
    const wrapper = createWrapper()

    const checkStatusCell = wrapper.find('#checkStatus')
    expect(checkStatusCell.classes()).toContain('check-status-warning')
    expect(defaultProps.getCheckStatusClass).toHaveBeenCalledWith(defaultProps.item.checkStatus)
  })

  it('emits all action events with form values payload', async () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAllComponents(ActionButton)

    await buttons[0].vm.$emit('click')
    await buttons[1].vm.$emit('click')
    await buttons[2].vm.$emit('click')
    await buttons[3].vm.$emit('click')
    await buttons[4].vm.$emit('click')
    await buttons[5].vm.$emit('click')
    await buttons[6].vm.$emit('click')

    expect(wrapper.emitted('validate-sw')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('validate-sw-ex')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('validate-fc')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('approve')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('approve-excise')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('clear-check-status')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('check-for-duplicate')?.[0]).toEqual([defaultProps.values])
  })

  it('passes disabled state to each action button except clear-check-status', () => {
    const wrapper = createWrapper({ disabled: true })
    const buttons = wrapper.findAllComponents(ActionButton)

    // button order: validate-sw, validate-sw-ex, validate-fc, approve, approve-excise, clear-check-status, check-for-duplicate
    // All buttons except clear-check-status (index 5) use the disabled prop
    expect(buttons[0].props('disabled')).toBe(true)
    expect(buttons[1].props('disabled')).toBe(true)
    expect(buttons[2].props('disabled')).toBe(true)
    expect(buttons[3].props('disabled')).toBe(true)
    expect(buttons[4].props('disabled')).toBe(true)
    // clear-check-status uses clearCheckStatusDisabled (defaults to false)
    expect(buttons[5].props('disabled')).toBe(false)
    expect(buttons[6].props('disabled')).toBe(true)
  })

  it('disables clear-check-status button via clearCheckStatusDisabled prop', () => {
    const wrapper = createWrapper({ clearCheckStatusDisabled: true })
    const buttons = wrapper.findAllComponents(ActionButton)

    // Only clear-check-status (index 5) should be disabled
    expect(buttons[0].props('disabled')).toBe(false)
    expect(buttons[5].props('disabled')).toBe(true)
    expect(buttons[6].props('disabled')).toBe(false)
  })

  it('disables all buttons when disabled and clearCheckStatusDisabled are both true', () => {
    const wrapper = createWrapper({ disabled: true, clearCheckStatusDisabled: true })

    wrapper.findAllComponents(ActionButton).forEach((button) => {
      expect(button.props('disabled')).toBe(true)
    })
  })

  it('enables clear-check-status when disabled is true but clearCheckStatusDisabled is false', () => {
    const wrapper = createWrapper({ disabled: true, clearCheckStatusDisabled: false })
    const buttons = wrapper.findAllComponents(ActionButton)

    // All other buttons disabled
    expect(buttons[0].props('disabled')).toBe(true)
    expect(buttons[1].props('disabled')).toBe(true)
    expect(buttons[2].props('disabled')).toBe(true)
    expect(buttons[3].props('disabled')).toBe(true)
    expect(buttons[4].props('disabled')).toBe(true)
    // clear-check-status enabled
    expect(buttons[5].props('disabled')).toBe(false)
    expect(buttons[6].props('disabled')).toBe(true)
  })

  it('shows bookmark icon for inherited stopwords status', () => {
    const wrapper = createWrapper({ item: { ...defaultProps.item, checkStatus: 128 } })

    expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).exists()).toBe(true)
  })

  it('hides stopword info section when there is no info text', () => {
    const wrapper = createWrapper({ checkStatusInfo: '' })

    expect(wrapper.find('.stopwords-info').exists()).toBe(false)
    expect(wrapper.find('.stopwords-info-approved').exists()).toBe(false)
  })

  it('shows stopword info with issue styling when issues exist', () => {
    const wrapper = createWrapper({ checkStatusInfo: 'Проблема с кодом', hasCheckStatusIssues: true })

    expect(wrapper.find('.stopwords-info').exists()).toBe(true)
    expect(wrapper.find('.stopwords-text').text()).toContain('Проблема с кодом')
  })

  it('shows approved styling when no issues exist', () => {
    const wrapper = createWrapper({ checkStatusInfo: 'Проверка пройдена', hasCheckStatusIssues: false })

    expect(wrapper.find('.stopwords-info-approved').exists()).toBe(true)
    expect(wrapper.find('.stopwords-text-approved').text()).toContain('Проверка пройдена')
  })

  it('renders empty last-view when dTime is missing', () => {
    const wrapper = createWrapper({ item: { ...defaultProps.item, dTime: null } })

    expect(wrapper.find('#lastView').text()).toBe('')
  })

  it('disables only validate-sw-ex button when noHistoricData is true', () => {
    const wrapper = createWrapper({ noHistoricData: true, disabled: false })
    const buttons = wrapper.findAllComponents(ActionButton)

    // button order: validate-sw, validate-sw-ex, validate-fc, approve, approve-excise, clear-check-status, check-for-duplicate
    expect(buttons[0].props('disabled')).toBe(false)
    expect(buttons[1].props('disabled')).toBe(true)
    expect(buttons[2].props('disabled')).toBe(false)
    expect(buttons[3].props('disabled')).toBe(false)
    expect(buttons[4].props('disabled')).toBe(false)
    expect(buttons[5].props('disabled')).toBe(false)
    expect(buttons[6].props('disabled')).toBe(false)
  })

  it('disables all buttons when disabled, clearCheckStatusDisabled, and noHistoricData are true', () => {
    const wrapper = createWrapper({ noHistoricData: true, disabled: true, clearCheckStatusDisabled: true })
    const buttons = wrapper.findAllComponents(ActionButton)

    buttons.forEach((button) => {
      expect(button.props('disabled')).toBe(true)
    })
  })

  it('does not disable validate-sw-ex when noHistoricData is false', () => {
    const wrapper = createWrapper({ noHistoricData: false, disabled: false })
    const buttons = wrapper.findAllComponents(ActionButton)

    // validate-sw-ex (index 1) should not be disabled
    expect(buttons[1].props('disabled')).toBe(false)
  })
})
