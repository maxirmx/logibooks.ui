import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import ActionButton from '@/components/ActionButton.vue'
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

  it('navigates to invoice settings when invoice action button is clicked', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    const actionButtons = wrapper.findAllComponents(ActionButton)
    expect(actionButtons.length).toBeGreaterThan(0)

    const invoiceButton = actionButtons.find(
      (btn) => btn.props('icon') === 'fa-solid fa-file-invoice'
    )
    expect(invoiceButton).toBeTruthy()

    const invoiceButtonElement = invoiceButton.find('button')
    expect(invoiceButtonElement.exists()).toBe(true)

    await invoiceButtonElement.trigger('click')

    expect(pushMock).toHaveBeenCalledWith({
      name: 'Настройки инвойса',
      params: { id: baseProps.item.id }
    })
  })

  it('does not navigate when disabled', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, disabled: true },
      global: { stubs: vuetifyStubs }
    })

    const invoiceButton = wrapper
      .findAllComponents(ActionButton)
      .find((btn) => btn.props('icon') === 'fa-solid fa-file-invoice')

    expect(invoiceButton).toBeTruthy()

    const invoiceButtonElement = invoiceButton.find('button')
    expect(invoiceButtonElement.exists()).toBe(true)

    await invoiceButtonElement.trigger('click')

    expect(pushMock).not.toHaveBeenCalled()
  })
})
