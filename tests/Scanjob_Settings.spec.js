/* @vitest-environment jsdom */
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import ScanjobSettings from '@/dialogs/Scanjob_Settings.vue'
import ActionButton from '@/components/ActionButton.vue'
import { resolveAll, vuetifyStubs } from './helpers/test-utils'
import { GTC_COMPANY_ID, OZON_COMPANY_ID } from '@/helpers/company.constants.js'

const vuetify = createVuetify()
enableAutoUnmount(afterEach)

const scanjobOperations = [
  { value: 10, name: 'Входящее сканирование' },
  { value: 15, name: 'Сортировка' },
  { value: 20, name: 'Исходящее сканирование' },
  { value: 30, name: 'Поиск' }
]

const mockOps = ref({
  types: [{ value: 1, name: 'Type 1' }],
  operations: scanjobOperations,
  modes: [{ value: 3, name: 'Mode 1' }],
  statuses: [
    { value: 4, name: 'Draft' },
    { value: 5, name: 'Started' },
    { value: 6, name: 'Paused' },
    { value: 7, name: 'Finished' }
  ]
})

const lookupParcels = [
  { parcelId: 1010, parcelNumber: 'P-1010', sticker: '0007', stickerCode: '*CODE-7' },
  { parcelId: 1011, parcelNumber: 'P-1011', sticker: '0008', stickerCode: null }
]

const mockScanjob = {
  id: 11,
  name: 'Test scanjob',
  type: 1,
  operation: 30,
  lookupStatusId: 101,
  mode: 3,
  status: 4,
  warehouseId: 11,
  registerId: 22,
  dealNumber: 'ABC-1',
  invoiceNumber: 'INV-001',
  invoiceDate: '2026-06-03',
  transportationTypeCode: 0,
  senderId: 201,
  recipientId: 202,
  allowStart: true,
  allowPause: false,
  allowFinish: false
}

const ensureOpsLoaded = vi.hoisted(() => vi.fn())
const getById = vi.hoisted(() => vi.fn())
const create = vi.hoisted(() => vi.fn())
const update = vi.hoisted(() => vi.fn())
const start = vi.hoisted(() => vi.fn())
const pause = vi.hoisted(() => vi.fn())
const finish = vi.hoisted(() => vi.fn())
const getFinishOptions = vi.hoisted(() => vi.fn())
const ensureLoaded = vi.hoisted(() => vi.fn())
const getRegisterById = vi.hoisted(() => vi.fn())
const ensureRegisterOpsLoaded = vi.hoisted(() => vi.fn())
const getAllCompanies = vi.hoisted(() => vi.fn())
const alertError = vi.hoisted(() => vi.fn())
const routerPush = vi.hoisted(() => vi.fn())
const routerBack = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))

const getWarehouseName = vi.hoisted(() => vi.fn((id) => `Warehouse ${id}`))
let registerItem = {
  id: 22,
  registerType: 1048578,
  invoiceNumber: 'INV-001',
  invoiceDate: '2026-06-03',
  transportationTypeCode: 0,
  senderId: 201,
  recipientId: 202
}
const mockCompanies = ref([
  { id: 201, shortName: 'Отправитель ООО', name: 'Отправитель полное' },
  { id: 202, shortName: '', name: 'Получатель полное' }
])
const parcelStatuses = [
  { id: 101, title: 'Найден' },
  { id: 102, title: 'Не найден' }
]

vi.mock('@/stores/scanjobs.store.js', () => ({
  useScanjobsStore: () => ({
    ops: mockOps,
    ensureOpsLoaded,
    getById,
    create,
    update,
    start,
    pause,
    finish,
    getFinishOptions,
    getOpsLabel: (list, value) => {
      const match = list?.find((item) => Number(item.value) === Number(value))
      return match ? match.name : String(value)
    }
  })
}))

vi.mock('@/stores/warehouses.store.js', () => ({
  useWarehousesStore: () => ({
    ensureLoaded,
    getWarehouseName
  })
}))

vi.mock('@/stores/registers.store.js', () => ({
  useRegistersStore: () => ({
    get item() {
      return registerItem
    },
    getById: getRegisterById,
    ensureOpsLoaded: ensureRegisterOpsLoaded,
    getTransportationDocument: (value) => (Number(value) === 0 ? 'AWB' : `[Тип ${value}]`)
  })
}))

vi.mock('@/stores/companies.store.js', () => ({
  useCompaniesStore: () => ({
    companies: mockCompanies,
    getAll: getAllCompanies
  })
}))

vi.mock('@/stores/parcel.statuses.store.js', () => ({
  useParcelStatusesStore: () => ({
    ensureLoaded,
    parcelStatuses
  })
}))

vi.mock('@/stores/alert.store.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    useAlertStore: () => {
      const store = actual.useAlertStore()
      if (store.error !== alertError) {
        alertError.mockImplementation(store.error)
        store.error = alertError
      }
      return store
    }
  }
})

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    hasWhRole: true,
    isAdmin: true,
    isShiftLeadPlus: true
  })
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: {
    push: routerPush,
    back: routerBack
  }
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => {
      if (store.ops !== undefined) {
        return {
          ops: mockOps
        }
      }
      if (store.companies !== undefined) {
        return {
          companies: mockCompanies
        }
      }
      return {}
    }
  }
})

describe('Scanjob_Settings.vue', () => {
  const mountComponent = (props) => {
    return mount(ScanjobSettings, {
      props,
      global: {
        plugins: [vuetify, createPinia()],
        components: {
          ActionButton
        },
        stubs: {
          'font-awesome-icon': true,
          LookupParcelSelectionDialog: { name: 'LookupParcelSelectionDialog', template: '<div />' },
          ...vuetifyStubs
        }
      }
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockOps.value.operations = [...scanjobOperations]
    ensureOpsLoaded.mockResolvedValue(mockOps.value)
    ensureLoaded.mockResolvedValue()
    ensureRegisterOpsLoaded.mockResolvedValue()
    getAllCompanies.mockResolvedValue(mockCompanies.value)
    getRegisterById.mockImplementation(async () => {
      registerItem = {
        id: 22,
        registerType: 1048578,
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-06-03',
        transportationTypeCode: 0,
        senderId: 201,
        recipientId: 202
      }
      return registerItem
    })
    getById.mockResolvedValue(mockScanjob)
    create.mockResolvedValue(mockScanjob)
    update.mockResolvedValue(true)
    start.mockResolvedValue(true)
    pause.mockResolvedValue(true)
    finish.mockResolvedValue(true)
    getFinishOptions.mockResolvedValue({ canMarkUnscannedAsNotFound: true, targetRegisterStatus: { id: 2, title: 'Готов' } })
    confirmMock.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('throws when edit mode is missing scanjobId', () => {
    // When script setup throws during execution, Vue may also fail during render
    // The important assertions are that the validation logic executed:
    // 1) alertError was called with the appropriate message
    // 2) routerBack was called to navigate away
    expect(() => mountComponent({ mode: 'edit' })).toThrow()
    expect(alertError).toHaveBeenCalledWith(
      'Невозможно редактировать задание на сканирование: отсутствует идентификатор'
    )
    expect(routerBack).toHaveBeenCalled()
  })

  it.each([
    [10, 'Входящее для сделки ABC-1']
  ])('generates and submits the default name for operation %i', async (operationValue, expectedName) => {
    const wrapper = mountComponent({
      mode: 'create',
      registerId: 22,
      warehouseId: 11,
      dealNumber: 'ABC-1'
    })
    await resolveAll()
    expect(wrapper.get('#name').element.value).toBe('Входящее для сделки ABC-1')

    await wrapper.get('#operation').setValue(String(operationValue))
    await resolveAll()
    expect(wrapper.get('#name').element.value).toBe(expectedName)

    if (operationValue === 30) {
      await wrapper.get('#lookupStatusId').setValue('101')
    }
    await wrapper.vm.$.setupState.onSubmit()
    await resolveAll()

    expect(create).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: expectedName,
      operation: operationValue
    }))
    expect(routerPush).toHaveBeenCalledWith('/scanjobs')
  })

  it.each([
    []
  ])(
    'leaves the name empty when the initial operation is unavailable or unknown: %j',
    async (operations) => {
      mockOps.value.operations = operations
      const wrapper = mountComponent({ mode: 'create', registerId: 22, dealNumber: 'ABC-1' })
      await resolveAll()
      expect(wrapper.get('#name').element.value).toBe('')
  }
  )

  it('shows initialization failure once without alert callbacks', async () => {
    const error = new Error('Не удалось загрузить операции')
    ensureOpsLoaded.mockRejectedValueOnce(error)
    const wrapper = mountComponent({
      mode: 'create',
      registerId: 22,
      warehouseId: 11,
      dealNumber: 'ABC-1'
    })
    await resolveAll()

    expect(alertError).toHaveBeenCalledOnce()
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain(error.message)
    expect(create).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()

    expect(wrapper.find('.page-alert-region__action').exists()).toBe(false)
  })

  it('renders edit mode and updates scanjob on save action', async () => {
    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    await wrapper.find('#name').setValue('Test scanjob')
    await wrapper.find('#type').setValue('1')
    await wrapper.find('#operation').setValue('30')
    await wrapper.find('#mode').setValue('3')
    await wrapper.find('#lookupStatusId').setValue('101')
    await wrapper.find('input[name="registerId"]').setValue(22)
    await wrapper.find('input[name="warehouseId"]').setValue(11)

    await wrapper.vm.$.setupState.onSubmit()
    await resolveAll()

    expect(update).toHaveBeenCalledWith(
      11,
      expect.objectContaining({
        name: 'Test scanjob',
        registerId: 22,
        warehouseId: 11,
        lookupStatusId: 101
      })
    )
    // After successful edit, return to caller
    expect(routerBack).toHaveBeenCalled()
  })

  it('reports status action errors for pause and finish', async () => {
    pause.mockRejectedValue(new Error('403 Forbidden'))
    finish.mockRejectedValue(new Error('404 Not Found'))
    update.mockResolvedValue(true)
    getById.mockResolvedValue({
      ...mockScanjob,
      allowPause: true,
      allowFinish: true
    })

    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    await wrapper.find('[data-testid="scanjob-pause-action"]').trigger('click')
    await resolveAll()
    expect(alertError).toHaveBeenCalledWith('Нет прав для приостановки сканирования')

    await wrapper.find('[data-testid="scanjob-finish-action"]').trigger('click')
    await resolveAll()
    expect(confirmMock).toHaveBeenCalled()
    expect(alertError).toHaveBeenCalledWith('Задание на сканирование не найдено')
  })

  it('locks the form and all scanjob mutations for read-only data', async () => {
    getById.mockResolvedValue({ ...mockScanjob, readOnly: true })
    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    expect(wrapper.text()).toContain('Изменения и операции сканирования запрещены')
    expect(wrapper.get('form').classes()).toContain('read-only-form')
    for (const testId of ['scanjob-start-action', 'scanjob-save-action']) {
      expect(wrapper.get(`[data-testid="${testId}"]`).attributes('disabled')).toBeDefined()
    }

    const saved = await wrapper.vm.$.setupState.saveScanjobQuiet()
    await wrapper.vm.$.setupState.onSubmit()
    await wrapper.vm.$.setupState.startScanjob()
    await wrapper.vm.$.setupState.pauseScanjob()
    await wrapper.vm.$.setupState.finishScanjob()
    await resolveAll()

    expect(saved).toBe(false)
    expect(alertError).toHaveBeenCalledWith('Изменения запрещены для выбранного реестра')
    expect(update).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
    expect(pause).not.toHaveBeenCalled()
    expect(finish).not.toHaveBeenCalled()
  })

  it('reports duplicate conflicts encountered while saving a status action', async () => {
    const conflict = Object.assign(new Error('409 Conflict'), { status: 409 })
    update.mockRejectedValue(conflict)
    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    await wrapper.get('[data-testid="scanjob-start-action"]').trigger('click')
    await resolveAll()

    expect(start).not.toHaveBeenCalled()
    expect(alertError).toHaveBeenCalledWith('Такое задание на сканирование уже существует')
  })

  it('enters read-only mode when form submission receives a mutation conflict', async () => {
    const conflict = Object.assign(new Error('Изменения запрещены для выбранного реестра'), {
      status: 409
    })
    update.mockRejectedValue(conflict)
    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    await wrapper.vm.$.setupState.onSubmit()
    await resolveAll()

    expect(alertError).toHaveBeenCalledWith('Изменения запрещены для выбранного реестра')
    expect(wrapper.get('form').classes()).toContain('read-only-form')
  })

  it('shows only confirmed parcel rows in a read-only table on the form', async () => {
    const wrapper = mountComponent({ mode: 'create', registerId: 22, warehouseId: 11, dealNumber: 'ABC-1' })
    const tableSelector = 'form table[aria-labelledby="lookup-parcel-table-heading"]'
    await resolveAll()
    await wrapper.get('#operation').setValue('30')
    await wrapper.get('#lookupTargetSource').setValue('list')
    const table = wrapper.get(tableSelector)
    expect(table.findAll('th').map(cell => cell.text())).toEqual(['№', 'ШК', 'Стикер (УИН)', 'Код стикера'])
    expect(table.findAll('tbody tr')).toHaveLength(0)
    const choose = wrapper.get('.header-actions-bar #lookupParcelIds')
    expect(choose.attributes('aria-label')).toBe('Выбрать')
    await choose.trigger('click')

    const dialog = wrapper.getComponent({ name: 'LookupParcelSelectionDialog' })
    dialog.vm.$emit('selected', lookupParcels, 23)
    await resolveAll()
    expect(table.findAll('tbody tr')).toHaveLength(0)
    dialog.vm.$emit('selected', lookupParcels, 22)
    dialog.vm.$emit('update:modelValue', false)
    await resolveAll()

    expect(table.findAll('tbody td').map(cell => cell.text())).toEqual([
      '1010', 'P-1010', '0007', '*CODE-7', '1011', 'P-1011', '0008', '—'
    ])
    expect(table.find('input').exists()).toBe(false)
    expect(wrapper.get('[data-testid="scanjob-save-action"]').element.disabled).toBe(false)
    await wrapper.get('#lookupParcelIds').trigger('click')
    wrapper.getComponent({ name: 'LookupParcelSelectionDialog' }).vm.$emit('update:modelValue', false)
    await resolveAll()
    expect(wrapper.get(tableSelector).findAll('tbody tr')).toHaveLength(2)

    await wrapper.get('#lookupTargetSource').setValue('status')
    expect(wrapper.find(tableSelector).exists()).toBe(false)
  })

  it('uses Ozon columns and shows saved parcel data even when the job is locked', async () => {
    getRegisterById.mockResolvedValue({ id: 22, registerType: OZON_COMPANY_ID })
    getById.mockResolvedValue({
      ...mockScanjob, lookupStatusId: null, lookupParcelIds: [1010, 1011],
      lookupParcels: [{ parcelId: 1010, parcelNumber: '0001-002', sticker: 'OZON-ID', stickerCode: 'BARCODE' }]
    })
    const wrapper = mountComponent({ mode: 'edit', scanjobId: 11 })
    await resolveAll()

    const table = wrapper.get('form table')
    expect(table.findAll('th').map(cell => cell.text())).toEqual(['№', '№ отправления', 'ID отправления', 'Штрихкод'])
    expect(table.findAll('tbody td').map(cell => cell.text())).toEqual([
      '1010', '0001-002', 'OZON-ID', 'BARCODE', '1011', '—', '—', '—'
    ])
    expect(wrapper.get('#lookupParcelIds').element.disabled).toBe(true)
  })

  it('discards the list draft when the register changes', async () => {
    const wrapper = mountComponent({ mode: 'create', registerId: 22, warehouseId: 11, dealNumber: 'ABC-1' })
    await resolveAll()
    await wrapper.get('#operation').setValue('30')
    await wrapper.get('#lookupTargetSource').setValue('list')
    await wrapper.get('#lookupParcelIds').trigger('click')
    const dialog = wrapper.getComponent({ name: 'LookupParcelSelectionDialog' })
    dialog.vm.$emit('selected', lookupParcels.slice(0, 1), 22)
    dialog.vm.$emit('update:modelValue', false)
    await wrapper.setProps({ registerId: 23 })
    await resolveAll()
    expect(getRegisterById).toHaveBeenLastCalledWith(23)
    expect(wrapper.find('#lookupParcelIds').exists()).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })

  it('keeps the saved list source when Start fails after saving settings', async () => {
    getById.mockResolvedValue({ ...mockScanjob, status: 10 })
    start.mockRejectedValueOnce(new Error('Не удалось запустить сканирование'))
    const wrapper = mountComponent({ mode: 'edit', scanjobId: 11 })
    await resolveAll()

    await wrapper.get('#lookupTargetSource').setValue('list')
    expect(wrapper.get('[data-testid="scanjob-start-action"]').element.disabled).toBe(true)
    await wrapper.get('#lookupParcelIds').trigger('click')
    const dialog = wrapper.getComponent({ name: 'LookupParcelSelectionDialog' })
    dialog.vm.$emit('selected', lookupParcels, 22)
    dialog.vm.$emit('update:modelValue', false)
    await resolveAll()
    const startAction = wrapper.get('[data-testid="scanjob-start-action"]')
    expect(startAction.element.disabled).toBe(false)
    await startAction.trigger('click')
    await resolveAll()
    expect(update).toHaveBeenLastCalledWith(11, expect.objectContaining({
      lookupStatusId: null, lookupParcelIds: [1010, 1011], type: 30
    }))

    await wrapper.get('#lookupTargetSource').setValue('status')
    await wrapper.get('#lookupStatusId').setValue('102')
    await wrapper.vm.$.setupState.onSubmit()
    await resolveAll()
    expect(update).toHaveBeenLastCalledWith(11, expect.objectContaining({
      lookupStatusId: 102, lookupParcelIds: null
    }))
  })

  it('limits operations to lookup for GTC registers', async () => {
    getRegisterById.mockImplementation(async () => {
      registerItem = { id: 22, registerType: GTC_COMPANY_ID }
      return registerItem
    })

    const wrapper = mountComponent({
      mode: 'create',
      registerId: 22,
      warehouseId: 11,
      dealNumber: 'ABC-1'
    })
    await resolveAll()

    const options = wrapper.findAll('#operation option')
    expect(options).toHaveLength(1)
    expect(options[0].text()).toBe('Поиск')
    expect(wrapper.find('#operation').element.value).toBe('30')
    expect(wrapper.get('#name').element.value).toBe('Поиск для сделки ABC-1')
    await wrapper.vm.$.setupState.onSubmit()
    expect(wrapper.text()).toContain('Задания сканирования недоступны для реестров GTC')
    expect(create).not.toHaveBeenCalled()
  })


  describe('independent completion workflow', () => {
    async function openEditor() {
      getById.mockResolvedValue({ ...mockScanjob, operation: 10, allowFinish: true })
      const wrapper = mountComponent({ mode: 'edit', scanjobId: 11 })
      await resolveAll()
      return wrapper
    }

    it.each([
      false
    ])('uses simple confirmation in the editor, accepted: %s', async (accepted) => {
      const wrapper = await openEditor()
      getFinishOptions.mockResolvedValue({ canMarkUnscannedAsNotFound: false, targetRegisterStatus: null })
      confirmMock.mockResolvedValueOnce(accepted)
      await wrapper.get('[data-testid="scanjob-finish-action"]').trigger('click')
      await resolveAll()
      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ content: 'Завершить задание?' }))
      expect(confirmMock.mock.calls[0][0]).not.toHaveProperty('contentComponent')
      if (accepted) {
        expect(update).toHaveBeenCalledTimes(1)
        expect(finish).toHaveBeenCalledWith(11, { markUnscannedAsNotFound: false, updateRegisterStatus: false })
      } else {
        expect(update).not.toHaveBeenCalled()
        expect(finish).not.toHaveBeenCalled()
      }
    })

    describe('read-only completion conflicts', () => {
      it.each([['preview', 'message']])('locks the editor after a %s conflict in %s', async (stage, shape) => {
        const wrapper = await openEditor()
        await wrapper.get('#name').setValue('Несохранённое название')
        await wrapper.get('#operation').setValue('30')
        await wrapper.get('#lookupStatusId').setValue('102')
        const conflict = Object.assign(new Error(shape === 'message' ? 'Изменения запрещены для выбранного реестра' : '409 Conflict'), {
          status: 409,
          ...(shape === 'payload' ? { data: { msg: 'Изменения запрещены для выбранного реестра', errors: {} } } : {})
        })
        const action = { preview: getFinishOptions, save: update, finish }[stage]
        action.mockRejectedValueOnce(conflict)

        await wrapper.get('[data-testid="scanjob-finish-action"]').trigger('click')
        await resolveAll()

        expect(wrapper.get('#name').element.value).toBe('Несохранённое название')
        expect(wrapper.get('#operation').element.value).toBe('30')
        expect(wrapper.get('#lookupStatusId').element.value).toBe('102')
        expect(wrapper.get('#name').element.readOnly).toBe(true)
        for (const selector of ['#type', '#mode', '#operation', '#lookupStatusId']) {
          expect(wrapper.get(selector).element.disabled).toBe(true)
        }
        expect(wrapper.get('form').classes()).toContain('read-only-form')
        expect(wrapper.get('.read-only-notice').text()).toContain('Изменения и операции сканирования запрещены')
        expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('Изменения запрещены для выбранного реестра')
        expect(alertError).toHaveBeenCalledTimes(1)
        for (const testId of ['scanjob-start-action', 'scanjob-pause-action', 'scanjob-finish-action', 'scanjob-save-action']) {
          expect(wrapper.get('[data-testid="' + testId + '"]').attributes('disabled')).toBeDefined()
        }
        expect(wrapper.vm.$.setupState.currentScanjob.readOnly).toBe(true)
        expect(wrapper.vm.$.setupState.currentRegister.readOnly).toBe(true)
        expect(confirmMock).toHaveBeenCalledTimes(stage === 'preview' ? 0 : 1)
        expect(update).toHaveBeenCalledTimes(stage === 'preview' ? 0 : 1)
        expect(finish).toHaveBeenCalledTimes(stage === 'finish' ? 1 : 0)
        const counts = [getFinishOptions, update, start, pause, finish].map((fn) => fn.mock.calls.length)

        // Even programmatic retries cannot reach the server after the conflict.
        await wrapper.vm.$.setupState.finishScanjob()
        await wrapper.vm.$.setupState.startScanjob()
        await wrapper.vm.$.setupState.pauseScanjob()
        await wrapper.vm.$.setupState.onSubmit()
        await resolveAll()

        expect([getFinishOptions, update, start, pause, finish].map((fn) => fn.mock.calls.length)).toEqual(counts)
        expect(routerPush).not.toHaveBeenCalled()
        expect(routerBack).not.toHaveBeenCalled()
      })

    })

    it.each(['save', 'finish'])('preserves fields and selections after a %s failure, then retries', async (stage) => {
      const wrapper = await openEditor()
      await wrapper.get('#name').setValue('Сохранённый ввод')
      confirmMock.mockImplementationOnce(async ({ contentComponentProps: props }) => {
        props.onChange('markUnscannedAsNotFound', false)
        props.onChange('updateRegisterStatus', false)
        return true
      }).mockResolvedValue(true)
      const error = new Error('Операция недоступна')
      if (stage === 'save') update.mockRejectedValueOnce(error)
      else finish.mockRejectedValueOnce(error)
      await wrapper.get('[data-testid="scanjob-finish-action"]').trigger('click')
      await resolveAll()
      expect(wrapper.get('#name').element.value).toBe('Сохранённый ввод')
      expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('Операция недоступна')
      expect(alertError).toHaveBeenCalledTimes(1)
      expect(routerPush).not.toHaveBeenCalled()
      if (stage === 'save') expect(finish).not.toHaveBeenCalled()
      await wrapper.get('[data-testid="scanjob-finish-action"]').trigger('click')
      await resolveAll()
      expect(finish).toHaveBeenLastCalledWith(11, { markUnscannedAsNotFound: false, updateRegisterStatus: false })
      expect(alertError).toHaveBeenCalledTimes(1)
    })

    it('reports refresh failure after success and disables further completion', async () => {
      const wrapper = await openEditor()
      getById.mockRejectedValueOnce(new Error('Reload failed'))
      await wrapper.get('[data-testid="scanjob-finish-action"]').trigger('click')
      await resolveAll()
      expect(finish).toHaveBeenCalledTimes(1)
      expect(wrapper.get('[data-testid="scanjob-finish-action"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-testid="page-alert-region"]').text()).toContain('Задание завершено, но не удалось обновить данные')
      expect(alertError).toHaveBeenCalledTimes(1)
    })
  })

  it('reports refresh errors when status update fails', async () => {
    getById.mockResolvedValueOnce(mockScanjob).mockResolvedValueOnce(null)
    update.mockResolvedValue(true)
    const wrapper = mountComponent({
      mode: 'edit',
      scanjobId: 11
    })
    await resolveAll()

    await wrapper.find('[data-testid="scanjob-start-action"]').trigger('click')
    await resolveAll()

    expect(alertError).toHaveBeenCalledWith('Не удалось обновить задание на сканирование')
  })
})
