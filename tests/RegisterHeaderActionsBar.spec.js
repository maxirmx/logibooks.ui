import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { InvoiceParcelSelection } from '@/models/invoice.parcel.selection.js'
import {
  CUSTOMS_PROCEDURE_EXPORT,
  CUSTOMS_PROCEDURE_IMPORT,
  CUSTOMS_PROCEDURE_REEXPORT,
  CUSTOMS_PROCEDURE_REIMPORT,
  CUSTOMS_PROCEDURE_RETURN
} from '@/helpers/customs.procedure.helpers.js'
import { vuetifyStubs } from './helpers/test-utils.js'

const pushMock = vi.fn()
const authRefs = vi.hoisted(() => ({
  hasLogistRole: { __v_isRef: true, value: true },
  isSrLogistPlus: { __v_isRef: true, value: true },
  isShiftLeadPlus: { __v_isRef: true, value: true }
}))

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

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => store
  }
})

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authRefs
}))

describe('RegisterHeaderActionsBar', () => {
  const baseProps = {
    item: { id: 1, invoiceNumber: 'INV-1', customsProcedureCode: CUSTOMS_PROCEDURE_IMPORT },
    disabled: false,
    iconSize: '1x'
  }

  function findActionButtonByTooltip(wrapper, tooltipText) {
    return wrapper.findAllComponents(ActionButton).find(
      (button) => button.props('tooltipText') === tooltipText
    )
  }

  function findActionMenuByTooltip(wrapper, tooltipText) {
    return wrapper.findAllComponents(ActionButton2L).find(
      (component) => component.props('tooltipText') === tooltipText
    )
  }

  function optionPresentation(options) {
    return options.map(({ label, icon, color }) => ({ label, icon, color }))
  }

  beforeEach(() => {
    pushMock.mockClear()
    authRefs.hasLogistRole.value = true
    authRefs.isSrLogistPlus.value = true
    authRefs.isShiftLeadPlus.value = true
  })

  it('navigates to invoice settings with selected scope when invoice action option is used', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    const actionButtons = wrapper.findAllComponents(ActionButton)
    expect(actionButtons.length).toBeGreaterThan(0)

    const invoiceMenu = findActionMenuByTooltip(wrapper, 'Сформировать документы')
    expect(invoiceMenu).toBeTruthy()

    const [allOption, withExciseOption, withNotificationsOption, withoutExciseOption] = invoiceMenu.props('options')

    expect(invoiceMenu.props('icon')).toBe('fa-solid fa-file-invoice')
    expect(optionPresentation(invoiceMenu.props('options'))).toEqual([
      {
        label: 'инвойс-манифест (все)',
        icon: 'fa-solid fa-file-invoice',
        color: 'not-checked'
      },
      {
        label: 'инвойс-манифест (с акцизом)',
        icon: 'fa-solid fa-file-invoice',
        color: 'approved-with-excise'
      },
      {
        label: 'инвойс-манифест (с нотификациями)',
        icon: 'fa-solid fa-file-invoice',
        color: 'approved-with-notification'
      },
      {
        label: 'инвойс-манифест (без акциза и нотификаций)',
        icon: 'fa-solid fa-file-invoice',
        color: 'no-issues'
      },
      {
        label: 'реестр дополнительных изъятий',
        icon: 'fa-solid fa-person-circle-xmark',
        color: 'parcel-has-issues'
      },
      {
        label: 'тех. документацию (с акцизом)',
        icon: 'fa-solid fa-file-image',
        color: 'approved-with-excise'
      }
    ])

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

    const invoiceMenu = findActionMenuByTooltip(wrapper, 'Сформировать документы')
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

    const exportMenu = findActionMenuByTooltip(wrapper, 'Выгрузить XML накладные')

    expect(exportMenu).toBeTruthy()

    const options = exportMenu.props('options')
    const ordinaryOption = options.find((option) => option.label === 'Без акциза и нотификаций')
    const exciseOption = options.find((option) => option.label === 'С акцизом')
    const notificationsOption = options.find((option) => option.label === 'С нотификациями')

    expect(optionPresentation(options)).toEqual([
      {
        label: 'С акцизом',
        icon: 'fa-solid fa-upload',
        color: 'approved-with-excise'
      },
      {
        label: 'С нотификациями',
        icon: 'fa-solid fa-upload',
        color: 'approved-with-notification'
      },
      {
        label: 'Без акциза и нотификаций',
        icon: 'fa-solid fa-upload',
        color: 'no-issues'
      }
    ])

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

  it('emits merged document download actions and respects disabled state', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    const documentMenu = findActionMenuByTooltip(wrapper, 'Сформировать документы')
    const additionalRestrictionsOption = documentMenu.props('options').find(
      (option) => option.label === 'реестр дополнительных изъятий'
    )
    const techdocOption = documentMenu.props('options').find(
      (option) => option.label === 'тех. документацию (с акцизом)'
    )

    await additionalRestrictionsOption.action(baseProps.item)
    await techdocOption.action(baseProps.item)
    expect(wrapper.emitted('download-additional-restrictions')).toHaveLength(1)
    expect(wrapper.emitted('download-techdoc')).toHaveLength(1)

    const disabledWrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, disabled: true },
      global: { stubs: vuetifyStubs }
    })
    const disabledDocumentMenu = findActionMenuByTooltip(disabledWrapper, 'Сформировать документы')
    const disabledAdditionalRestrictionsOption = disabledDocumentMenu.props('options').find(
      (option) => option.label === 'реестр дополнительных изъятий'
    )
    const disabledTechdocOption = disabledDocumentMenu.props('options').find(
      (option) => option.label === 'тех. документацию (с акцизом)'
    )

    await disabledAdditionalRestrictionsOption.action(baseProps.item)
    await disabledTechdocOption.action(baseProps.item)
    expect(disabledWrapper.emitted('download-additional-restrictions')).toBeUndefined()
    expect(disabledWrapper.emitted('download-techdoc')).toBeUndefined()
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

  it('emits feacn lookup events when corresponding menu options are used', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    const actionMenus = wrapper.findAllComponents(ActionButton2L)
    const lookupMenu = actionMenus.find(
      (component) => component.props('tooltipText') === 'Подбор кодов ТН ВЭД'
    )

    expect(lookupMenu).toBeTruthy()
    expect(lookupMenu.props('icon')).toBe('fa-solid fa-magnifying-glass')

    const [historicOption, ordinaryOption] = lookupMenu.props('options')

    await ordinaryOption.action(baseProps.item)
    await historicOption.action(baseProps.item)

    expect(wrapper.emitted('lookup')).toHaveLength(1)
    expect(wrapper.emitted('lookup-ex')).toHaveLength(1)
  })

  it('emits custom charges calculation and parcel status bulk-change actions in order', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    const actionButtons = wrapper.findAllComponents(ActionButton)
    const calculateChargesButton = actionButtons.find(
      (button) => button.props('tooltipText') === 'Рассчитать сборы и пошлины'
    )
    const statusBulkButton = actionButtons.find(
      (button) => button.props('tooltipText') === 'Выбрать посылки и изменить статус'
    )

    expect(calculateChargesButton).toBeTruthy()
    expect(statusBulkButton).toBeTruthy()
    expect(calculateChargesButton.props('icon')).toBe('fa-solid fa-calculator')
    expect(statusBulkButton.props('icon')).toBe('fa-solid fa-pen-to-square')
    expect(actionButtons.indexOf(calculateChargesButton)).toBeLessThan(
      actionButtons.indexOf(statusBulkButton)
    )

    calculateChargesButton.vm.$emit('click')
    statusBulkButton.vm.$emit('click')

    expect(wrapper.emitted('calculate-customs-charges')).toHaveLength(1)
    expect(wrapper.emitted('bulk-change-parcel-status')).toHaveLength(1)
  })

  it('shows custom charges calculation for import and reimport procedures', () => {
    for (const customsProcedureCode of [CUSTOMS_PROCEDURE_IMPORT, CUSTOMS_PROCEDURE_REIMPORT]) {
      const wrapper = mount(RegisterHeaderActionsBar, {
        props: {
          ...baseProps,
          item: { ...baseProps.item, customsProcedureCode }
        },
        global: { stubs: vuetifyStubs }
      })

      expect(findActionButtonByTooltip(wrapper, 'Рассчитать сборы и пошлины')).toBeTruthy()
      wrapper.unmount()
    }
  })

  it('hides custom charges calculation for non-chargeable procedures', () => {
    const cases = [
      { title: 'missing procedure', item: { id: 1, invoiceNumber: 'INV-1' } },
      { title: 'null procedure', item: { ...baseProps.item, customsProcedureCode: null } },
      { title: 'return procedure', item: { ...baseProps.item, customsProcedureCode: CUSTOMS_PROCEDURE_RETURN } },
      { title: 'export procedure', item: { ...baseProps.item, customsProcedureCode: CUSTOMS_PROCEDURE_EXPORT } },
      { title: 'reexport procedure', item: { ...baseProps.item, customsProcedureCode: CUSTOMS_PROCEDURE_REEXPORT } }
    ]

    for (const testCase of cases) {
      const wrapper = mount(RegisterHeaderActionsBar, {
        props: {
          ...baseProps,
          item: testCase.item
        },
        global: { stubs: vuetifyStubs }
      })

      expect(findActionButtonByTooltip(wrapper, 'Рассчитать сборы и пошлины'), testCase.title).toBeUndefined()
      wrapper.unmount()
    }
  })

  it('hides custom charges calculation when sr logist permission is missing', () => {
    authRefs.isSrLogistPlus.value = false

    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })

    expect(findActionButtonByTooltip(wrapper, 'Рассчитать сборы и пошлины')).toBeUndefined()
  })

  it('disables historic data actions when noHistoricData is true', () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, noHistoricData: true },
      global: { stubs: vuetifyStubs }
    })

    const actionMenus = wrapper.findAllComponents(ActionButton2L)
    const getMenuByTooltip = (tooltipText) =>
      actionMenus.find((button) => button.props('tooltipText') === tooltipText)

    const stopWords = getMenuByTooltip('Проверить по стоп-словам')
    const lookup = getMenuByTooltip('Подбор кодов ТН ВЭД')

    expect(stopWords).toBeTruthy()
    expect(lookup).toBeTruthy()

    expect(stopWords.props('disabled')).toBe(false)
    expect(stopWords.props('options')[0].disabled).toBe(true)
    expect(stopWords.props('options')[1].disabled).toBeUndefined()
    expect(lookup.props('disabled')).toBe(false)
    expect(lookup.props('options')[0].disabled).toBe(true)
    expect(lookup.props('options')[1].disabled).toBeUndefined()
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
