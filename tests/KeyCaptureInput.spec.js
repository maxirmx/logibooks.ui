/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KeyCaptureInput from '@/components/KeyCaptureInput.vue'

const fontAwesomeStub = {
  template: '<i class="fa-icon"></i>'
}

describe('KeyCaptureInput.vue', () => {
  it('renders with placeholder when modelValue is empty', () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Нажмите клавишу...')
    expect(input.element.value).toBe('')
  })

  it('renders with custom placeholder', () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '', placeholder: 'Custom placeholder' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Custom placeholder')
  })

  it('renders with existing value', () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: 'F1' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    expect(input.element.value).toBe('F1')
  })

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

  it('captures letter keys with correct code', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    await input.trigger('keydown', { code: 'KeyA', key: 'a' })

    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['KeyA'])
  })

  it('captures Enter key', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    await input.trigger('keydown', { code: 'Enter', key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['Enter'])
  })

  it('ignores modifier-only keys (Shift)', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    await input.trigger('keydown', { code: 'ShiftLeft', key: 'Shift' })

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
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

  it('ignores modifier-only keys (Alt)', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    await input.trigger('keydown', { code: 'AltLeft', key: 'Alt' })

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('ignores modifier-only keys (Meta)', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    await input.trigger('keydown', { code: 'MetaLeft', key: 'Meta' })

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('shows clear button when value exists', () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: 'F1' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const clearButton = wrapper.find('.clear-button')
    expect(clearButton.exists()).toBe(true)
  })

  it('hides clear button when value is empty', () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const clearButton = wrapper.find('.clear-button')
    expect(clearButton.exists()).toBe(false)
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

  it('disables input when disabled prop is true', () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: 'F1', disabled: true },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('hides clear button when disabled', () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: 'F1', disabled: true },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const clearButton = wrapper.find('.clear-button')
    expect(clearButton.exists()).toBe(false)
  })

  it('applies is-disabled class when disabled', () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '', disabled: true },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    expect(wrapper.find('.key-capture-input').classes()).toContain('is-disabled')
  })

  it('applies is-focused class when focused', async () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    await input.trigger('focus')

    expect(wrapper.find('.key-capture-input').classes()).toContain('is-focused')
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

  it('input is readonly to prevent text entry', () => {
    const wrapper = mount(KeyCaptureInput, {
      props: { modelValue: '' },
      global: { stubs: { 'font-awesome-icon': fontAwesomeStub } }
    })

    const input = wrapper.find('input')
    expect(input.attributes('readonly')).toBeDefined()
  })
})
