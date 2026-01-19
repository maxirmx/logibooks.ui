import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { ref } from 'vue'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const pushMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock
  }),
  createRouter: () => ({
    // minimal router stub
    push: () => {},
    replace: () => {},
    beforeEach: () => {},
    afterEach: () => {}
  }),
  createWebHistory: () => ({})
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    hasLogistRole: ref(true),
    isSrLogistPlus: ref(true)
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

    const [allOption, withExciseOption, withNotificationsOption, withoutExciseOption] = invoiceMenu.props('options')

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

    await withNotificationsOption.action(baseProps.item)
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Настройки инвойса',
      params: { id: baseProps.item.id },
      query: { selection: InvoiceParcelSelection.WithNotifications }
    })

    pushMock.mockClear()

    await withoutExciseOption.action(baseProps.item)
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Настройки инвойса',
      params: { id: baseProps.item.id },
      query: { selection: InvoiceParcelSelection.Ordinal }
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

  it('disables historic data actions when noHistoricData is true', () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, noHistoricData: true },
      global: { stubs: vuetifyStubs }
    })

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const getButtonByTooltip = (tooltipText) =>
      actionButtons.find((button) => button.props('tooltipText') === tooltipText)

    const stopWordsHistoric = getButtonByTooltip(
      'Проверить по стоп-словам с учётом исторических данных'
    )
    const lookupHistoric = getButtonByTooltip(
      'Подбор кодов ТН ВЭД с учётом исторических данных'
    )
    const stopWords = getButtonByTooltip('Проверить по стоп-словам')

    expect(stopWordsHistoric).toBeTruthy()
    expect(lookupHistoric).toBeTruthy()
    expect(stopWords).toBeTruthy()

    expect(stopWordsHistoric.props('disabled')).toBe(true)
    expect(lookupHistoric.props('disabled')).toBe(true)
    expect(stopWords.props('disabled')).toBe(false)
  })
})
