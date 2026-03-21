// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  validateParcelData,
  approveParcel,
  generateXml,
  approveParcelWithExcise,
  approveParcelWithNotification,
  runCheckStatusAction
} from '@/helpers/parcel.actions.helpers.js'
import { SwValidationMatchMode } from '@/models/sw.validation.match.mode.js'
import { ParcelApprovalMode } from '@/models/parcel.approval.mode.js'


// Mock the alert store
vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: vi.fn(() => ({
    error: vi.fn()
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
    it('should validate parcel successfully', async () => {
      await validateParcelData(mockValues, mockItem, mockParcelsStore, true, SwValidationMatchMode.NoSwMatch)

      expect(mockParcelsStore.update).toHaveBeenCalledWith(123, mockValues)
      expect(mockParcelsStore.validate).toHaveBeenCalledWith(123, true, SwValidationMatchMode.NoSwMatch)
      expect(mockParcelsStore.getById).toHaveBeenCalledWith(123)
      expect(mockParcelsStore.error).toBeNull()
    })

    it('should handle validation errors with API message', async () => {
      const error = {
        response: {
          data: {
            message: 'Validation failed'
          }
        }
      }
      mockParcelsStore.update.mockRejectedValue(error)

      await validateParcelData(mockValues, mockItem, mockParcelsStore, false)
      expect(mockParcelsStore.error).toBe('Validation failed')

    })

    it('should handle validation errors with default message', async () => {
      mockParcelsStore.validate.mockRejectedValue(new Error('Network error'))

      await validateParcelData(mockValues, mockItem, mockParcelsStore, true)

      expect(mockParcelsStore.error).toBe('Ошибка при проверке информации о посылке')
    })
  })

  describe('approveParcel', () => {
    it('should approve parcel successfully without excise', async () => {
      await approveParcel(mockValues, mockItem, mockParcelsStore)

      expect(mockParcelsStore.update).toHaveBeenCalledWith(123, mockValues)
      expect(mockParcelsStore.approve).toHaveBeenCalledWith(123, ParcelApprovalMode.SimpleApprove)
      expect(mockParcelsStore.getById).toHaveBeenCalledWith(123)
      expect(mockParcelsStore.error).toBeNull()
    })

    it('should approve parcel successfully with excise', async () => {
      await approveParcel(mockValues, mockItem, mockParcelsStore, ParcelApprovalMode.ApproveWithExcise)

      expect(mockParcelsStore.update).toHaveBeenCalledWith(123, mockValues)
      expect(mockParcelsStore.approve).toHaveBeenCalledWith(123, ParcelApprovalMode.ApproveWithExcise)
      expect(mockParcelsStore.getById).toHaveBeenCalledWith(123)
      expect(mockParcelsStore.error).toBeNull()
    })

    it('should approve parcel successfully with notification', async () => {
      await approveParcel(mockValues, mockItem, mockParcelsStore, ParcelApprovalMode.ApproveWithNotification)

      expect(mockParcelsStore.update).toHaveBeenCalledWith(123, mockValues)
      expect(mockParcelsStore.approve).toHaveBeenCalledWith(123, ParcelApprovalMode.ApproveWithNotification)
      expect(mockParcelsStore.getById).toHaveBeenCalledWith(123)
      expect(mockParcelsStore.error).toBeNull()
    })

    it('should handle approval errors without excise', async () => {
      const error = new Error('Approval failed')
      mockParcelsStore.approve.mockRejectedValue(error)

      await approveParcel(mockValues, mockItem, mockParcelsStore)
      expect(mockParcelsStore.error).toBe('Ошибка при согласовании посылки')
    })

    it('should handle approval errors with excise', async () => {
      const error = new Error('Approval failed')
      mockParcelsStore.approve.mockRejectedValue(error)

      await approveParcel(mockValues, mockItem, mockParcelsStore, ParcelApprovalMode.ApproveWithExcise)
      expect(mockParcelsStore.error).toBe('Ошибка при согласовании посылки')
    })

    it('should handle approval errors with notification', async () => {
      const error = new Error('Approval failed')
      mockParcelsStore.approve.mockRejectedValue(error)

      await approveParcel(mockValues, mockItem, mockParcelsStore, ParcelApprovalMode.ApproveWithNotification)
      expect(mockParcelsStore.error).toBe('Ошибка при согласовании посылки')
    })

    it('should handle approval errors with API message', async () => {
      const error = {
        response: {
          data: {
            message: 'Custom approval error'
          }
        }
      }
      mockParcelsStore.approve.mockRejectedValue(error)

      await approveParcel(mockValues, mockItem, mockParcelsStore)
      expect(mockParcelsStore.error).toBe('Custom approval error')
    })
  })

  describe('approveParcelWithExcise', () => {
    it('should call approveParcel with withExcise=true', async () => {
      await approveParcelWithExcise(mockValues,  mockItem,  mockParcelsStore)

      expect(mockParcelsStore.approve).toHaveBeenCalledWith(123, ParcelApprovalMode.ApproveWithExcise)
    })
  })

  describe('approveParcelWithNotification', () => {
    it('should call approveParcel with ApproveWithNotification mode', async () => {
      await approveParcelWithNotification(mockValues, mockItem, mockParcelsStore)

      expect(mockParcelsStore.approve).toHaveBeenCalledWith(123, ParcelApprovalMode.ApproveWithNotification)
    })
  })

  describe('generateXml', () => {
    it('should generate XML with string filename', async () => {
      const filename = 'test-filename'

      await generateXml(mockItem, mockParcelsStore, filename)

      expect(mockParcelsStore.generate).toHaveBeenCalledWith(123, filename)
      expect(mockParcelsStore.error).toBeNull()
    })

    it('should generate XML with filename generator function', async () => {
      const filenameGenerator = vi.fn().mockReturnValue('generated-filename')

      await generateXml(mockItem, mockParcelsStore, filenameGenerator)

      expect(filenameGenerator).toHaveBeenCalledWith(mockItem.value)
      expect(mockParcelsStore.generate).toHaveBeenCalledWith(123, 'generated-filename')
    })

    it('should handle generate XML errors with API message', async () => {
      const error = {
        response: {
          data: {
            message: 'XML generation failed'
          }
        }
      }
      mockParcelsStore.generate.mockRejectedValue(error)

      await generateXml(mockItem, mockParcelsStore, 'test-file')

      expect(mockParcelsStore.error).toBe('XML generation failed')
    })

    it('should handle generate XML errors with default message', async () => {
      mockParcelsStore.generate.mockRejectedValue(new Error('Network error'))

      await generateXml(mockItem, mockParcelsStore, 'test-file')

      expect(mockParcelsStore.error).toBe('Ошибка при генерации XML')
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

    it('should run action successfully', async () => {
      await runCheckStatusAction(
        mockValues, mockActionFn,
        mockIsComponentMounted, mockRunningAction, mockCurrentParcelId,
        mockEnsureNextParcelsPromise, mockParcelsStore
      )

      expect(mockEnsureNextParcelsPromise).toHaveBeenCalled()
      expect(mockParcelsStore.update).toHaveBeenCalledWith(parcelId, mockValues)
      expect(mockActionFn).toHaveBeenCalledWith(parcelId)
      expect(mockParcelsStore.getById).toHaveBeenCalledWith(parcelId)
      expect(mockRunningAction.value).toBe(false)
    })

    it('should not run if component is unmounted', async () => {
      mockIsComponentMounted.value = false

      await runCheckStatusAction(
        mockValues, mockActionFn,
        mockIsComponentMounted, mockRunningAction, mockCurrentParcelId,
        mockEnsureNextParcelsPromise, mockParcelsStore
      )

      expect(mockEnsureNextParcelsPromise).not.toHaveBeenCalled()
      expect(mockActionFn).not.toHaveBeenCalled()
    })

    it('should not run if another action is already running', async () => {
      mockRunningAction.value = true

      await runCheckStatusAction(
        mockValues, mockActionFn,
        mockIsComponentMounted, mockRunningAction, mockCurrentParcelId,
        mockEnsureNextParcelsPromise, mockParcelsStore
      )

      expect(mockEnsureNextParcelsPromise).not.toHaveBeenCalled()
      expect(mockActionFn).not.toHaveBeenCalled()
    })

    it('should not run if parcel id does not match', async () => {
      mockCurrentParcelId.value = 999

      await runCheckStatusAction(
        mockValues, mockActionFn,
        mockIsComponentMounted, mockRunningAction, mockCurrentParcelId,
        mockEnsureNextParcelsPromise, mockParcelsStore
      )

      expect(mockEnsureNextParcelsPromise).not.toHaveBeenCalled()
      expect(mockActionFn).not.toHaveBeenCalled()
    })

    it('should handle errors and reset runningAction', async () => {
      mockActionFn.mockRejectedValue(new Error('Action failed'))

      await runCheckStatusAction(
        mockValues, mockActionFn,
        mockIsComponentMounted, mockRunningAction, mockCurrentParcelId,
        mockEnsureNextParcelsPromise, mockParcelsStore
      )

      expect(mockParcelsStore.getById).toHaveBeenCalledWith(parcelId)
      expect(mockRunningAction.value).toBe(false)
    })

    it('should not reload parcel if component is unmounted in finally', async () => {
      mockActionFn.mockImplementation(async () => {
        mockIsComponentMounted.value = false
      })

      await runCheckStatusAction(
        mockValues, mockActionFn,
        mockIsComponentMounted, mockRunningAction, mockCurrentParcelId,
        mockEnsureNextParcelsPromise, mockParcelsStore
      )

      expect(mockParcelsStore.getById).not.toHaveBeenCalled()
    })
  })
})
