import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import PassportNumberWithActions from '@/components/PassportNumberWithActions.vue'

const actionButtonStub = {
  props: ['icon', 'tooltipText', 'disabled'],
  emits: ['click'],
  template: `
    <button
      type="button"
      :data-icon="icon"
      :data-tooltip="tooltipText"
      :disabled="disabled"
      @click="$emit('click')"
    />
  `
}

const fieldStub = {
  props: ['name', 'id', 'class', 'disabled'],
  computed: {
    classes() {
      return this.class
    }
  },
  template: '<input :name="name" :id="id" :class="classes" :disabled="disabled" />'
}

const tooltipStub = {
  props: ['text', 'disabled'],
  template: '<span :data-text="text" :data-disabled="String(disabled)"><slot name="activator" :props="{ title: text }"></slot><slot /></span>'
}

const fontAwesomeIconStub = {
  props: ['icon'],
  template: '<i :data-icon="icon" v-bind="$attrs"></i>'
}

function mountComponent(props = {}) {
  return mount(PassportNumberWithActions, {
    props: {
      label: 'Номер паспорта',
      errors: {},
      statuses: [
        { value: 0, code: 'NotChecked', name: 'Не проверен' },
        { value: 20, code: 'Checked', name: 'Проверен' }
      ],
      statusValue: 20,
      ...props
    },
    global: {
      stubs: {
        ActionButton: actionButtonStub,
        Field: fieldStub,
        'font-awesome-icon': fontAwesomeIconStub,
        'v-tooltip': tooltipStub
      }
    }
  })
}

describe('PassportNumberWithActions', () => {
  it('renders the passport field indicator and local check actions', async () => {
    const wrapper = mountComponent({ showActions: true })

    expect(wrapper.text()).toContain('Номер паспорта:')
    expect(wrapper.get('input[name="passportNumber"]').classes()).toContain('input')
    const icon = wrapper.get('[data-testid="passport-check-status-icon"]')
    expect(icon.attributes('data-icon')).toBe('fa-solid fa-circle-check')
    expect(icon.classes()).toEqual(expect.arrayContaining([
      'passport-check-status__icon--color-no-issues'
    ]))

    const buttons = wrapper.findAll('button')
    expect(buttons.map(button => button.attributes('data-tooltip'))).toEqual(['Проверить', 'Очистить'])
    expect(buttons.map(button => button.attributes('data-icon'))).toEqual(['fa-solid fa-passport', 'fa-solid fa-broom'])

    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('check')).toHaveLength(1)
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('hides indicator and buttons when passport actions are unavailable', () => {
    const wrapper = mountComponent({ showActions: false })

    expect(wrapper.find('[data-testid="passport-check-status-icon"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="passport-check-actions"]').exists()).toBe(false)
    expect(wrapper.get('input[name="passportNumber"]').exists()).toBe(true)
  })

  it('disables the passport field and suppresses local actions when disabled', async () => {
    const wrapper = mountComponent({ showActions: true, disabled: true })

    expect(wrapper.get('input[name="passportNumber"]').element.disabled).toBe(true)

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    buttons.forEach((button) => {
      expect(button.element.disabled).toBe(true)
    })

    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('check')).toBeUndefined()
    expect(wrapper.emitted('clear')).toBeUndefined()
  })
})
