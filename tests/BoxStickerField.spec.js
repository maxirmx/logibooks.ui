/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import BoxStickerField from '@/components/BoxStickerField.vue'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
const company = { companyId: 2 }
const box = { id: 8, ...company, boxSticker: '$1:1:4542503776:362877', printableTemplates: ['WBR_BOX'] }
const stubs = { ActionButton: { props: ['disabled', 'ariaLabel'], emits: ['click'], template: `<button :disabled="disabled" :aria-label="ariaLabel" @click="$emit('click')" />` } }

describe('saved box sticker', () => {
  it.each([
    [{ companyId: 2 }, true],
    [{ companyId: 2, registerType: 1 }, true],
    [{ companyId: 2, registerType: 2 }, true],
    [{ companyId: 2, registerType: 2097154 }, true],
    [{ companyId: 1, registerType: 2 }, false],
    [{ companyId: 1, registerType: 2097154 }, false],
    [{ registerType: 2 }, false],
    [{ registerType: 2097154 }, false],
    [{ companyId: '2' }, false],
    [{ companyId: 2097154 }, false],
    [{}, false],
    [null, false],
    [undefined, false]
  ])('always shows the print button and enables it only for the WBR company ID: %j', async (value, enabled) => {
    const print = vi.fn()
    const wrapper = mount(BoxStickerField, { props: { box: { ...box, companyId: undefined, ...value } }, global: {
      provide: { [LABEL_PRINTING_KEY]: { print, busy: ref(false) } }, stubs
    } })
    const button = wrapper.get('button')
    expect(wrapper.get('[data-testid="box-sticker-field"]').isVisible()).toBe(true)
    expect(button.element.disabled).toBe(!enabled)
    await button.trigger('click')
    expect(print).toHaveBeenCalledTimes(enabled ? 1 : 0)
    wrapper.unmount()
  })
  it.each([
    { boxSticker: null },
    { boxSticker: '' },
    { boxSticker: '  \t  ' },
    { printableTemplates: [] },
    { printableTemplates: undefined },
    { printableTemplates: ['WBRN'] },
    { id: 0 },
    { id: undefined },
    { bucketIndex: 0 },
    { area: 2 },
    { area: 3 }
  ])('keeps unavailable or nonphysical box print buttons visible and disabled: %j', async (value) => {
    const print = vi.fn()
    const wrapper = mount(BoxStickerField, { props: { box: { ...box, ...value } }, global: {
      provide: { [LABEL_PRINTING_KEY]: { print, busy: ref(false) } }, stubs
    } })
    expect(wrapper.get('button').isVisible()).toBe(true)
    expect(wrapper.get('button').element.disabled).toBe(true)
    await wrapper.get('button').trigger('click')
    expect(print).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('prints by box identity and follows busy and loading state', async () => {
    const print = vi.fn(), busy = ref(false)
    const wrapper = mount(BoxStickerField, { props: { box }, global: {
      provide: { [LABEL_PRINTING_KEY]: { print, busy } }, stubs
    } })
    expect(wrapper.get('.label').text()).toBe('Код стикера:')
    expect(wrapper.text()).toContain(box.boxSticker)
    expect(wrapper.get('button').attributes('aria-label')).toBe('Печать стикера')
    await wrapper.get('button').trigger('click')
    expect(print).toHaveBeenCalledWith({ boxId: 8, template: 'WBR_BOX' })
    busy.value = true; await flushPromises()
    expect(wrapper.get('button').element.disabled).toBe(true)
    await wrapper.get('button').trigger('click')
    expect(print).toHaveBeenCalledTimes(1)
    busy.value = false
    await wrapper.setProps({ disabled: true })
    expect(wrapper.get('button').element.disabled).toBe(true)
    await wrapper.get('button').trigger('click')
    expect(print).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ box: { boxId: 7, area: 1, boxSticker: box.boxSticker, printableTemplates: ['WBR_BOX'] }, company, disabled: false, showLabel: false })
    await wrapper.get('button').trigger('click')
    expect(print).toHaveBeenLastCalledWith({ boxId: 7, template: 'WBR_BOX' })
    expect(wrapper.find('.label').exists()).toBe(false)
    await wrapper.setProps({ box: { boxId: 7 }, company, showLabel: true })
    expect(wrapper.text()).toContain('—')
    expect(wrapper.get('button').element.disabled).toBe(true)
    wrapper.unmount()
  })
  it('keeps the print button visible and disabled without a printing provider', () => {
    const wrapper = mount(BoxStickerField, { props: { box }, global: { stubs } })
    expect(wrapper.text()).toContain(box.boxSticker)
    expect(wrapper.get('button').isVisible()).toBe(true)
    expect(wrapper.get('button').element.disabled).toBe(true)
    wrapper.unmount()
  })
})
