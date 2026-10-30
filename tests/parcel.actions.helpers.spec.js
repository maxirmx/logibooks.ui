// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateParcelData, approveParcel, generateXml, runCheckStatusAction } from '@/helpers/parcel.actions.helpers.js'
import { ParcelApprovalMode } from '@/models/parcel.approval.mode.js'

const alertErrorMock = vi.hoisted(() => vi.fn())

// Mock the alert store
vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: vi.fn(() => ({
      error: alertErrorMock,
      warning: vi.fn()
  }))
}))

describe('parcel actions helpers', () => {
  let mockParcelsStore
  let mockItem
  let mockValues
  const parcelId = 123

  beforeEach(() => {
    vi.clearAllMocks()

    mockItem = {
      value: {
        id: parcelId,
        postingNumber: 'ABC123',
        shk: '12345'
      }
    }

    mockValues = {
      id: parcelId,
      statusId: 1,
      productName: 'Test Product'
    }

    mockParcelsStore = {
      update: vi.fn().mockResolvedValue(),
      validate: vi.fn().mockResolvedValue(),
      approve: vi.fn().mockResolvedValue(),
      generate: vi.fn().mockResolvedValue(),
      getById: vi.fn().mockResolvedValue(),
      error: null
    }
  })

  describe('validateParcelData', () => {
    it('should handle validation errors with API message', async () => {
      const error = {
        response: {
          data: {
            message: 'Ошибка проверки'
          }
        }
      }
      mockParcelsStore.update.mockRejectedValue(error)

      await validateParcelData(mockValues, mockItem, mockParcelsStore, false)
      expect(mockParcelsStore.error).toBe('Ошибка проверки')
    })

    it('does not validate or reload when guarded update is cancelled', async () => {
      const updateParcel = vi.fn().mockResolvedValue(false)

      await expect(validateParcelData(
        mockValues, mockItem, mockParcelsStore, true, undefined, updateParcel
      )).resolves.toBe(false)

      expect(updateParcel).toHaveBeenCalledWith(parcelId, mockValues)
      expect(mockParcelsStore.validate).not.toHaveBeenCalled()
      expect(mockParcelsStore.getById).not.toHaveBeenCalled()
    })

    it('preserves the validation failure without reloading the entered values', async () => {
      const refreshError = new Error('refresh failed')
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockParcelsStore.validate.mockRejectedValueOnce(new Error('validation failed'))
      mockParcelsStore.getById.mockRejectedValueOnce(refreshError)

      await expect(
        validateParcelData(mockValues, mockItem, mockParcelsStore, true)
      ).resolves.toBe(false)

      expect(alertErrorMock).toHaveBeenCalledOnce()
      expect(alertErrorMock).toHaveBeenCalledWith('validation failed', { fallback: 'Ошибка при проверке информации о посылке' })
      expect(mockParcelsStore.getById).not.toHaveBeenCalled()
      expect(consoleError).not.toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })

  describe('approveParcel', () => {
    it('should handle approval errors with notification', async () => {
      const error = new Error('Ошибка согласования')
      mockParcelsStore.approve.mockRejectedValue(error)

      await approveParcel(
        mockValues,
        mockItem,
        mockParcelsStore,
        ParcelApprovalMode.ApproveWithNotification
      )
      expect(mockParcelsStore.error).toBe('Ошибка согласования')
    })

    it('should handle approval errors with API message', async () => {
      const error = {
        response: {
          data: {
            message: 'Ошибка согласования посылки'
          }
        }
      }
      mockParcelsStore.approve.mockRejectedValue(error)

      await approveParcel(mockValues, mockItem, mockParcelsStore)
      expect(mockParcelsStore.error).toBe('Ошибка согласования посылки')
    })

    it('does not approve or reload when guarded update is cancelled', async () => {
      const updateParcel = vi.fn().mockResolvedValue(false)

      await expect(approveParcel(
        mockValues,
        mockItem,
        mockParcelsStore,
        ParcelApprovalMode.SimpleApprove,
        updateParcel
      )).resolves.toBe(false)

      expect(mockParcelsStore.approve).not.toHaveBeenCalled()
      expect(mockParcelsStore.getById).not.toHaveBeenCalled()
    })
  })

  describe('generateXml', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => vi.restoreAllMocks())
    it('should generate XML with filename generator function', async () => {
      const filenameGenerator = vi.fn().mockReturnValue('generated-filename')

      await generateXml(mockItem, mockParcelsStore, filenameGenerator)

      expect(filenameGenerator).toHaveBeenCalledWith(mockItem.value)
      expect(mockParcelsStore.generate).toHaveBeenCalledWith(123, 'generated-filename', false)
    })

    it('should handle generate XML errors with API message', async () => {
      const error = {
        response: {
          data: {
              message: 'Не удалось сформировать XML'
          }
        }
      }
      mockParcelsStore.generate.mockRejectedValue(error)

      await generateXml(mockItem, mockParcelsStore, 'test-file')

      expect(mockParcelsStore.error).toBe('Не удалось сформировать XML')
    })

    it('should handle generate XML errors with default message', async () => {
      mockParcelsStore.generate.mockRejectedValue(new Error('Unexpected XML failure'))

      await generateXml(mockItem, mockParcelsStore, 'test-file')

      expect(mockParcelsStore.error).toBe('Ошибка при генерации XML')
    })

    it('consumes a rejected correction confirmation and presents one normalized error', async () => {
      const failure = new Error('Unexpected confirmation failure')
      await expect(generateXml(mockItem, mockParcelsStore, 'test-file', {
        confirm: vi.fn().mockRejectedValue(failure),
        register: { realWeightKg: 5, totalWeightKgToRelease: 10 }
      })).resolves.toBe(false)
      expect(mockParcelsStore.generate).not.toHaveBeenCalled()
      expect(mockParcelsStore.error).toBe('Ошибка при генерации XML')
      expect(alertErrorMock).toHaveBeenCalledExactlyOnceWith(failure, { fallback: 'Ошибка при генерации XML' })
      expect(console.error).toHaveBeenCalledWith('[parcel XML generation]', failure)
    })

    it('confirms XML generation when weight correction is possible', async () => {
      const confirm = vi.fn().mockResolvedValue(true)

      await generateXml(mockItem, mockParcelsStore, 'test-file', {
        confirm,
        register: { realWeightKg: 5, totalWeightKgToRelease: 10 }
      })

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Применить поправочный коэффициент 0,500 для веса посылки?'
        })
      )
      expect(mockParcelsStore.generate).toHaveBeenCalledWith(123, 'test-file', true)
    })

  })

  describe('runCheckStatusAction', () => {
    let mockIsComponentMounted
    let mockRunningAction
    let mockCurrentParcelId
    let mockEnsureNextParcelsPromise
    let mockActionFn

    beforeEach(() => {
      mockIsComponentMounted = { value: true }
      mockRunningAction = { value: false }
      mockCurrentParcelId = { value: parcelId }
      mockEnsureNextParcelsPromise = vi.fn().mockResolvedValue()
      mockActionFn = vi.fn().mockResolvedValue()
    })

    it('should not run if component is unmounted', async () => {
      mockIsComponentMounted.value = false

      await runCheckStatusAction(
        mockValues,
        mockActionFn,
        mockIsComponentMounted,
        mockRunningAction,
        mockCurrentParcelId,
        mockEnsureNextParcelsPromise,
        mockParcelsStore
      )

      expect(mockEnsureNextParcelsPromise).not.toHaveBeenCalled()
      expect(mockActionFn).not.toHaveBeenCalled()
    })

    it('should not reload parcel if component is unmounted in finally', async () => {
      mockActionFn.mockImplementation(async () => {
        mockIsComponentMounted.value = false
      })

      await runCheckStatusAction(
        mockValues,
        mockActionFn,
        mockIsComponentMounted,
        mockRunningAction,
        mockCurrentParcelId,
        mockEnsureNextParcelsPromise,
        mockParcelsStore
      )

      expect(mockParcelsStore.getById).not.toHaveBeenCalled()
    })

    it('runs the pre-action confirmation before saving', async () => {
      const beforeAction = vi.fn().mockResolvedValue(false)
      const updateParcel = vi.fn()

      await expect(runCheckStatusAction(
        mockValues,
        mockActionFn,
        mockIsComponentMounted,
        mockRunningAction,
        mockCurrentParcelId,
        mockEnsureNextParcelsPromise,
        mockParcelsStore,
        { beforeAction, updateParcel }
      )).resolves.toBe(false)

      expect(beforeAction).toHaveBeenCalledOnce()
      expect(updateParcel).not.toHaveBeenCalled()
      expect(mockActionFn).not.toHaveBeenCalled()
      expect(mockParcelsStore.getById).not.toHaveBeenCalled()
      expect(mockRunningAction.value).toBe(false)
    })

    it('reports a rejected pre-action refresh once and prevents both mutations', async () => {
      const refreshError = new Error('register refresh failed')
      const beforeAction = vi.fn().mockRejectedValue(refreshError)
      const updateParcel = vi.fn()

      await expect(runCheckStatusAction(
        mockValues,
        mockActionFn,
        mockIsComponentMounted,
        mockRunningAction,
        mockCurrentParcelId,
        mockEnsureNextParcelsPromise,
        mockParcelsStore,
        { beforeAction, updateParcel }
      )).resolves.toBe(false)

      expect(alertErrorMock).toHaveBeenCalledOnce()
      expect(alertErrorMock).toHaveBeenCalledWith('register refresh failed')
      expect(updateParcel).not.toHaveBeenCalled()
      expect(mockActionFn).not.toHaveBeenCalled()
      expect(mockParcelsStore.getById).not.toHaveBeenCalled()
      expect(mockRunningAction.value).toBe(false)
    })

    it('does not run the downstream action when guarded save is cancelled', async () => {
      const updateParcel = vi.fn().mockResolvedValue(false)

      await expect(runCheckStatusAction(
        mockValues,
        mockActionFn,
        mockIsComponentMounted,
        mockRunningAction,
        mockCurrentParcelId,
        mockEnsureNextParcelsPromise,
        mockParcelsStore,
        { updateParcel }
      )).resolves.toBe(false)

      expect(mockActionFn).not.toHaveBeenCalled()
      expect(mockParcelsStore.getById).not.toHaveBeenCalled()
    })

    it('reports a post-action reload failure and always unlocks the action', async () => {
      const refreshError = new Error('refresh failed')
      mockParcelsStore.getById.mockRejectedValueOnce(refreshError)

      await expect(
        runCheckStatusAction(
          mockValues,
          mockActionFn,
          mockIsComponentMounted,
          mockRunningAction,
          mockCurrentParcelId,
          mockEnsureNextParcelsPromise,
          mockParcelsStore
        )
      ).resolves.toBe(false)

      expect(alertErrorMock).toHaveBeenCalledOnce()
      expect(alertErrorMock).toHaveBeenCalledWith(refreshError, {
        fallback: 'Не удалось обновить данные посылки'
      })
      expect(mockRunningAction.value).toBe(false)
    })

    it('does not replace an action error when the following reload also fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockActionFn.mockRejectedValueOnce(new Error('action failed'))
      mockParcelsStore.getById.mockRejectedValueOnce(new Error('refresh failed'))

      await expect(
        runCheckStatusAction(
          mockValues,
          mockActionFn,
          mockIsComponentMounted,
          mockRunningAction,
          mockCurrentParcelId,
          mockEnsureNextParcelsPromise,
          mockParcelsStore
        )
      ).resolves.toBe(false)

      expect(alertErrorMock).toHaveBeenCalledOnce()
      expect(alertErrorMock).toHaveBeenCalledWith('action failed')
      expect(consoleError).toHaveBeenCalledOnce()
      expect(mockRunningAction.value).toBe(false)
      consoleError.mockRestore()
    })
  })
})
