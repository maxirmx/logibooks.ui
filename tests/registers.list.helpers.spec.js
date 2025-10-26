/* @vitest-environment jsdom */
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive } from 'vue'
import {
  initializeBulkStatusState,
  toggleBulkStatusEditMode,
  cancelBulkStatusChange,
  validateBulkStatusParams,
  resetBulkStatusState,
  applyBulkStatusToAllOrders,
  isBulkStatusEditMode,
  getBulkStatusSelectedId,
  setBulkStatusSelectedId,
  createValidationState,
  calculateValidationProgress,
  pollValidation,
  validateRegister,
  cancelValidation,
  createPollingTimer,
  createRegisterActionHandlers,
  POLLING_INTERVAL_MS
} from '@/helpers/registers.list.helpers'

describe('registers.list.helpers', () => {
  let bulkStatusState
  let mockRegistersStore
  let mockAlertStore

  beforeEach(() => {
    bulkStatusState = reactive({})
    mockRegistersStore = {
      setParcelStatuses: vi.fn(),
      getAll: vi.fn(),
      error: null
    }
    mockAlertStore = {
      success: vi.fn(),
      error: vi.fn()
    }
    vi.clearAllMocks()
  })

  describe('initializeBulkStatusState', () => {
    it('initializes state if it does not exist', () => {
      const registerId = 1
      
      initializeBulkStatusState(registerId, bulkStatusState)
      
      expect(bulkStatusState[registerId]).toBeDefined()
      expect(bulkStatusState[registerId].editMode).toBe(false)
      expect(bulkStatusState[registerId].selectedStatusId).toBeNull()
    })

    it('does not overwrite existing state', () => {
      const registerId = 1
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: 5
      }
      
      initializeBulkStatusState(registerId, bulkStatusState)
      
      expect(bulkStatusState[registerId].editMode).toBe(true)
      expect(bulkStatusState[registerId].selectedStatusId).toBe(5)
    })
  })

  describe('toggleBulkStatusEditMode', () => {
    it('toggles edit mode from false to true', () => {
      const registerId = 1
      const loading = false
      
      toggleBulkStatusEditMode(registerId, bulkStatusState, loading)
      
      expect(bulkStatusState[registerId].editMode).toBe(true)
      expect(bulkStatusState[registerId].selectedStatusId).toBeNull()
    })

    it('toggles edit mode from true to false', () => {
      const registerId = 1
      const loading = false
      
      // First toggle to enter edit mode
      toggleBulkStatusEditMode(registerId, bulkStatusState, loading)
      bulkStatusState[registerId].selectedStatusId = 3
      
      // Second toggle to exit edit mode
      toggleBulkStatusEditMode(registerId, bulkStatusState, loading)
      
      expect(bulkStatusState[registerId].editMode).toBe(false)
    })

    it('does not toggle when loading is true', () => {
      const registerId = 1
      const loading = true
      
      toggleBulkStatusEditMode(registerId, bulkStatusState, loading)
      
      expect(bulkStatusState[registerId]).toBeUndefined()
    })

    it('clears selectedStatusId when entering edit mode', () => {
      const registerId = 1
      const loading = false
      
      // Initialize with some state
      bulkStatusState[registerId] = {
        editMode: false,
        selectedStatusId: 5
      }
      
      toggleBulkStatusEditMode(registerId, bulkStatusState, loading)
      
      expect(bulkStatusState[registerId].editMode).toBe(true)
      expect(bulkStatusState[registerId].selectedStatusId).toBeNull()
    })
  })

  describe('cancelBulkStatusChange', () => {
    it('resets state when state exists', () => {
      const registerId = 1
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: 3
      }
      
      cancelBulkStatusChange(registerId, bulkStatusState)
      
      expect(bulkStatusState[registerId].editMode).toBe(false)
      expect(bulkStatusState[registerId].selectedStatusId).toBeNull()
    })

    it('handles case when state does not exist', () => {
      const registerId = 1
      
      expect(() => {
        cancelBulkStatusChange(registerId, bulkStatusState)
      }).not.toThrow()
    })
  })

  describe('validateBulkStatusParams', () => {
    it('returns invalid for missing registerId', () => {
      const result = validateBulkStatusParams(null, 1)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Не указан реестр или статус для изменения')
    })

    it('returns invalid for missing statusId', () => {
      const result = validateBulkStatusParams(1, null)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Не указан реестр или статус для изменения')
    })

    it('returns invalid for statusId = 0', () => {
      const result = validateBulkStatusParams(1, 0)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Не указан реестр или статус для изменения')
    })

    it('returns invalid for negative statusId', () => {
      const result = validateBulkStatusParams(1, -1)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Некорректный идентификатор статуса')
    })

    it('returns invalid for non-numeric statusId', () => {
      const result = validateBulkStatusParams(1, 'invalid')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Некорректный идентификатор статуса')
    })

    it('returns valid for valid parameters', () => {
      const result = validateBulkStatusParams(1, 5)
      
      expect(result.isValid).toBe(true)
      expect(result.numericStatusId).toBe(5)
    })

    it('converts string statusId to number', () => {
      const result = validateBulkStatusParams(1, '5')
      
      expect(result.isValid).toBe(true)
      expect(result.numericStatusId).toBe(5)
    })
  })

  describe('resetBulkStatusState', () => {
    it('resets state when state exists', () => {
      const registerId = 1
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: 3
      }
      
      resetBulkStatusState(registerId, bulkStatusState)
      
      expect(bulkStatusState[registerId].editMode).toBe(false)
      expect(bulkStatusState[registerId].selectedStatusId).toBeNull()
    })

    it('handles case when state does not exist', () => {
      const registerId = 1
      
      expect(() => {
        resetBulkStatusState(registerId, bulkStatusState)
      }).not.toThrow()
    })
  })

  describe('applyBulkStatusToAllOrders', () => {
    it('validates parameters and shows error for invalid input', async () => {
      await applyBulkStatusToAllOrders(null, 1, bulkStatusState, mockRegistersStore, mockAlertStore)
      
      expect(mockAlertStore.error).toHaveBeenCalledWith('Не указан реестр или статус для изменения')
      expect(mockRegistersStore.setParcelStatuses).not.toHaveBeenCalled()
    })

    it('successfully applies status and shows success message', async () => {
      const registerId = 1
      const statusId = 5
      
      mockRegistersStore.setParcelStatuses.mockResolvedValueOnce()
      
      // Initialize state
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: statusId
      }
      
      await applyBulkStatusToAllOrders(registerId, statusId, bulkStatusState, mockRegistersStore, mockAlertStore)
      
      expect(mockRegistersStore.setParcelStatuses).toHaveBeenCalledWith(registerId, statusId)
      expect(mockAlertStore.success).toHaveBeenCalledWith('Статус успешно применен ко всем посылкам в реестре')
      expect(bulkStatusState[registerId].editMode).toBe(false)
      expect(bulkStatusState[registerId].selectedStatusId).toBeNull()
      expect(mockRegistersStore.getAll).toHaveBeenCalled()
    })

    it('handles error from store and shows error message', async () => {
      const registerId = 1
      const statusId = 5
      const errorMessage = 'Server error'
      
      mockRegistersStore.setParcelStatuses.mockRejectedValueOnce(new Error(errorMessage))
      
      // Initialize state
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: statusId
      }
      
      await applyBulkStatusToAllOrders(registerId, statusId, bulkStatusState, mockRegistersStore, mockAlertStore)
      
      expect(mockRegistersStore.setParcelStatuses).toHaveBeenCalledWith(registerId, statusId)
      expect(mockAlertStore.error).toHaveBeenCalledWith(errorMessage)
      expect(bulkStatusState[registerId].editMode).toBe(false)
      expect(bulkStatusState[registerId].selectedStatusId).toBeNull()
      expect(mockRegistersStore.getAll).toHaveBeenCalled()
    })

    it('uses store error message when error has no message', async () => {
      const registerId = 1
      const statusId = 5
      const storeErrorMessage = 'Store error'
      
      mockRegistersStore.setParcelStatuses.mockRejectedValueOnce(new Error())
      mockRegistersStore.error = { message: storeErrorMessage }
      
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: statusId
      }
      
      await applyBulkStatusToAllOrders(registerId, statusId, bulkStatusState, mockRegistersStore, mockAlertStore)
      
      expect(mockAlertStore.error).toHaveBeenCalledWith(storeErrorMessage)
    })

    it('uses default error message when no error message available', async () => {
      const registerId = 1
      const statusId = 5
      
      mockRegistersStore.setParcelStatuses.mockRejectedValueOnce(new Error())
      mockRegistersStore.error = null
      
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: statusId
      }
      
      await applyBulkStatusToAllOrders(registerId, statusId, bulkStatusState, mockRegistersStore, mockAlertStore)
      
      expect(mockAlertStore.error).toHaveBeenCalledWith('Ошибка при обновлении статусов посылок')
    })
  })

  describe('isBulkStatusEditMode', () => {
    it('returns true when in edit mode', () => {
      const registerId = 1
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: null
      }
      
      const result = isBulkStatusEditMode(registerId, bulkStatusState)
      
      expect(result).toBe(true)
    })

    it('returns false when not in edit mode', () => {
      const registerId = 1
      bulkStatusState[registerId] = {
        editMode: false,
        selectedStatusId: null
      }
      
      const result = isBulkStatusEditMode(registerId, bulkStatusState)
      
      expect(result).toBe(false)
    })

    it('returns false when state does not exist', () => {
      const registerId = 1
      
      const result = isBulkStatusEditMode(registerId, bulkStatusState)
      
      expect(result).toBe(false)
    })
  })

  describe('getBulkStatusSelectedId', () => {
    it('returns selected status ID when it exists', () => {
      const registerId = 1
      const statusId = 5
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: statusId
      }
      
      const result = getBulkStatusSelectedId(registerId, bulkStatusState)
      
      expect(result).toBe(statusId)
    })

    it('returns null when selectedStatusId is null', () => {
      const registerId = 1
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: null
      }
      
      const result = getBulkStatusSelectedId(registerId, bulkStatusState)
      
      expect(result).toBeNull()
    })

    it('returns null when state does not exist', () => {
      const registerId = 1
      
      const result = getBulkStatusSelectedId(registerId, bulkStatusState)
      
      expect(result).toBeNull()
    })
  })

  describe('setBulkStatusSelectedId', () => {
    it('sets selected status ID and initializes state if needed', () => {
      const registerId = 1
      const statusId = 7
      
      setBulkStatusSelectedId(registerId, statusId, bulkStatusState)
      
      expect(bulkStatusState[registerId]).toBeDefined()
      expect(bulkStatusState[registerId].selectedStatusId).toBe(statusId)
      expect(bulkStatusState[registerId].editMode).toBe(false) // initialized as false
    })

    it('sets selected status ID when state already exists', () => {
      const registerId = 1
      const statusId = 7
      bulkStatusState[registerId] = {
        editMode: true,
        selectedStatusId: 3
      }
      
      setBulkStatusSelectedId(registerId, statusId, bulkStatusState)
      
      expect(bulkStatusState[registerId].selectedStatusId).toBe(statusId)
      expect(bulkStatusState[registerId].editMode).toBe(true) // preserved
    })
  })

  describe('Validation Support Functions', () => {
    let mockRegistersStore
    let mockAlertStore
    let validationState

    beforeEach(() => {
      mockRegistersStore = {
        validate: vi.fn(),
        getValidationProgress: vi.fn(),
        cancelValidation: vi.fn(),
        getAll: vi.fn()
      }
      mockAlertStore = {
        error: vi.fn()
      }
      validationState = createValidationState()
      vi.clearAllMocks()
    })

    describe('createValidationState', () => {
      it('creates initial validation state object', () => {
        const state = createValidationState()
        
        expect(state).toEqual({
          show: false,
          handleId: null,
          total: 0,
          processed: 0
        })
      })
    })

    describe('calculateValidationProgress', () => {
      it('returns 0 when total is 0', () => {
        validationState.total = 0
        validationState.processed = 10
        
        const progress = calculateValidationProgress(validationState)
        
        expect(progress).toBe(0)
      })

      it('returns 0 when total is negative', () => {
        validationState.total = -1
        validationState.processed = 10
        
        const progress = calculateValidationProgress(validationState)
        
        expect(progress).toBe(0)
      })

      it('calculates correct percentage', () => {
        validationState.total = 100
        validationState.processed = 25
        
        const progress = calculateValidationProgress(validationState)
        
        expect(progress).toBe(25)
      })

      it('rounds percentage correctly', () => {
        validationState.total = 3
        validationState.processed = 1
        
        const progress = calculateValidationProgress(validationState)
        
        expect(progress).toBe(33) // Math.round(33.333...)
      })
    })

    describe('pollValidation', () => {
      let stopPollingFn

      beforeEach(() => {
        stopPollingFn = vi.fn()
        validationState.handleId = 'test-handle-123'
      })

      it('does nothing when no handleId', async () => {
        validationState.handleId = null
        
        await pollValidation(validationState, mockRegistersStore, mockAlertStore, stopPollingFn)
        
        expect(mockRegistersStore.getValidationProgress).not.toHaveBeenCalled()
      })

      it('updates progress correctly', async () => {
        const progressData = {
          total: 100,
          processed: 50,
          finished: false
        }
        mockRegistersStore.getValidationProgress.mockResolvedValueOnce(progressData)
        
        await pollValidation(validationState, mockRegistersStore, mockAlertStore, stopPollingFn)
        
        expect(mockRegistersStore.getValidationProgress).toHaveBeenCalledWith('test-handle-123')
        expect(validationState.total).toBe(100)
        expect(validationState.processed).toBe(50)
        expect(validationState.show).toBe(false) // Initial state was false
        expect(stopPollingFn).not.toHaveBeenCalled()
      })

      it('stops polling when finished', async () => {
        validationState.show = true
        const progressData = {
          total: 100,
          processed: 100,
          finished: true
        }
        mockRegistersStore.getValidationProgress.mockResolvedValueOnce(progressData)
        
        await pollValidation(validationState, mockRegistersStore, mockAlertStore, stopPollingFn)
        
        expect(validationState.show).toBe(false)
        expect(stopPollingFn).toHaveBeenCalled()
        expect(mockRegistersStore.getAll).toHaveBeenCalled()
      })

      it('stops polling when total is -1', async () => {
        validationState.show = true
        const progressData = {
          total: -1,
          processed: 0,
          finished: false
        }
        mockRegistersStore.getValidationProgress.mockResolvedValueOnce(progressData)
        
        await pollValidation(validationState, mockRegistersStore, mockAlertStore, stopPollingFn)
        
        expect(validationState.show).toBe(false)
        expect(stopPollingFn).toHaveBeenCalled()
        expect(mockRegistersStore.getAll).toHaveBeenCalled()
      })

      it('stops polling when processed is -1', async () => {
        validationState.show = true
        const progressData = {
          total: 100,
          processed: -1,
          finished: false
        }
        mockRegistersStore.getValidationProgress.mockResolvedValueOnce(progressData)
        
        await pollValidation(validationState, mockRegistersStore, mockAlertStore, stopPollingFn)
        
        expect(validationState.show).toBe(false)
        expect(stopPollingFn).toHaveBeenCalled()
        expect(mockRegistersStore.getAll).toHaveBeenCalled()
      })

      it('handles polling errors', async () => {
        validationState.show = true
        const errorMessage = 'Polling failed'
        mockRegistersStore.getValidationProgress.mockRejectedValueOnce(new Error(errorMessage))
        
        await pollValidation(validationState, mockRegistersStore, mockAlertStore, stopPollingFn)
        
        expect(mockAlertStore.error).toHaveBeenCalledWith(errorMessage)
        expect(validationState.show).toBe(false)
        expect(stopPollingFn).toHaveBeenCalled()
        expect(mockRegistersStore.getAll).toHaveBeenCalled()
      })
    })

    describe('validateRegister', () => {
      let stopPollingFn
      let startPollingFn
      let item

      beforeEach(() => {
        stopPollingFn = vi.fn()
        startPollingFn = vi.fn()
        item = { id: 123 }
      })

      it('starts validation successfully', async () => {
        const validationResult = { id: 'validation-handle-123' }
        mockRegistersStore.validate.mockResolvedValueOnce(validationResult)
        mockRegistersStore.getValidationProgress.mockResolvedValueOnce({
          total: 100,
          processed: 0,
          finished: false
        })
        
        await validateRegister(item, validationState, mockRegistersStore, mockAlertStore, stopPollingFn, startPollingFn, true)

        expect(stopPollingFn).toHaveBeenCalled()
        expect(mockRegistersStore.validate).toHaveBeenCalledWith(123, true)
        expect(validationState.handleId).toBe('validation-handle-123')
        expect(validationState.total).toBe(100)
        expect(validationState.processed).toBe(0)
        expect(validationState.show).toBe(true)
        expect(startPollingFn).toHaveBeenCalled()
      })

      it('handles validation start errors', async () => {
        const errorMessage = 'Validation failed to start'
        mockRegistersStore.validate.mockRejectedValueOnce(new Error(errorMessage))
        
        await validateRegister(item, validationState, mockRegistersStore, mockAlertStore, stopPollingFn, startPollingFn, false)

        expect(stopPollingFn).toHaveBeenCalled()
        expect(mockRegistersStore.validate).toHaveBeenCalledWith(123, false)
        expect(mockAlertStore.error).toHaveBeenCalledWith(errorMessage)
        expect(validationState.show).toBe(false)
        expect(startPollingFn).not.toHaveBeenCalled()
      })
    })

    describe('cancelValidation', () => {
      let stopPollingFn

      beforeEach(() => {
        stopPollingFn = vi.fn()
      })

      it('cancels validation with handleId', () => {
        validationState.handleId = 'test-handle-123'
        validationState.show = true
        mockRegistersStore.cancelValidation.mockResolvedValueOnce({})
        
        cancelValidation(validationState, mockRegistersStore, stopPollingFn)
        
        expect(mockRegistersStore.cancelValidation).toHaveBeenCalledWith('test-handle-123')
        expect(validationState.show).toBe(false)
        expect(stopPollingFn).toHaveBeenCalled()
      })

      it('cancels validation without handleId', () => {
        validationState.handleId = null
        validationState.show = true
        
        cancelValidation(validationState, mockRegistersStore, stopPollingFn)
        
        expect(mockRegistersStore.cancelValidation).not.toHaveBeenCalled()
        expect(validationState.show).toBe(false)
        expect(stopPollingFn).toHaveBeenCalled()
      })

      it('handles cancellation errors silently', () => {
        validationState.handleId = 'test-handle-123'
        validationState.show = true
        mockRegistersStore.cancelValidation.mockRejectedValueOnce(new Error('Cancellation failed'))
        
        expect(() => {
          cancelValidation(validationState, mockRegistersStore, stopPollingFn)
        }).not.toThrow()
        
        expect(validationState.show).toBe(false)
        expect(stopPollingFn).toHaveBeenCalled()
      })
    })

    describe('createPollingTimer', () => {
      let pollFunction

      beforeEach(() => {
        pollFunction = vi.fn()
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('creates timer with default interval', () => {
        const timer = createPollingTimer(pollFunction)
        
        expect(timer.isRunning()).toBe(false)
        
        timer.start()
        expect(timer.isRunning()).toBe(true)
        
        vi.advanceTimersByTime(POLLING_INTERVAL_MS)
        expect(pollFunction).toHaveBeenCalledTimes(1)
        
        timer.stop()
        expect(timer.isRunning()).toBe(false)
      })

      it('creates timer with custom interval', () => {
        const customInterval = 500
        const timer = createPollingTimer(pollFunction, customInterval)
        
        timer.start()
        
        vi.advanceTimersByTime(customInterval)
        expect(pollFunction).toHaveBeenCalledTimes(1)
        
        vi.advanceTimersByTime(customInterval)
        expect(pollFunction).toHaveBeenCalledTimes(2)
        
        timer.stop()
      })

      it('prevents multiple starts', () => {
        const timer = createPollingTimer(pollFunction)
        
        timer.start()
        timer.start() // Should not create another timer
        
        vi.advanceTimersByTime(POLLING_INTERVAL_MS)
        expect(pollFunction).toHaveBeenCalledTimes(1)
        
        timer.stop()
      })

      it('handles stop when not running', () => {
        const timer = createPollingTimer(pollFunction)
        
        expect(() => timer.stop()).not.toThrow()
        expect(timer.isRunning()).toBe(false)
      })
    })

    describe('POLLING_INTERVAL_MS', () => {
      it('has correct default value', () => {
        expect(POLLING_INTERVAL_MS).toBe(1000)
      })
    })

    describe('createRegisterActionHandlers', () => {
      let registersStore
      let alertStore
      let handlers

      beforeEach(() => {
        vi.clearAllMocks()

        registersStore = {
          generate: vi.fn().mockResolvedValue(),
          generateExcise: vi.fn().mockResolvedValue(),
          generateWithoutExcise: vi.fn().mockResolvedValue(),
          download: vi.fn().mockResolvedValue(),
          validate: vi.fn().mockResolvedValue({ id: 1 }),
          lookupFeacnCodes: vi.fn().mockResolvedValue({ id: 2 }),
          getValidationProgress: vi.fn().mockResolvedValue({ total: 1, processed: 1, finished: true }),
          getLookupFeacnCodesProgress: vi.fn().mockResolvedValue({ total: 1, processed: 1, finished: true }),
          cancelValidation: vi.fn().mockResolvedValue(),
          cancelLookupFeacnCodes: vi.fn().mockResolvedValue(),
          getAll: vi.fn().mockResolvedValue()
        }

        alertStore = { error: vi.fn() }

        handlers = createRegisterActionHandlers(registersStore, alertStore)
      })

      it('validates register via stop-words path and updates state', async () => {
        await handlers.validateRegisterSw({ id: 10 })

        expect(registersStore.validate).toHaveBeenCalledWith(10, true)
        expect(handlers.validationState.operation).toBe('validation')
      })

      it('looks up FEACN codes and tracks handle id', async () => {
        await handlers.lookupFeacnCodes({ id: 5 })

        expect(registersStore.lookupFeacnCodes).toHaveBeenCalledWith(5, 1)
        expect(handlers.validationState.operation).toBe('lookup-feacn-codes')
        expect(handlers.validationState.handleId).toBe(2)
      })

      it('exports XML variants and downloads register files', async () => {
        await handlers.exportAllXmlWithoutExcise({ id: 8, invoiceNumber: 'INV-8' })
        expect(registersStore.generateWithoutExcise).toHaveBeenCalledWith(8, 'INV-8')

        await handlers.exportAllXmlExcise({ id: 9, invoiceNumber: 'INV-9' })
        expect(registersStore.generateExcise).toHaveBeenCalledWith(9, 'INV-9')

        await handlers.downloadRegister({ id: 4, fileName: 'file.xlsx' })
        expect(registersStore.download).toHaveBeenCalledWith(4, 'file.xlsx')
      })

      it('cancels lookup validation and hides dialog', async () => {
        handlers.validationState.operation = 'lookup-feacn-codes'
        handlers.validationState.handleId = 77
        handlers.validationState.show = true

        await handlers.cancelValidation()

        expect(registersStore.cancelLookupFeacnCodes).toHaveBeenCalledWith(77)
        expect(handlers.validationState.show).toBe(false)
      })

      it('exposes stopPolling function', () => {
        expect(() => handlers.stopPolling()).not.toThrow()
      })
    })
  })
})
