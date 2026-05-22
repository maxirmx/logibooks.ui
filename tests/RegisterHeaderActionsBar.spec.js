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
    isSrLogistPlus: ref(true),
    isShiftLeadPlus: ref(true)
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

    const actionMenus = wrapper.findAllComponents(ActionButton2L)
    const invoiceMenu = actionMenus.find(
      (component) => component.props('tooltipText') === 'Сформировать инвойс-манифест'
    )
    expect(invoiceMenu).toBeTruthy()

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

    const actionMenus = wrapper.findAllComponents(ActionButton2L)
    const invoiceMenu = actionMenus.find(
      (component) => component.props('tooltipText') === 'Сформировать инвойс-манифест'
    )
    expect(invoiceMenu).toBeTruthy()

    const [allOption] = invoiceMenu.props('options')

    await allOption.action(baseProps.item)

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('emits xml export events when corresponding menu options are used', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    const actionMenus = wrapper.findAllComponents(ActionButton2L)
    const exportMenu = actionMenus.find(
      (component) => component.props('tooltipText') === 'Выгрузить XML накладные'
    )

    expect(exportMenu).toBeTruthy()

    const options = exportMenu.props('options')
    const ordinaryOption = options.find((option) => option.label === 'Без акциза и нотификаций')
    const exciseOption = options.find((option) => option.label === 'С акцизом')
    const notificationsOption = options.find((option) => option.label === 'С нотификациями')

    expect(ordinaryOption).toBeTruthy()
    expect(exciseOption).toBeTruthy()
    expect(notificationsOption).toBeTruthy()

    await ordinaryOption.action(baseProps.item)
    await exciseOption.action(baseProps.item)
    await notificationsOption.action(baseProps.item)

    expect(wrapper.emitted('export-ordinary')).toHaveLength(1)
    expect(wrapper.emitted('export-excise')).toHaveLength(1)
    expect(wrapper.emitted('export-notifications')).toHaveLength(1)
  })

  it('emits stop-word validation events when corresponding menu options are used', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    const actionMenus = wrapper.findAllComponents(ActionButton2L)
    const stopWordsMenu = actionMenus.find(
      (component) => component.props('tooltipText') === 'Проверить по стоп-словам'
    )

    expect(stopWordsMenu).toBeTruthy()
    expect(stopWordsMenu.props('icon')).toBe('fa-solid fa-spell-check')

    const [historicOption, ordinaryOption] = stopWordsMenu.props('options')

    await ordinaryOption.action(baseProps.item)
    await historicOption.action(baseProps.item)

    expect(wrapper.emitted('validate-sw')).toHaveLength(1)
    expect(wrapper.emitted('validate-sw-ex')).toHaveLength(1)
  })

  it('disables historic data actions when noHistoricData is true', () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, noHistoricData: true },
      global: { stubs: vuetifyStubs }
    })

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const actionMenus = wrapper.findAllComponents(ActionButton2L)
    const getButtonByTooltip = (tooltipText) =>
      actionButtons.find((button) => button.props('tooltipText') === tooltipText)
    const getMenuByTooltip = (tooltipText) =>
      actionMenus.find((button) => button.props('tooltipText') === tooltipText)

    const stopWords = getMenuByTooltip('Проверить по стоп-словам')
    const lookupHistoric = getButtonByTooltip(
      'Подбор кодов ТН ВЭД с учётом исторических данных'
    )

    expect(stopWords).toBeTruthy()
    expect(lookupHistoric).toBeTruthy()

    expect(stopWords.props('disabled')).toBe(false)
    expect(stopWords.props('options')[0].disabled).toBe(true)
    expect(stopWords.props('options')[1].disabled).toBeUndefined()
    expect(lookupHistoric.props('disabled')).toBe(true)
  })

  it('emits freeze tn ved order action from the same group as close', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const freezeCheckStatusButton = actionButtons.find(
      (button) => button.props('tooltipText') === 'Применить запреты'
    )
    const freezeButton = actionButtons.find(
      (button) => button.props('tooltipText') === 'Зафиксировать сортировку по кодам ТН ВЭД'
    )
    const closeButton = actionButtons.find(
      (button) => button.props('tooltipText') === 'Закрыть'
    )

    expect(freezeCheckStatusButton).toBeTruthy()
    expect(freezeButton).toBeTruthy()
    expect(closeButton).toBeTruthy()
    expect(actionButtons.indexOf(freezeCheckStatusButton)).toBeLessThan(
      actionButtons.indexOf(freezeButton)
    )

    freezeCheckStatusButton.vm.$emit('click')
    expect(wrapper.emitted('freeze-check-status')).toHaveLength(1)

    freezeButton.vm.$emit('click')
    expect(wrapper.emitted('freeze-tnved-order')).toHaveLength(1)
  })
})
