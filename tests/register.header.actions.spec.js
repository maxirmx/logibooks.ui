/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, reactive } from 'vue'
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
      download: vi.fn().mockResolvedValue(),
      getDownloadFormats: vi.fn().mockResolvedValue({ company: { available: true, name: 'Receiver' } }),
      downloadAdditionalRestrictions: vi.fn().mockResolvedValue(),
      downloadPackingList: vi.fn().mockResolvedValue(),
      downloadTajikistanManifestFile: vi.fn().mockResolvedValue(),
      freezeCheckStatus: vi.fn().mockResolvedValue(),
      freezeTnVedOrder: vi.fn().mockResolvedValue(),
      checkPassports: vi.fn().mockResolvedValue(),
      finishPassportCheck: vi.fn().mockResolvedValue(),
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

  it('reports a supported paperwork download error once and retries the same format', async () => {
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
    expect(await alertStore.error.mock.calls[0][1].action.handler()).toBe(true)
    expect(registersStore.getDownloadFormats).toHaveBeenCalledTimes(1)
    expect(registersStore.download).toHaveBeenNthCalledWith(2, 1, 'register.xlsx', null, undefined, false, 'company')
  })

  it('initiates extended FEACN lookup with withFCMatch=true', async () => {
    // Simulate API handle response
    registersStore.lookupFeacnCodes.mockResolvedValueOnce({ id: 'handle-ex' })
    registersStore.getLookupFeacnCodesProgress.mockResolvedValueOnce({
      total: 10,
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

    const { lookupFeacnCodesEx, validationState, progressPercent } = actions
    await lookupFeacnCodesEx()

    // Should call store method with second param true
    expect(registersStore.lookupFeacnCodes).toHaveBeenCalledWith(1, 2)
    expect(validationState.operation).toBe('lookup-feacn-codes')
    // After initial poll, progress total should reflect mocked value
    expect(validationState.total).toBe(10)
    expect(progressPercent.value).toBe(0)
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
    expect(registersStore.generateOrdinary).toHaveBeenCalledWith(1, 'INV-1', false)
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

  it('reports export errors through alertStore without rejecting', async () => {
    const error = new Error('Export failed')
    registersStore.generateOrdinary.mockRejectedValueOnce(error)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    await expect(actions.exportAllXmlOrdinary()).resolves.toBeUndefined()

    expect(registersStore.generateOrdinary).toHaveBeenCalledWith(1, 'INV-1', false)
    expect(alertStore.error).toHaveBeenCalledWith('Export failed')
    expect(actions.actionDialog.show).toBe(false)
    expect(runningAction.value).toBe(false)
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
    expect(actions.validationState.show).toBe(false)
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

  it('shows action dialog while custom charges are calculated and refreshes current data', async () => {
    const deferred = createDeferred()
    registersStore.calculateCustomsCharges.mockReturnValueOnce(deferred.promise)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const promise = actions.calculateCustomsCharges()

    expect(actions.actionDialog.show).toBe(true)
    expect(actions.actionDialog.title).toBe('Расчёт сборов и пошлин')
    expect(registersStore.calculateCustomsCharges).toHaveBeenCalledWith(1)

    deferred.resolve()
    await promise

    expect(registersStore.getById).toHaveBeenCalledWith(1)
    expect(loadParcels).toHaveBeenCalled()
    expect(actions.actionDialog.show).toBe(false)
    expect(actions.actionDialog.title).toBe('')
  })

})
