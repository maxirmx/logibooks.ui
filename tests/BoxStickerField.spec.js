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
    { id: 0, printableTemplates: ['OZON_BOX'] },
    { bucketIndex: 3, printableTemplates: ['OZON_BOX'] },
    { area: 2, printableTemplates: ['OZON_BOX'] },
    { area: 3, printableTemplates: ['OZON_BOX'] },
    { companyId: 1, printableTemplates: ['UNKNOWN'] },
    { companyId: 1 },
    { printableTemplates: undefined }
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

it.each([
  { id: 8, companyId: 1 },
  { boxId: 8, area: 1 }
])('prints an advertised Ozon box from register rows and monitor rows', async (target) => {
  const print = vi.fn()
  const busy = ref(true)
  const wrapper = mount(BoxStickerField, {
    props: { box: { ...target, boxSticker: '%301%751643161580', printableTemplates: ['OZON_BOX'] } },
    global: { provide: { [LABEL_PRINTING_KEY]: { print, busy } }, stubs }
  })
  expect(wrapper.get('button').element.disabled).toBe(true)
  busy.value = false
  await wrapper.vm.$nextTick()
  expect(wrapper.get('button').element.disabled).toBe(false)
  await wrapper.get('button').trigger('click')
  expect(print).toHaveBeenCalledExactlyOnceWith({ boxId: 8, template: 'OZON_BOX' })
  wrapper.unmount()
})
