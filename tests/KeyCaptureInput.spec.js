/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KeyCaptureInput from '@/components/KeyCaptureInput.vue'

const fontAwesomeStub = {
  template: '<i class="fa-icon"></i>'
}

describe('KeyCaptureInput.vue', () => {
  it('captures keydown and emits update:modelValue', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    await input.trigger('keydown', { code: 'F1', key: 'F1' })

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['F1'])
  })

  it('ignores modifier-only keys (Control)', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    await input.trigger('keydown', { code: 'ControlLeft', key: 'Control' })

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('clears value when clear button is clicked', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: 'F1' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const clearButton = wrapper.find('.clear-button')
    await clearButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([''])
  })

  it('removes is-focused class when blurred', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.trigger('blur')

    expect(wrapper.find('.key-capture-input').classes()).not.toContain('is-focused')
  })

})
