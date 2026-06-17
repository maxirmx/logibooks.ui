/* @vitest-environment jsdom */
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, reactive } from 'vue'
import { useRegisterHeaderActions } from '@/helpers/register.actions.js'

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
      downloadAdditionalRestrictions: vi.fn().mockResolvedValue(),
      freezeCheckStatus: vi.fn().mockResolvedValue(),
      freezeTnVedOrder: vi.fn().mockResolvedValue(),
      getAll: vi.fn().mockResolvedValue()
    }

    alertStore = { error: vi.fn() }
    runningAction = ref(false)
    tableLoading = ref(false)
    registerLoading = ref(false)
    loadParcels = vi.fn().mockResolvedValue()
    isComponentMounted = ref(true)
  })

  it('initiates extended FEACN lookup with withFCMatch=true', async () => {
    // Simulate API handle response
    registersStore.lookupFeacnCodes.mockResolvedValueOnce({ id: 'handle-ex' })
    registersStore.getLookupFeacnCodesProgress.mockResolvedValueOnce({ total: 10, processed: 0, finished: false })

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

  it('shows action dialog while export without excise runs', async () => {
    const deferred = createDeferred()
    registersStore.generateOrdinary.mockReturnValueOnce(deferred.promise)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const { actionDialog, exportAllXmlOrdinary } = actions

    const promise = exportAllXmlOrdinary()

    expect(actionDialog.show).toBe(true)
    expect(actionDialog.title).toBe('Подготовка файлов')
    expect(registersStore.generateOrdinary).toHaveBeenCalledWith(1, 'INV-1', false)

    deferred.resolve()
    await promise

    expect(actionDialog.show).toBe(false)
    expect(actionDialog.title).toBe('')
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

    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Применить поправочный коэффициент 0,500 для веса посылок?'
    }))
    expect(registersStore.generateOrdinary).toHaveBeenCalledWith(1, 'INV-1', false)
    expect(actions.actionDialog.show).toBe(false)
  })

  it('exports corrected XML when weight correction is accepted', async () => {
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

    await actions.exportAllXmlOrdinary()

    expect(registersStore.generateOrdinary).toHaveBeenCalledWith(1, 'INV-1', true)
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

    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Применить поправочный коэффициент 0,500 для веса посылок?'
    }))
    expect(registersStore.download).toHaveBeenCalledWith(1, 'register.xlsx', null, null, true)
  })

  it('downloads register without correction when correction is declined', async () => {
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

    await actions.downloadRegister()

    expect(registersStore.download).toHaveBeenCalledWith(1, 'register.xlsx')
    expect(actions.actionDialog.show).toBe(false)
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

  it('shows action dialog while additional restrictions download runs', async () => {
    const deferred = createDeferred()
    registersStore.downloadAdditionalRestrictions.mockReturnValueOnce(deferred.promise)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const { actionDialog, downloadAdditionalRestrictions } = actions

    const promise = downloadAdditionalRestrictions()

    expect(actionDialog.show).toBe(true)
    expect(actionDialog.title).toBe('Подготовка файла реестра')
    expect(registersStore.downloadAdditionalRestrictions).toHaveBeenCalledWith(1, 'INV-1')

    deferred.resolve()
    await promise

    expect(actionDialog.show).toBe(false)
    expect(actionDialog.title).toBe('')
  })

  it('does not offer correction before additional restrictions download', async () => {
    registersStore.item.realWeightKg = 5
    registersStore.item.totalWeightKgToRelease = 10
    const deferred = createDeferred()
    registersStore.downloadAdditionalRestrictions.mockReturnValueOnce(deferred.promise)

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

    expect(confirmMock).not.toHaveBeenCalled()
    expect(actions.actionDialog.show).toBe(true)
    expect(registersStore.downloadAdditionalRestrictions).toHaveBeenCalledWith(1, 'INV-1')

    deferred.resolve()
    await promise
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

  it('locks duplicate additional restrictions downloads while one is running', async () => {
    const deferred = createDeferred()
    registersStore.downloadAdditionalRestrictions.mockReturnValueOnce(deferred.promise)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const firstPromise = actions.downloadAdditionalRestrictions()
    const secondPromise = actions.downloadAdditionalRestrictions()

    expect(registersStore.downloadAdditionalRestrictions).toHaveBeenCalledTimes(1)

    deferred.resolve()
    await firstPromise
    await secondPromise
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
    registersStore.getLookupFeacnCodesProgress.mockResolvedValueOnce({ total: 5, processed: 0, finished: false })

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

  it('shows action dialog while freeze check status runs', async () => {
    const deferred = createDeferred()
    registersStore.freezeCheckStatus.mockReturnValueOnce(deferred.promise)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadParcels,
      isComponentMounted
    })

    const { actionDialog, freezeCheckStatus } = actions

    const promise = freezeCheckStatus()

    expect(actionDialog.show).toBe(true)
    expect(actionDialog.title).toBe('Применение запретов')
    expect(registersStore.freezeCheckStatus).toHaveBeenCalledWith(1)

    deferred.resolve()
    await promise

    expect(actionDialog.show).toBe(false)
    expect(actionDialog.title).toBe('')
  })
})
