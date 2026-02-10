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
    expect(wrapper.findAllComponents(ActionButton)).toHaveLength(5)
  })

  it('renders current check status and computed class', () => {
    const wrapper = createWrapper()

    const checkStatusCell = wrapper.find('#checkStatus')
    expect(checkStatusCell.classes()).toContain('check-status-warning')
    expect(defaultProps.getCheckStatusClass).toHaveBeenCalledWith(defaultProps.item.checkStatus)
  })

  it('emits status-change with parsed integer when status changes', async () => {
    const wrapper = createWrapper()

    await wrapper.find('#statusId').setValue('1')

    expect(wrapper.emitted('status-change')).toEqual([[1]])
  })

  it('emits all action events with form values payload', async () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAllComponents(ActionButton)

    await buttons[0].vm.$emit('click')
    await buttons[1].vm.$emit('click')
    await buttons[2].vm.$emit('click')
    await buttons[3].vm.$emit('click')
    await buttons[4].vm.$emit('click')

    expect(wrapper.emitted('validate-sw')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('validate-sw-ex')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('validate-fc')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('approve')?.[0]).toEqual([defaultProps.values])
    expect(wrapper.emitted('approve-excise')?.[0]).toEqual([defaultProps.values])
  })

  it('passes disabled state to each action button', () => {
    const wrapper = createWrapper({ disabled: true })

    wrapper.findAllComponents(ActionButton).forEach((button) => {
      expect(button.props('disabled')).toBe(true)
    })
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
})
