import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RegisterCurrencySelectionDialog from '@/l2/RegisterCurrencySelectionDialog.vue'
import { defaultGlobalStubs } from './helpers/test-utils.js'

const VDialogStub = {
  props: ['width'],
  template: '<div class="v-dialog-stub"><slot></slot></div>'
}

describe('RegisterCurrencySelectionDialog', () => {
  it('requires an explicit selection and emits the selected currency', async () => {
    const wrapper = mount(RegisterCurrencySelectionDialog, {
      props: {
        show: true,
        currencies: ['USD', 'UZS']
      },
      global: {
        stubs: {
          ...defaultGlobalStubs,
          'v-dialog': VDialogStub
        }
      }
    })

    expect(wrapper.text()).toContain('В реестре несколько валют')
    expect(wrapper.text()).toContain('Посылки в других валютах будут пропущены')
    expect(wrapper.vm.selectedCurrency).toBeNull()
    expect(wrapper.findComponent(VDialogStub).props('width')).toBe(440)
    expect(wrapper.findAll('.radio-styled')).toHaveLength(2)
    expect(wrapper.findAll('.radio-mark')).toHaveLength(2)
    expect(
      wrapper.findAll('input[type="radio"]').map((radio) => radio.attributes('value'))
    ).toEqual(['USD', 'UZS'])

    wrapper.vm.selectedCurrency = 'UZS'
    await nextTick()
    wrapper.vm.confirmSelection()

    expect(wrapper.emitted('select')).toEqual([['UZS']])
    wrapper.unmount()
  })

  it('emits cancel on Escape', async () => {
    const wrapper = mount(RegisterCurrencySelectionDialog, {
      props: {
        show: true,
        currencies: ['USD', 'UZS']
      },
      attachTo: document.body,
      global: { stubs: defaultGlobalStubs }
    })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await nextTick()

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
  })
})
