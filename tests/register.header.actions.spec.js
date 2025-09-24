/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, reactive } from 'vue'
import { useRegisterHeaderActions } from '@/helpers/register.actions.js'

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
  let loadOrders
  let isComponentMounted

  beforeEach(() => {
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
      getLookupFeacnCodesProgress: vi.fn(),
      cancelLookupFeacnCodes: vi.fn(),
      generate: vi.fn().mockResolvedValue(),
      generateWithoutExcise: vi.fn().mockResolvedValue(),
      generateExcise: vi.fn().mockResolvedValue(),
      download: vi.fn().mockResolvedValue(),
      getAll: vi.fn().mockResolvedValue()
    }

    alertStore = { error: vi.fn() }
    runningAction = ref(false)
    tableLoading = ref(false)
    registerLoading = ref(false)
    loadOrders = vi.fn().mockResolvedValue()
    isComponentMounted = ref(true)
  })

  it('shows action dialog while export without excise runs', async () => {
    const deferred = createDeferred()
    registersStore.generateWithoutExcise.mockReturnValueOnce(deferred.promise)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadOrders,
      isComponentMounted
    })

    const { actionDialog, exportAllXmlWithoutExcise } = actions

    const promise = exportAllXmlWithoutExcise()

    expect(actionDialog.show).toBe(true)
    expect(actionDialog.title).toBe('Подготовка файлов')
    expect(registersStore.generateWithoutExcise).toHaveBeenCalledWith(1, 'INV-1')

    deferred.resolve()
    await promise

    expect(actionDialog.show).toBe(false)
    expect(actionDialog.title).toBe('')
  })

  it('hides action dialog when download fails', async () => {
    const error = new Error('Download failed')
    registersStore.download.mockRejectedValueOnce(error)

    const actions = useRegisterHeaderActions({
      registersStore,
      alertStore,
      runningAction,
      tableLoading,
      registerLoading,
      loadOrders,
      isComponentMounted
    })

    const { actionDialog, downloadRegister } = actions

    const promise = downloadRegister()

    expect(actionDialog.show).toBe(true)

    await expect(promise).rejects.toThrow(error)

    expect(actionDialog.show).toBe(false)
    expect(actionDialog.title).toBe('')
  })
})
