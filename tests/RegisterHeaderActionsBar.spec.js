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
    item: {
      id: 1,
      invoiceNumber: 'INV-1',
      customsProcedureCode: CUSTOMS_PROCEDURE_IMPORT,
      theOtherCountryCode: 860
    },
    disabled: false,
    iconSize: '1x'
  }

  function findActionButtonByTooltip(wrapper, tooltipText) {
    return wrapper
      .findAllComponents(ActionButton)
      .find((button) => button.props('tooltipText') === tooltipText)
  }

  function findActionMenuByTooltip(wrapper, tooltipText) {
    return wrapper
      .findAllComponents(ActionButton2L)
      .find((component) => component.props('tooltipText') === tooltipText)
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

  it('keeps restriction actions visible but disabled when counterpart country is missing', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, item: { ...baseProps.item, theOtherCountryCode: null } },
      global: { stubs: vuetifyStubs }
    })

    const stopWords = findActionMenuByTooltip(
      wrapper,
      'Сначала укажите страну отправления или назначения реестра'
    )
    const feacn = findActionButtonByTooltip(
      wrapper,
      'Сначала укажите страну отправления или назначения реестра'
    )
    expect(stopWords).toBeTruthy()
    expect(feacn).toBeTruthy()
    expect(stopWords.props('disabled')).toBe(true)
    expect(feacn.props('disabled')).toBe(true)

    await stopWords.props('options')[0].action()
    await feacn.trigger('click')
    expect(wrapper.emitted('validate-sw')).toBeUndefined()
    expect(wrapper.emitted('validate-sw-ex')).toBeUndefined()
    expect(wrapper.emitted('validate-fc')).toBeUndefined()
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

    const [allOption, withExciseOption, withNotificationsOption, withoutExciseOption, do1Option] =
      invoiceMenu.props('options')

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
        label: 'отчёт ДО1 (все)',
        icon: 'fa-solid fa-check-to-slot',
        color: 'not-checked'
      },
      {
        label: 'реестр дополнительных изъятий',
        icon: 'fa-solid fa-person-circle-xmark',
        color: 'parcel-has-issues'
      },
      {
        label: 'тех. документация (с акцизом)',
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

    pushMock.mockClear()

    await do1Option.action(baseProps.item)
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Настройки формы ДО1',
      params: { id: baseProps.item.id }
    })
  })

  it('does not navigate when disabled', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, disabled: true },
      global: { stubs: vuetifyStubs }
    })

    const invoiceMenu = findActionMenuByTooltip(wrapper, 'Сформировать документы')
    expect(invoiceMenu).toBeTruthy()

    const allOption = invoiceMenu
      .props('options')
      .find((option) => option.label === 'инвойс-манифест (все)')
    const do1Option = invoiceMenu
      .props('options')
      .find((option) => option.label === 'отчёт ДО1 (все)')

    await allOption.action(baseProps.item)
    await do1Option.action(baseProps.item)

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('shows CMR only for Auto registers and routes to CMR settings', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: {
        ...baseProps,
        item: { ...baseProps.item, transportationTypeCode: 1 }
      },
      global: { stubs: vuetifyStubs }
    })

    const documentMenu = findActionMenuByTooltip(wrapper, 'Сформировать документы')
    const cmrOption = documentMenu.props('options').find((option) => option.label === 'CMR (все)')
    expect(cmrOption).toMatchObject({
      label: 'CMR (все)',
      icon: 'fa-solid fa-file-signature',
      color: 'not-checked'
    })

    await cmrOption.action()
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Настройки CMR',
      params: { id: baseProps.item.id }
    })

    const nonAutoWrapper = mount(RegisterHeaderActionsBar, {
      props: {
        ...baseProps,
        item: { ...baseProps.item, transportationTypeCode: 2 }
      },
      global: { stubs: vuetifyStubs }
    })
    const nonAutoMenu = findActionMenuByTooltip(nonAutoWrapper, 'Сформировать документы')
    expect(nonAutoMenu.props('options').map((option) => option.label)).not.toContain('CMR (все)')
  })

  it('does not route to CMR settings when the action bar is disabled', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: {
        ...baseProps,
        disabled: true,
        item: { ...baseProps.item, transportationTypeCode: 1 }
      },
      global: { stubs: vuetifyStubs }
    })

    const documentMenu = findActionMenuByTooltip(wrapper, 'Сформировать документы')
    await documentMenu
      .props('options')
      .find((option) => option.label === 'CMR (все)')
      .action()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it.each([
    [0, 1, true],
    [0, 0, false],
    [0, null, false],
    [1, 1, false],
    [2, 1, false]
  ])(
    'shows packing list only for Avia registers with a warehouse (%s, %s)',
    (transportationTypeCode, warehouseId, expected) => {
      const wrapper = mount(RegisterHeaderActionsBar, {
        props: {
          ...baseProps,
          item: { ...baseProps.item, transportationTypeCode, warehouseId }
        },
        global: { stubs: vuetifyStubs }
      })

      const labels = findActionMenuByTooltip(wrapper, 'Сформировать документы')
        .props('options')
        .map((option) => option.label)
      expect(labels.includes('packing list')).toBe(expected)
    }
  )

  it('emits packing list download and respects disabled state', async () => {
    const item = { ...baseProps.item, transportationTypeCode: 0, warehouseId: 5 }
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, item },
      global: { stubs: vuetifyStubs }
    })
    const option = findActionMenuByTooltip(wrapper, 'Сформировать документы')
      .props('options')
      .find((candidate) => candidate.label === 'packing list')

    await option.action()
    expect(wrapper.emitted('download-packing-list')).toHaveLength(1)

    const disabledWrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, item, disabled: true },
      global: { stubs: vuetifyStubs }
    })
    const disabledOption = findActionMenuByTooltip(disabledWrapper, 'Сформировать документы')
      .props('options')
      .find((candidate) => candidate.label === 'packing list')

    await disabledOption.action()
    expect(disabledWrapper.emitted('download-packing-list')).toBeUndefined()
  })

  it.each([
    CUSTOMS_PROCEDURE_RETURN,
    CUSTOMS_PROCEDURE_EXPORT,
    CUSTOMS_PROCEDURE_REEXPORT,
    CUSTOMS_PROCEDURE_REIMPORT
  ])('hides ДО1 for non-import procedure %s', (customsProcedureCode) => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: {
        ...baseProps,
        item: { ...baseProps.item, customsProcedureCode }
      },
      global: { stubs: vuetifyStubs }
    })

    const documentMenu = findActionMenuByTooltip(wrapper, 'Сформировать документы')
    const labels = documentMenu.props('options').map((option) => option.label)
    expect(labels).not.toContain('отчёт ДО1 (все)')
    expect(labels).toEqual([
      'инвойс-манифест (все)',
      'инвойс-манифест (с акцизом)',
      'инвойс-манифест (с нотификациями)',
      'инвойс-манифест (без акциза и нотификаций)',
      'реестр дополнительных изъятий',
      'тех. документация (с акцизом)'
    ])
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
    expect(documentMenu).toBeTruthy()
    const additionalRestrictionsOption = documentMenu
      .props('options')
      .find((option) => option.label === 'реестр дополнительных изъятий')
    const techdocOption = documentMenu
      .props('options')
      .find((option) => option.label === 'тех. документация (с акцизом)')

    await additionalRestrictionsOption.action(baseProps.item)
    await techdocOption.action(baseProps.item)
    expect(wrapper.emitted('download-additional-restrictions')).toHaveLength(1)
    expect(wrapper.emitted('download-techdoc')).toHaveLength(1)

    const disabledWrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, disabled: true },
      global: { stubs: vuetifyStubs }
    })
    const disabledDocumentMenu = findActionMenuByTooltip(disabledWrapper, 'Сформировать документы')
    expect(disabledDocumentMenu).toBeTruthy()
    const disabledAdditionalRestrictionsOption = disabledDocumentMenu
      .props('options')
      .find((option) => option.label === 'реестр дополнительных изъятий')
    const disabledTechdocOption = disabledDocumentMenu
      .props('options')
      .find((option) => option.label === 'тех. документация (с акцизом)')

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

  it('shows passport workflow menu for SrLogistPlus and emits both actions', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, showPassportCheck: true },
      global: { stubs: vuetifyStubs }
    })

    const passportMenu = findActionMenuByTooltip(wrapper, 'Проверка паспортов')

    expect(passportMenu).toBeTruthy()
    expect(passportMenu.props('icon')).toBe('fa-solid fa-passport')
    expect(optionPresentation(passportMenu.props('options'))).toEqual([
      {
        label: 'Проверить паспорта',
        icon: 'fa-solid fa-passport',
        color: 'not-checked'
      },
      {
        label: 'Закончить проверку паспортов',
        icon: 'fa-solid fa-passport',
        color: 'parcel-has-issues'
      }
    ])

    const [startOption, finishOption] = passportMenu.props('options')
    await startOption.action()
    await finishOption.action()
    expect(wrapper.emitted('check-passports')).toHaveLength(1)
    expect(wrapper.emitted('finish-passport-check')).toHaveLength(1)
  })

  it('highlights the passport action only while passport checks are pending', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: {
        ...baseProps,
        showPassportCheck: true,
        item: { ...baseProps.item, hasPendingPassportChecks: false }
      },
      global: { stubs: vuetifyStubs }
    })

    expect(findActionMenuByTooltip(wrapper, 'Проверка паспортов').props('variant')).toBe('default')

    await wrapper.setProps({
      item: { ...baseProps.item, hasPendingPassportChecks: true }
    })

    expect(findActionMenuByTooltip(wrapper, 'Проверка паспортов').props('variant')).toBe('blue')
  })

  it('hides passport check action when disabled by procedure or role', () => {
    let wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, showPassportCheck: false },
      global: { stubs: vuetifyStubs }
    })

    expect(findActionMenuByTooltip(wrapper, 'Проверка паспортов')).toBeUndefined()
    wrapper.unmount()

    authRefs.isSrLogistPlus.value = false
    wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, showPassportCheck: true },
      global: { stubs: vuetifyStubs }
    })

    expect(findActionMenuByTooltip(wrapper, 'Проверка паспортов')).toBeUndefined()
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

  it('shows the Ozon weight update action only when opted in and authorized', () => {
    const defaultWrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps },
      global: { stubs: vuetifyStubs }
    })
    expect(findActionButtonByTooltip(defaultWrapper, 'Обновить веса из файла реестра')).toBeUndefined()

    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, showWeightUpdate: true },
      global: { stubs: vuetifyStubs }
    })
    const action = findActionButtonByTooltip(wrapper, 'Обновить веса из файла реестра')

    expect(action).toBeTruthy()
    expect(action.props('icon')).toBe('fa-solid fa-file-arrow-up')
    action.vm.$emit('click')
    expect(wrapper.emitted('update-weights-from-file')).toHaveLength(1)

    authRefs.isSrLogistPlus.value = false
    const unauthorizedWrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, showWeightUpdate: true },
      global: { stubs: vuetifyStubs }
    })
    expect(
      findActionButtonByTooltip(unauthorizedWrapper, 'Обновить веса из файла реестра')
    ).toBeUndefined()
  })

  it('disables the weight update action for read-only and busy registers', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: { ...baseProps, showWeightUpdate: true, mutationDisabled: true },
      global: { stubs: vuetifyStubs }
    })

    const action = findActionButtonByTooltip(wrapper, 'Обновить веса из файла реестра')
    expect(action.props('disabled')).toBe(true)
    action.vm.$emit('click')
    expect(wrapper.emitted('update-weights-from-file')).toBeUndefined()

    await wrapper.setProps({ mutationDisabled: false, loading: true })
    expect(action.props('disabled')).toBe(true)
    action.vm.$emit('click')
    expect(wrapper.emitted('update-weights-from-file')).toBeUndefined()
  })

  it('disables only the weight update action when manual final weight is set', () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: {
        ...baseProps,
        item: { ...baseProps.item, realWeightKg: 12.345 },
        showWeightUpdate: true
      },
      global: { stubs: vuetifyStubs }
    })

    const weightUpdateAction = findActionButtonByTooltip(
      wrapper,
      'Обновление весов недоступно: задан фактический вес к оформлению'
    )
    const calculateChargesAction = findActionButtonByTooltip(
      wrapper,
      'Рассчитать сборы и пошлины'
    )

    expect(weightUpdateAction.props('disabled')).toBe(true)
    expect(calculateChargesAction.props('disabled')).toBe(false)
    weightUpdateAction.vm.$emit('click')
    expect(wrapper.emitted('update-weights-from-file')).toBeUndefined()
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
      {
        title: 'return procedure',
        item: { ...baseProps.item, customsProcedureCode: CUSTOMS_PROCEDURE_RETURN }
      },
      {
        title: 'export procedure',
        item: { ...baseProps.item, customsProcedureCode: CUSTOMS_PROCEDURE_EXPORT }
      },
      {
        title: 'reexport procedure',
        item: { ...baseProps.item, customsProcedureCode: CUSTOMS_PROCEDURE_REEXPORT }
      }
    ]

    for (const testCase of cases) {
      const wrapper = mount(RegisterHeaderActionsBar, {
        props: {
          ...baseProps,
          item: testCase.item
        },
        global: { stubs: vuetifyStubs }
      })

      expect(
        findActionButtonByTooltip(wrapper, 'Рассчитать сборы и пошлины'),
        testCase.title
      ).toBeUndefined()
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

  it('disables mutations but keeps downloads and documents available in read-only mode', async () => {
    const wrapper = mount(RegisterHeaderActionsBar, {
      props: {
        ...baseProps,
        mutationDisabled: true,
        showPassportCheck: true
      },
      global: { stubs: vuetifyStubs }
    })

    for (const tooltip of [
      'Проверить по стоп-словам',
      'Проверка паспортов',
      'Подбор кодов ТН ВЭД'
    ]) {
      expect(findActionMenuByTooltip(wrapper, tooltip).props('disabled')).toBe(true)
    }
    for (const tooltip of [
      'Проверить по кодам ТН ВЭД',
      'Рассчитать сборы и пошлины',
      'Выбрать посылки и изменить статус',
      'Применить запреты и скрыть дубликаты',
      'Зафиксировать сортировку по кодам ТН ВЭД'
    ]) {
      expect(findActionButtonByTooltip(wrapper, tooltip).props('disabled')).toBe(true)
    }

    const xmlMenu = findActionMenuByTooltip(wrapper, 'Выгрузить XML накладные')
    const documentMenu = findActionMenuByTooltip(wrapper, 'Сформировать документы')
    const downloadButton = findActionButtonByTooltip(wrapper, 'Экспортировать реестр')
    expect(xmlMenu.props('disabled')).toBe(false)
    expect(documentMenu.props('disabled')).toBe(false)
    expect(downloadButton.props('disabled')).toBe(false)

    findActionButtonByTooltip(wrapper, 'Рассчитать сборы и пошлины').vm.$emit('click')
    expect(wrapper.emitted('calculate-customs-charges')).toBeUndefined()

    await xmlMenu.props('options')[0].action()
    expect(wrapper.emitted('export-excise')).toHaveLength(1)
    downloadButton.vm.$emit('click')
    expect(wrapper.emitted('download')).toHaveLength(1)
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
      (button) => button.props('tooltipText') === 'Применить запреты и скрыть дубликаты'
    )
    const freezeButton = actionButtons.find(
      (button) => button.props('tooltipText') === 'Зафиксировать сортировку по кодам ТН ВЭД'
    )
    const closeButton = actionButtons.find((button) => button.props('tooltipText') === 'Закрыть')

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
