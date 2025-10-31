import { mount } from '@vue/test-utils'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { vuetifyStubs } from './helpers/test-utils.js'

describe('RegisterHeaderActionsBar', () => {
  const baseProps = {
    item: { id: 1, invoiceNumber: 'INV-1' },
    disabled: false,
    iconSize: '1x'
  }

  it('renders ActionButton2L and emits download-invoice events when options selected', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    // Find ActionButton2L
    const ab2l = wrapper.findComponent(ActionButton2L)
    expect(ab2l.exists()).toBe(true)

    // Click the main button to open menu
    const button = ab2l.find('button')
    await button.trigger('click')

    // Menu should be present
    const menu = ab2l.find('ul.action-button-2l__menu')
    expect(menu.exists()).toBe(true)

    const items = menu.findAll('button.action-button-2l__menu-item')
    expect(items.length).toBeGreaterThanOrEqual(3)

    // Click first option: 'Все'
    await items[0].trigger('click')
    expect(wrapper.emitted('download-invoice')).toBeTruthy()
    const arg0 = wrapper.emitted('download-invoice')[0][0]
    expect(arg0).toEqual(baseProps.item)

    // Open again and click second option: 'С акцизом'
    await button.trigger('click')
    const items2 = ab2l.findAll('button.action-button-2l__menu-item')
    await items2[1].trigger('click')
    expect(wrapper.emitted('download-invoice-excise')).toBeTruthy()
    const arg1 = wrapper.emitted('download-invoice-excise')[0][0]
    expect(arg1).toEqual(baseProps.item)

    // Open again and click third option: 'Без акциза'
    await button.trigger('click')
    const items3 = ab2l.findAll('button.action-button-2l__menu-item')
    await items3[2].trigger('click')
    expect(wrapper.emitted('download-invoice-without-excise')).toBeTruthy()
    const arg2 = wrapper.emitted('download-invoice-without-excise')[0][0]
    expect(arg2).toEqual(baseProps.item)
  })
})
