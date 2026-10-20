/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import BoxStickerField from '@/components/BoxStickerField.vue'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
const company = { companyId: 2 }
const box = { id: 8, ...company, wbrSticker: '$1:1:4542503776:362877', printableTemplates: ['WBR_BOX'] }
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
  ])('shows the sticker solely for the WBR company ID: %j', (value, expected) => {
    const wrapper = mount(BoxStickerField, { props: { box: { id: 8, ...value } }, global: { stubs } })
    expect(wrapper.find('[data-testid="box-sticker-field"]').exists()).toBe(expected)
    wrapper.unmount()
  })
  it('prints by box identity and follows server capabilities and busy state', async () => {
    const print = vi.fn(), busy = ref(false)
    const wrapper = mount(BoxStickerField, { props: { box }, global: {
      provide: { [LABEL_PRINTING_KEY]: { print, busy } }, stubs
    } })
    expect(wrapper.get('.label').text()).toBe('Стикер:')
    expect(wrapper.text()).toContain(box.wbrSticker)
    expect(wrapper.get('button').attributes('aria-label')).toBe('Печать стикера коробки')
    await wrapper.get('button').trigger('click')
    expect(print).toHaveBeenCalledWith({ boxId: 8, template: 'WBR_BOX' })
    busy.value = true; await flushPromises()
    expect(wrapper.get('button').element.disabled).toBe(true)
    busy.value = false
    await wrapper.setProps({ disabled: true })
    expect(wrapper.get('button').element.disabled).toBe(true)
    await wrapper.setProps({ box: { boxId: 7, area: 1, wbrSticker: box.wbrSticker, printableTemplates: ['WBR_BOX'] }, company, disabled: false, showLabel: false })
    await wrapper.get('button').trigger('click')
    expect(print).toHaveBeenLastCalledWith({ boxId: 7, template: 'WBR_BOX' })
    expect(wrapper.find('.label').exists()).toBe(false)
    await wrapper.setProps({ box: { boxId: 7 }, company, showLabel: true })
    expect(wrapper.text()).toContain('—')
    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  })
  it('supports missing printing configuration and excludes nonphysical boxes', async () => {
    const wrapper = mount(BoxStickerField, { props: { box, company }, global: { stubs } })
    expect(wrapper.text()).toContain(box.wbrSticker)
    expect(wrapper.find('button').exists()).toBe(false)
    for (const candidate of [{}, { id: 0 }, { boxId: 9, bucketIndex: 0 }, { boxId: 9, area: 2 }, { boxId: 9, area: 3 }]) {
      await wrapper.setProps({ box: candidate })
      expect(wrapper.find('[data-testid="box-sticker-field"]').exists()).toBe(false)
    }
    wrapper.unmount()
  })
})
