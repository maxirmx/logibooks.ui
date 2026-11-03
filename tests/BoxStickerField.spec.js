/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import BoxStickerField from '@/components/BoxStickerField.vue'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
const company = { companyId: 2 }
const box = { id: 8, ...company, boxSticker: '$1:1:4542503776:362877', printableTemplates: ['WBR_BOX'] }
const stubs = { ActionButton: { props: ['disabled', 'ariaLabel'], emits: ['click'], template: `<button :disabled="disabled" :aria-label="ariaLabel" @click="$emit('click')" />` } }

describe('saved box sticker', () => {
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
})
