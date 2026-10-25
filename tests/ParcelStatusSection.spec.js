// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ParcelStatusSection from '@/components/ParcelStatusSection.vue'
import ActionButton from '@/components/ActionButton.vue'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { getCheckStatusInfo } from '@/helpers/parcels.check.helpers.js'

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

  it('exposes the full selected status and leaves the checkbox out for unknown country', () => {
    const wrapper = createWrapper({ values: { statusId: 999 } })
    expect(wrapper.get('[name="statusId"]').attributes('title')).toBe('')
    expect(wrapper.find('[name="dangerousGoods"]').exists()).toBe(false)
    wrapper.unmount()
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

    // button order: validate-sw, validate-sw-ex, validate-fc, clear-check-status, check-for-duplicate, approve, approve-excise
    // All buttons except clear-check-status (index 3) use the disabled prop
    expect(buttons[0].props('disabled')).toBe(true)
    expect(buttons[1].props('disabled')).toBe(true)
    expect(buttons[2].props('disabled')).toBe(true)
    // clear-check-status uses clearCheckStatusDisabled (defaults to false)
    expect(buttons[3].props('disabled')).toBe(false)
    expect(buttons[4].props('disabled')).toBe(true)
    expect(buttons[5].props('disabled')).toBe(true)
    expect(buttons[6].props('disabled')).toBe(true)
  })

  it('shows bookmark icon for inherited stopwords status', () => {
    const wrapper = createWrapper({ item: { ...defaultProps.item, checkStatus: 128 } })

    expect(wrapper.findComponent({ name: 'FontAwesomeIcon' }).exists()).toBe(true)
  })

  it('renders matched stop words without route-scope explanations', () => {
    const checkStatusInfo = getCheckStatusInfo(
      { stopWordIds: [1] },
      [],
      [
        {
          id: 1,
          word: 'браслет',
          scopes: [
            {
              countryIsoNumeric: 643,
              customsProcedureCode: 10,
              explanation: '971 приказ ФТС - акция'
            }
          ]
        }
      ],
      []
    )
    const wrapper = createWrapper({ checkStatusInfo })

    expect(wrapper.find('.stopwords-text').text()).toBe("Стоп-слова и фразы: 'браслет'")
    expect(wrapper.text()).not.toContain('971 приказ ФТС - акция')
  })

  it('shows approved styling when no issues exist', () => {
    const wrapper = createWrapper({
      checkStatusInfo: 'Проверка пройдена',
      hasCheckStatusIssues: false
    })

    expect(wrapper.find('.stopwords-info-approved').exists()).toBe(true)
    expect(wrapper.find('.stopwords-text-approved').text()).toContain('Проверка пройдена')
  })

  it('shows Duplicate2 styling for check status info', () => {
    const wrapper = createWrapper({
      item: { ...defaultProps.item, checkStatus: CheckStatusCode.Duplicate2.value },
      checkStatusInfo: 'Найден дубликат',
      hasCheckStatusIssues: false
    })

    expect(wrapper.find('.stopwords-info-duplicate2').exists()).toBe(true)
    expect(wrapper.find('.stopwords-info-approved').exists()).toBe(false)
    expect(wrapper.find('.stopwords-text-duplicate2').text()).toContain('Найден дубликат')
  })

  it('disables only restriction validations and explains the missing route country', async () => {
    const wrapper = createWrapper({ restrictionValidationDisabled: true })
    const buttons = wrapper.findAllComponents(ActionButton)

    expect(buttons.slice(0, 3).every((button) => button.props('disabled'))).toBe(true)
    expect(buttons.slice(0, 3).every((button) =>
      button.props('tooltipText').includes('страну отправления или назначения')
    )).toBe(true)
    expect(buttons.slice(3).every((button) => !button.props('disabled'))).toBe(true)

    await buttons[0].find('button').trigger('click')
    await buttons[1].find('button').trigger('click')
    await buttons[2].find('button').trigger('click')
    expect(wrapper.emitted('validate-sw')).toBeUndefined()
    expect(wrapper.emitted('validate-sw-ex')).toBeUndefined()
    expect(wrapper.emitted('validate-fc')).toBeUndefined()
  })

})
