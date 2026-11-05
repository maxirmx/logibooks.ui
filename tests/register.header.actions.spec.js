/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, reactive, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ActionDialog from '@/l2/ActionDialog.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { vuetifyStubs } from './helpers/test-utils.js'
import { refreshAfterCheckStatusFreeze, useRegisterHeaderActions } from '@/helpers/register.actions.js'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'

const confirmMock = vi.hoisted(() => vi.fn())

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('useRegisterHeaderActions', () => {
  let registersStore
  let alertStore
  let runningAction
  let tableLoading
  let registerLoading
  let loadParcels
  let isComponentMounted

  beforeEach(() => {
    confirmMock.mockReset()
    confirmMock.mockResolvedValue(true)
    registersStore = {
      item: reactive({
        id: 1,
        invoiceNumber: 'INV-1',
        fileName: 'register.xlsx',
        hasPendingPassportChecks: true,
        passportChecksNotCheckedCount: 1,
        passportChecksInProgressCount: 0,
        passportCheckWasFinished: false,
        parcelsTotal: 2,
        loading: false,
        error: null
      }),
      validate: vi.fn(),
      getValidationProgress: vi.fn(),
      cancelValidation: vi.fn(),
      lookupFeacnCodes: vi.fn(),
      // The store method with extended flag will reuse lookupFeacnCodes with second param true
      getLookupFeacnCodesProgress: vi.fn(),
      cancelLookupFeacnCodes: vi.fn().mockResolvedValue(),
      generate: vi.fn().mockResolvedValue(),
      generateOrdinary: vi.fn().mockResolvedValue(),
      generateExcise: vi.fn().mockResolvedValue(),
      generateNotifications: vi.fn().mockResolvedValue(),
      download: vi.fn().mockResolvedValue(),
      getDownloadFormats: vi.fn().mockResolvedValue({ company: { available: true, name: 'Receiver' } }),
      downloadAdditionalRestrictions: vi.fn().mockResolvedValue(),
      downloadPackingList: vi.fn().mockResolvedValue(),
      downloadTajikistanManifestFile: vi.fn().mockResolvedValue(),
      freezeCheckStatus: vi.fn().mockResolvedValue(),
      freezeTnVedOrder: vi.fn().mockResolvedValue(),
      checkPassports: vi.fn().mockResolvedValue(),
      finishPassportCheck: vi.fn().mockResolvedValue(),
      refreshCustomsChargeDetails: vi.fn().mockResolvedValue(undefined),
      calculateCustomsCharges: vi.fn().mockResolvedValue(),
      getById: vi.fn().mockResolvedValue(),
      getAll: vi.fn().mockResolvedValue()
    }

    alertStore = { error: vi.fn() }
    runningAction = ref(false)
    tableLoading = ref(false)
    registerLoading = ref(false)
    loadParcels = vi.fn().mockResolvedValue()
    isComponentMounted = ref(true)
  })

  it('offers company output for a WbrN paperwork download and keeps the action locked', async () => {
    registersStore.item.registerType = WBRN_REGISTER_ID
    const deferred = createDeferred()
    registersStore.download.mockReturnValueOnce(deferred.promise)
    const actions = useRegisterHeaderActions({
      registersStore, alertStore, runningAction, tableLoading, registerLoading,
      loadParcels, isComponentMounted
    })
    await Promise.resolve()
    expect(actions.companyFormatName.value).toBe('Receiver')
    const first = actions.downloadRegister('company')
    await Promise.resolve()
    expect(runningAction.value).toBe(true)
    expect(await actions.downloadRegister('generic')).toBe(false)
    deferred.resolve(true)
    expect(await first).toBe(true)
    expect(registersStore.getDownloadFormats).toHaveBeenCalledTimes(1)
    expect(registersStore.download).toHaveBeenCalledWith(1, 'register.xlsx', null, undefined, false, 'company')
    expect(actions.actionDialog.show).toBe(false)
    expect(alertStore.error).not.toHaveBeenCalled()
  })

  it('reports a supported paperwork download failure once without alert callbacks', async () => {
    registersStore.item.registerType = WBRN_REGISTER_ID
    registersStore.download.mockRejectedValueOnce(new Error('download failed'))
    const actions = useRegisterHeaderActions({
      registersStore, alertStore, runningAction, tableLoading, registerLoading,
      loadParcels, isComponentMounted
    })
    await Promise.resolve()
    const first = actions.downloadRegister('company')
    expect(await first).toBe(false)
    expect(alertStore.error).toHaveBeenCalledTimes(1)
  })

  it('exports raw XML when weight correction is declined', async () => {
    registersStore.item.realWeightKg = 5
    registersStore.item.totalWeightKgToRelease = 10
    confirmMock.mockResolvedValueOnce(false)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await actions.exportAllXmlOrdinary()

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Применить поправочный коэффициент 0,500 для веса посылок?'
      })
    )
    expect(registersStore.generateOrdinary).toHaveBeenCalledWith(1, 'INV-1', false, expect.any(Function))
    expect(actions.actionDialog.show).toBe(false)
  })

  it('offers optional correction before register download and applies selected correction', async () => {
    registersStore.item.realWeightKg = 5
    registersStore.item.totalWeightKgToRelease = 10
    confirmMock.mockResolvedValueOnce(true)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await actions.downloadRegister()

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Применить поправочный коэффициент 0,500 для веса посылок?'
      })
    )
    expect(registersStore.download).toHaveBeenCalledWith(1, 'register.xlsx', null, null, true)
  })

  it('reports download errors and hides action dialog when download fails', async () => {
    const error = new Error('Download failed')
    registersStore.download.mockRejectedValueOnce(error)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const { actionDialog, downloadRegister } = actions

    const promise = downloadRegister()

    expect(actionDialog.show).toBe(true)

    await expect(promise).resolves.toBeUndefined()

    expect(actionDialog.show).toBe(false)
    expect(actionDialog.title).toBe('')
    expect(alertStore.error).toHaveBeenCalledWith('Download failed')
  })

  it('reports additional restrictions download errors and hides action dialog', async () => {
    const error = new Error('Additional restrictions download failed')
    registersStore.downloadAdditionalRestrictions.mockRejectedValueOnce(error)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const promise = actions.downloadAdditionalRestrictions()

    expect(actions.actionDialog.show).toBe(true)

    await expect(promise).resolves.toBeUndefined()

    expect(actions.actionDialog.show).toBe(false)
    expect(alertStore.error).toHaveBeenCalledWith('Additional restrictions download failed')
  })

  it('presents a Tajikistan manifest download failure exactly once', async () => {
    registersStore.downloadTajikistanManifestFile.mockRejectedValueOnce(
      new Error('Отсутствует Сумма в рублях')
    )
    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await actions.downloadTajikistanManifest()

    expect(alertStore.error).toHaveBeenCalledTimes(1)
    expect(alertStore.error).toHaveBeenCalledWith('Отсутствует Сумма в рублях')
    expect(actions.actionDialog.show).toBe(false)
  })

  it('shows packing list progress, locks duplicates, and presents a failure once', async () => {
    const deferred = createDeferred()
    registersStore.downloadPackingList.mockReturnValueOnce(deferred.promise)
    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const firstPromise = actions.downloadPackingList()
    const duplicatePromise = actions.downloadPackingList()

    expect(actions.actionDialog.show).toBe(true)
    expect(actions.actionDialog.title).toBe('Подготовка файла packing list')
    expect(registersStore.downloadPackingList).toHaveBeenCalledTimes(1)
    expect(registersStore.downloadPackingList).toHaveBeenCalledWith(1, 'INV-1')

    deferred.reject(new Error('Box metrics are missing'))
    await firstPromise
    await duplicatePromise

    expect(actions.actionDialog.show).toBe(false)
    expect(alertStore.error).toHaveBeenCalledTimes(1)
    expect(alertStore.error).toHaveBeenCalledWith('Box metrics are missing')
  })

  it('shows one localized XML error and releases the lock for a fresh export', async () => {
    const error = new Error('TypeError: archive stream failed')
    registersStore.generateOrdinary.mockRejectedValueOnce(error)
    const pinia = createPinia()
    const alerts = useAlertStore(pinia)
    const notify = vi.spyOn(alerts, 'error')
    const wrapper = mount(PageAlertRegion, { global: { plugins: [pinia] } })
    const actions = useRegisterHeaderActions({
      registersStore, alertStore: alerts, runningAction, tableLoading, registerLoading,
      loadParcels, isComponentMounted
    })

    try {
      await actions.exportAllXmlOrdinary()
      await nextTick()
      expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
      expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось сформировать XML архив')
      expect(wrapper.text()).not.toContain(error.message)
      expect(notify).toHaveBeenCalledOnce()
      expect(actions.actionDialog.show).toBe(false)
      expect(runningAction.value).toBe(false)

      await wrapper.get('[aria-label="Закрыть сообщение"]').trigger('click')
      await actions.exportAllXmlOrdinary()
      expect(registersStore.generateOrdinary).toHaveBeenCalledTimes(2)
      expect(registersStore.generateOrdinary).toHaveBeenLastCalledWith(1, 'INV-1', false, expect.any(Function))
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(actions.actionDialog.show).toBe(false)
      expect(runningAction.value).toBe(false)
    } finally {
      actions.stop()
      wrapper.unmount()
    }
  })

  it('renders XML progress from accepted responses and resets for the next dialog', async () => {
    const download = createDeferred()
    registersStore.generateNotifications.mockReturnValueOnce(download.promise)
    const actions = useRegisterHeaderActions({ registersStore, alertStore, runningAction, isComponentMounted })
    const wrapper = mount(ActionDialog, {
      props: { actionDialog: actions.actionDialog },
      global: { stubs: { ...vuetifyStubs,
        'v-dialog': { props: ['modelValue'], template: '<section v-if="modelValue" role="dialog"><slot /></section>' },
        'v-progress-circular': { props: ['indeterminate'], template: '<div :data-indeterminate="indeterminate"><slot /></div>' }
      } }
    })
    try {
      const work = actions.exportAllXmlNotifications()
      await nextTick()
      const update = registersStore.generateNotifications.mock.calls[0][3]
      expect(wrapper.find('[data-indeterminate="true"]').exists()).toBe(true)
      update({ total: 0, processed: 1 })
      expect(actions.actionDialog.percent).toBeNull()
      update({ handleId: 'archive', total: 3, processed: 2 })
      await nextTick()
      expect(wrapper.get('[role="dialog"]').text()).toContain('66%')
      update({ handleId: 'archive', total: 3, processed: 1 })
      expect(actions.actionDialog.percent).toBe(66)
      update({ handleId: 'archive', total: 3, processed: 3 })
      await nextTick()
      expect(wrapper.get('[role="dialog"]').text()).toContain('99%')
      download.resolve(true)
      await work
      await nextTick()
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
      expect(actions.actionDialog.percent).toBeNull()

      const report = createDeferred()
      registersStore.downloadAdditionalRestrictions.mockReturnValueOnce(report.promise)
      const next = actions.downloadAdditionalRestrictions()
      await nextTick()
      expect(wrapper.find('[data-indeterminate="true"]').exists()).toBe(true)
      report.resolve(true)
      await next
    } finally {
      actions.stop()
      wrapper.unmount()
    }
  })

  it('discards a stale XML weight choice and stale progress after navigation', async () => {
    const registerId = ref(1)
    const choice = createDeferred()
    registersStore.item.realWeightKg = 5
    registersStore.item.totalWeightKgToRelease = 10
    confirmMock.mockReturnValueOnce(choice.promise)
    const actions = useRegisterHeaderActions({
      registersStore, alertStore, runningAction, isComponentMounted, registerId: () => registerId.value
    })
    const preparing = actions.exportAllXmlOrdinary()
    registerId.value = 2
    choice.resolve(true)
    await preparing
    expect(registersStore.generateOrdinary).not.toHaveBeenCalled()

    registersStore.item.id = 2
    registersStore.item.realWeightKg = 0
    const old = createDeferred()
    registersStore.generateOrdinary.mockReturnValueOnce(old.promise)
    const oldWork = actions.exportAllXmlOrdinary()
    const oldProgress = registersStore.generateOrdinary.mock.calls[0][3]
    registerId.value = 3
    registersStore.item.id = 3
    const current = createDeferred()
    registersStore.generateOrdinary.mockReturnValueOnce(current.promise)
    const currentWork = actions.exportAllXmlOrdinary()
    oldProgress({ total: 5, processed: 4 })
    const diagnostics = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      old.reject(new Error('Previous download failed'))
      await oldWork
      expect(alertStore.error).not.toHaveBeenCalled()
    } finally {
      diagnostics.mockRestore()
    }
    expect(actions.actionDialog.percent).toBeNull()
    expect(actions.actionDialog.show).toBe(true)
    expect(runningAction.value).toBe(true)
    current.resolve(true)
    await currentWork
    expect(runningAction.value).toBe(false)
    actions.stop()
  })

  it('cancels extended FEACN lookup via cancelLookupFeacnCodes', async () => {
    // Arrange: simulate active extended lookup
    registersStore.lookupFeacnCodes.mockResolvedValueOnce({ id: 'handle-ex' })
    registersStore.getLookupFeacnCodesProgress.mockResolvedValueOnce({
      total: 5,
      processed: 0,
      finished: false
    })

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await actions.lookupFeacnCodesEx()
    expect(actions.validationState.operation).toBe('lookup-feacn-codes')
    // Act: invoke cancel
    await actions.cancelValidation()

    // Assert: correct cancel path used
    expect(registersStore.cancelLookupFeacnCodes).toHaveBeenCalledWith('handle-ex')
    expect(registersStore.cancelValidation).not.toHaveBeenCalled()
    expect(actions.validationState.show).toBe(true)
    expect(actions.validationState.cancelling).toBe(true)
    actions.stop()
  })

  it('shows action dialog while freeze tn ved order runs', async () => {
    const deferred = createDeferred()
    registersStore.freezeTnVedOrder.mockReturnValueOnce(deferred.promise)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const { actionDialog, freezeTnVedOrder } = actions

    const promise = freezeTnVedOrder()

    expect(actionDialog.show).toBe(true)
    expect(actionDialog.title).toBe('Сортировка')
    expect(registersStore.freezeTnVedOrder).toHaveBeenCalledWith(1)

    deferred.resolve()
    await promise

    expect(actionDialog.show).toBe(false)
    expect(actionDialog.title).toBe('')
  })

  it('reports a register refresh rejection once and leaves the restriction filter unchanged', async () => {
    const hideLegacyRestrictions = ref(false)
    const refreshError = new Error('Register refresh failed')
    const fetchRegister = vi.fn().mockRejectedValue(refreshError)
    const loadParcelsAfterFreeze = vi.fn()

    await expect(refreshAfterCheckStatusFreeze({
      succeeded: true,
      hideLegacyRestrictions,
      fetchRegister,
      loadParcels: loadParcelsAfterFreeze,
      alertStore
    })).resolves.toBe(false)

    expect(alertStore.error).toHaveBeenCalledTimes(1)
    expect(alertStore.error).toHaveBeenCalledWith(refreshError, {
      fallback: 'Запреты применены, но не удалось обновить данные'
    })
    expect(hideLegacyRestrictions.value).toBe(false)
    expect(loadParcelsAfterFreeze).not.toHaveBeenCalled()
  })

  it('returns false and reports a freeze check status failure exactly once', async () => {
    registersStore.freezeCheckStatus.mockRejectedValueOnce(new Error('Freeze failed'))
    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await expect(actions.freezeCheckStatus()).resolves.toBe(false)

    expect(alertStore.error).toHaveBeenCalledTimes(1)
    expect(alertStore.error).toHaveBeenCalledWith('Freeze failed')
    expect(actions.actionDialog.show).toBe(false)
  })

  it('does not change the filter when the component unmounts while refreshing the register', async () => {
    const hideLegacyRestrictions = ref(false)
    const isComponentMounted = ref(true)
    const registerRefresh = createDeferred()
    const fetchRegister = vi.fn().mockReturnValue(registerRefresh.promise)
    const loadParcelsAfterFreeze = vi.fn()

    const refreshPromise = refreshAfterCheckStatusFreeze({
      succeeded: true,
      hideLegacyRestrictions,
      fetchRegister,
      loadParcels: loadParcelsAfterFreeze,
      isComponentMounted
    })

    expect(fetchRegister).toHaveBeenCalledTimes(1)
    isComponentMounted.value = false
    registerRefresh.resolve()

    await expect(refreshPromise).resolves.toBe(false)
    expect(hideLegacyRestrictions.value).toBe(false)
    expect(loadParcelsAfterFreeze).not.toHaveBeenCalled()
  })

  it('reports a parcel refresh rejection exactly once', async () => {
    const hideLegacyRestrictions = ref(true)
    const refreshError = new Error('Parcel refresh failed')
    const fetchRegister = vi.fn().mockResolvedValue()
    const loadParcelsAfterFreeze = vi.fn().mockRejectedValue(refreshError)

    await expect(refreshAfterCheckStatusFreeze({
      succeeded: true,
      hideLegacyRestrictions,
      fetchRegister,
      loadParcels: loadParcelsAfterFreeze,
      alertStore
    })).resolves.toBe(false)

    expect(alertStore.error).toHaveBeenCalledTimes(1)
    expect(alertStore.error).toHaveBeenCalledWith(refreshError, {
      fallback: 'Запреты применены, но не удалось обновить данные'
    })
  })

  it('does not show a refresh error after the component unmounts', async () => {
    const hideLegacyRestrictions = ref(false)
    const mounted = ref(true)
    const registerRefresh = createDeferred()
    const fetchRegister = vi.fn().mockReturnValue(registerRefresh.promise)
    const loadParcelsAfterFreeze = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const refreshPromise = refreshAfterCheckStatusFreeze({
      succeeded: true,
      hideLegacyRestrictions,
      fetchRegister,
      loadParcels: loadParcelsAfterFreeze,
      isComponentMounted: mounted,
      alertStore
    })

    mounted.value = false
    registerRefresh.reject(new Error('Refresh failed after unmount'))

    await expect(refreshPromise).resolves.toBe(false)
    expect(alertStore.error).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(hideLegacyRestrictions.value).toBe(false)

    consoleError.mockRestore()
  })

  it('checks register passports and refreshes parcels after completion', async () => {
    const deferred = createDeferred()
    registersStore.checkPassports.mockReturnValueOnce(deferred.promise)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const promise = actions.checkPassports()

    await vi.waitFor(() => {
      expect(registersStore.checkPassports).toHaveBeenCalledWith(1)
    })
    expect(actions.actionDialog.show).toBe(true)
    expect(actions.actionDialog.title).toBe('Проверка паспортов')

    deferred.resolve()
    await promise

    expect(registersStore.getById).toHaveBeenCalledWith(1)
    expect(loadParcels).toHaveBeenCalledTimes(1)
    expect(actions.actionDialog.show).toBe(false)
    expect(actions.actionDialog.title).toBe('')
  })

  it('confirms and finishes passport checks, then refreshes register and parcels', async () => {
    const deferred = createDeferred()
    registersStore.finishPassportCheck.mockReturnValueOnce(deferred.promise)
    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const promise = actions.finishPassportCheck()
    await vi.waitFor(() => expect(confirmMock).toHaveBeenCalledOnce())

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Подтверждение',
        confirmationText: 'Применить',
        cancellationText: 'Отменить',
        content:
          'Вы завершаете проверку паспортов, хотя для 1 посылки она не проводилась. Целостность выгружаемых данных может быть нарушена.'
      })
    )
    expect(actions.actionDialog.show).toBe(true)
    expect(actions.actionDialog.title).toBe('Завершение проверки паспортов')
    expect(registersStore.finishPassportCheck).toHaveBeenCalledWith(1)

    deferred.resolve()
    await promise

    expect(registersStore.getById).toHaveBeenCalledWith(1)
    expect(loadParcels).toHaveBeenCalledTimes(1)
    expect(actions.actionDialog.show).toBe(false)
  })

  it('finishes passport checks without confirmation when none are pending', async () => {
    registersStore.item.hasPendingPassportChecks = false
    registersStore.item.passportChecksNotCheckedCount = 0
    registersStore.item.passportChecksInProgressCount = 0
    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await actions.finishPassportCheck()

    expect(confirmMock).not.toHaveBeenCalled()
    expect(registersStore.finishPassportCheck).toHaveBeenCalledWith(1)
    expect(registersStore.getById).toHaveBeenCalledWith(1)
    expect(loadParcels).toHaveBeenCalledTimes(1)
  })

  it('uses the legacy warning when live pending state is newer than zero exact counts', async () => {
    registersStore.item.hasPendingPassportChecks = true
    registersStore.item.passportChecksNotCheckedCount = 0
    registersStore.item.passportChecksInProgressCount = 0
    confirmMock.mockResolvedValueOnce(false)
    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await actions.finishPassportCheck()

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content:
          'Из таможенного оформления могут быть исключены посылки с незавершённой проверкой паспорта получателя. Продолжить?'
      })
    )
    expect(registersStore.finishPassportCheck).not.toHaveBeenCalled()
  })

  it('locks other header actions while finish confirmation is pending', async () => {
    const confirmation = createDeferred()
    confirmMock.mockReturnValueOnce(confirmation.promise)
    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const finishPromise = actions.finishPassportCheck()
    expect(actions.generalActionsDisabled.value).toBe(true)

    await actions.checkPassports()
    expect(registersStore.checkPassports).not.toHaveBeenCalled()

    confirmation.resolve(false)
    await finishPromise
    expect(actions.generalActionsDisabled.value).toBe(false)
  })

  it('warns before restarting register passport checks after a prior finish', async () => {
    registersStore.item.passportCheckWasFinished = true
    registersStore.item.parcelsTotal = 12
    confirmMock.mockResolvedValueOnce(false)
    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await actions.checkPassports()

    expect(registersStore.getById).toHaveBeenCalledWith(1)
    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Подтверждение',
      confirmationText: 'Применить',
      cancellationText: 'Отменить',
      content: expect.stringContaining('проверку паспортов, хотя')
    }))
    expect(registersStore.checkPassports).not.toHaveBeenCalled()
  })

  it('reports a passport decision refresh failure once and prevents mutation', async () => {
    const error = new Error('refresh failed')
    registersStore.getById.mockRejectedValueOnce(error)
    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await actions.finishPassportCheck()

    expect(alertStore.error).toHaveBeenCalledOnce()
    expect(alertStore.error).toHaveBeenCalledWith(error, {
      fallback: 'Не удалось обновить данные реестра'
    })
    expect(confirmMock).not.toHaveBeenCalled()
    expect(registersStore.finishPassportCheck).not.toHaveBeenCalled()
  })

  it('reloads visible register and parcel rows before reporting a cached detail failure', async () => {
    const error = new Error('Не удалось обновить сохранённую карточку')
    const order = []
    registersStore.getById.mockImplementation(async () => { order.push('register') })
    loadParcels.mockImplementation(async () => { order.push('list') })
    registersStore.refreshCustomsChargeDetails.mockImplementation(async () => { order.push('detail'); throw error })
    const actions = useRegisterHeaderActions({ registersStore, alertStore, runningAction, tableLoading,
      registerLoading, loadParcels, isComponentMounted })
    await actions.calculateCustomsCharges()
    expect(order).toEqual(['register', 'list', 'detail'])
    expect(alertStore.error).toHaveBeenCalledTimes(1)
    expect(actions.actionDialog.show).toBe(false)
  })
  it('does not refresh cached cards after an already handled parcel reload failure', async () => {
    loadParcels.mockResolvedValueOnce(false)
    const actions = useRegisterHeaderActions({ registersStore, alertStore, runningAction, tableLoading,
      registerLoading, loadParcels, isComponentMounted })
    await actions.calculateCustomsCharges()
    expect(loadParcels).toHaveBeenCalledTimes(1)
    expect(registersStore.refreshCustomsChargeDetails).not.toHaveBeenCalled()
    expect(alertStore.error).not.toHaveBeenCalled()
  })})
