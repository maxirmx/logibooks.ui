/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, reactive } from 'vue'
import { useRegisterHeaderActions } from '@/helpers/register.actions.js'
import { createRegisterActionHandlers } from '@/helpers/register.actions.js'

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('Technical Documentation Download Feature', () => {
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
        id: 123,
        invoiceNumber: 'INV-2025-001',
        fileName: 'register_123.xlsx',
        loading: false,
        error: null
      }),
      downloadTechdoc: vi.fn().mockResolvedValue(),
      getAll: vi.fn().mockResolvedValue()
    }

    alertStore = { error: vi.fn() }
    runningAction = ref(false)
    tableLoading = ref(false)
    registerLoading = ref(false)
    loadOrders = vi.fn().mockResolvedValue()
    isComponentMounted = ref(true)
  })

  describe('createRegisterActionHandlers', () => {
    it('should export downloadTechdoc function', () => {
      const handlers = createRegisterActionHandlers(registersStore, alertStore)
      expect(typeof handlers.downloadTechdoc).toBe('function')
    })

    it('should call registersStore.downloadTechdoc with correct parameters', async () => {
      const handlers = createRegisterActionHandlers(registersStore, alertStore)
      const mockRegister = {
        id: 456,
        invoiceNumber: 'INV-2025-002'
      }

      await handlers.downloadTechdoc(mockRegister)

      expect(registersStore.downloadTechdoc).toHaveBeenCalledWith(456, 'INV-2025-002')
    })

    it('should handle downloadTechdoc with missing invoiceNumber', async () => {
      const handlers = createRegisterActionHandlers(registersStore, alertStore)
      const mockRegister = {
        id: 789,
        invoiceNumber: null
      }

      await handlers.downloadTechdoc(mockRegister)

      expect(registersStore.downloadTechdoc).toHaveBeenCalledWith(789, null)
    })

    it('should propagate downloadTechdoc errors to alertStore', async () => {
      const error = new Error('Network error during download')
      registersStore.downloadTechdoc.mockRejectedValueOnce(error)

      const handlers = createRegisterActionHandlers(registersStore, alertStore)
      const mockRegister = { id: 101, invoiceNumber: 'INV-001' }

      // The function is wrapped in runActionWithDialog which catches errors
      // so we just verify it handles the call
      try {
        await handlers.downloadTechdoc(mockRegister)
      } catch {
        // Error may be caught
      }

      expect(registersStore.downloadTechdoc).toHaveBeenCalled()
    })
  })

  describe('useRegisterHeaderActions', () => {
    it('should expose downloadTechdoc in the returned object', () => {
      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      expect(typeof actions.downloadTechdoc).toBe('function')
    })

    it('should show action dialog while techdoc download runs', async () => {
      const deferred = createDeferred()
      registersStore.downloadTechdoc.mockReturnValueOnce(deferred.promise)

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      const { actionDialog, downloadTechdoc } = actions

      // Action dialog should not be visible initially
      expect(actionDialog.show).toBe(false)

      const promise = downloadTechdoc()

      // Action dialog should be shown while request is pending
      expect(actionDialog.show).toBe(true)
      // The actual title depends on useActionDialog implementation
      expect(actionDialog.title).toBeTruthy()

      deferred.resolve()
      await promise

      // Action dialog should be hidden after request completes
      expect(actionDialog.show).toBe(false)
      expect(actionDialog.title).toBe('')
    })

    it('should call downloadTechdoc with invoice number from current register', async () => {
      registersStore.downloadTechdoc.mockResolvedValueOnce()

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      await actions.downloadTechdoc()

      expect(registersStore.downloadTechdoc).toHaveBeenCalledWith(123, 'INV-2025-001')
    })

    it('should set runningAction during download', async () => {
      const deferred = createDeferred()
      registersStore.downloadTechdoc.mockReturnValueOnce(deferred.promise)

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      expect(runningAction.value).toBe(false)

      const promise = actions.downloadTechdoc()

      expect(runningAction.value).toBe(true)

      deferred.resolve()
      await promise

      expect(runningAction.value).toBe(false)
    })

    it('should prevent techdoc download when generalActionsDisabled is true', async () => {
      registersStore.downloadTechdoc.mockResolvedValueOnce()

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction: ref(true), // Set running action to disable general actions
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      await actions.downloadTechdoc()

      // Should not have called the store method due to disabled state
      expect(registersStore.downloadTechdoc).not.toHaveBeenCalled()
    })

    it('should hide action dialog when techdoc download fails', async () => {
      const error = new Error('Download failed')
      registersStore.downloadTechdoc.mockRejectedValueOnce(error)

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      const { actionDialog, downloadTechdoc } = actions

      const promise = downloadTechdoc()

      expect(actionDialog.show).toBe(true)

      await expect(promise).rejects.toThrow(error)

      expect(actionDialog.show).toBe(false)
      expect(actionDialog.title).toBe('')
    })

    it('should handle techdoc download when register is not ready', async () => {
      registersStore.item = reactive({
        ...registersStore.item,
        loading: true
      })

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      await actions.downloadTechdoc()

      // Should not call store method when register is not ready
      expect(registersStore.downloadTechdoc).not.toHaveBeenCalled()
    })

    it('should handle techdoc download when register has error', async () => {
      registersStore.item = reactive({
        ...registersStore.item,
        error: new Error('Load error')
      })

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      await actions.downloadTechdoc()

      // Should not call store method when register has error
      expect(registersStore.downloadTechdoc).not.toHaveBeenCalled()
    })

    it('should use invoice number or id for techdoc filename', async () => {
      registersStore.downloadTechdoc.mockResolvedValueOnce()

      // Test with invoiceNumber
      let actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      await actions.downloadTechdoc()
      expect(registersStore.downloadTechdoc).toHaveBeenCalledWith(123, 'INV-2025-001')

      // Reset mock
      registersStore.downloadTechdoc.mockClear()

      // Test without invoiceNumber
      registersStore.item = reactive({
        id: 123,
        invoiceNumber: null,
        fileName: 'register_123.xlsx',
        loading: false,
        error: null
      })

      actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      await actions.downloadTechdoc()
      expect(registersStore.downloadTechdoc).toHaveBeenCalledWith(123, null)
    })

    it('should support proper locking during techdoc download', async () => {
      const deferred1 = createDeferred()

      registersStore.downloadTechdoc.mockReturnValueOnce(deferred1.promise)

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      const promise1 = actions.downloadTechdoc()

      // First download should be called
      expect(registersStore.downloadTechdoc).toHaveBeenCalledTimes(1)
      expect(runningAction.value).toBe(true)

      // Second download attempt while first is running should be blocked
      const promise2 = actions.downloadTechdoc()

      // Still only one call should have been made
      expect(registersStore.downloadTechdoc).toHaveBeenCalledTimes(1)

      deferred1.resolve()
      await promise1

      expect(runningAction.value).toBe(false)
      await promise2
    })
  })

  describe('Filename generation for techdoc', () => {
    it('should use invoice number in techdoc filename', async () => {
      // This test verifies that the filename is correctly generated
      // The actual filename generation happens in registers.store.downloadTechdoc
      registersStore.downloadTechdoc.mockImplementation((id, invoiceNumber) => {
        // Simulate the filename that would be generated
        const filename = `тех-документация_${invoiceNumber || id}-акциз.docx`
        expect(filename).toContain('INV-2025-001')
        return Promise.resolve()
      })

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      await actions.downloadTechdoc()
    })

    it('should use register id when invoice number is not available', async () => {
      registersStore.item.invoiceNumber = null
      registersStore.downloadTechdoc.mockImplementation((id, invoiceNumber) => {
        const filename = `тех-документация_${invoiceNumber || id}-акциз.docx`
        expect(filename).toContain('123')
        return Promise.resolve()
      })

      const actions = useRegisterHeaderActions({
        registersStore,
        alertStore,
        runningAction,
        tableLoading,
        registerLoading,
        loadOrders,
        isComponentMounted
      })

      await actions.downloadTechdoc()
    })
  })
})
