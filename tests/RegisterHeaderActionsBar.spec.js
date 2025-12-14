import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import { ActionButton, ActionButton2L } from '@sw-consulting/tooling.ui.kit'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const pushMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock
  })
}))

describe('RegisterHeaderActionsBar', () => {
  const baseProps = {
    item: { id: 1, invoiceNumber: 'INV-1' },
    disabled: false,
    iconSize: '1x'
  }

  beforeEach(() => {
    pushMock.mockClear()
  })

  it('navigates to invoice settings with selected scope when invoice action option is used', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    const actionButtons = wrapper.findAllComponents(ActionButton)
    expect(actionButtons.length).toBeGreaterThan(0)

    const invoiceMenu = wrapper.findComponent(ActionButton2L)
    expect(invoiceMenu.exists()).toBe(true)

    const [allOption, withExciseOption, withoutExciseOption] = invoiceMenu.props('options')

    await allOption.action(baseProps.item)
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Настройки инвойса',
      params: { id: baseProps.item.id },
      query: { selection: InvoiceParcelSelection.All }
    })

    pushMock.mockClear()

    await withExciseOption.action(baseProps.item)
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Настройки инвойса',
      params: { id: baseProps.item.id },
      query: { selection: InvoiceParcelSelection.WithExcise }
    })

    pushMock.mockClear()

    await withoutExciseOption.action(baseProps.item)
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Настройки инвойса',
      params: { id: baseProps.item.id },
      query: { selection: InvoiceParcelSelection.WithoutExcise }
    })
  })

  it('does not navigate when disabled', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, disabled: true },
      global: { stubs: vuetifyStubs }
    })

    const invoiceMenu = wrapper.findComponent(ActionButton2L)
    expect(invoiceMenu.exists()).toBe(true)

    const [allOption] = invoiceMenu.props('options')

    await allOption.action(baseProps.item)

    expect(pushMock).not.toHaveBeenCalled()
  })
})
