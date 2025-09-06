// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  validateParcel, 
  approveParcel, 
  generateXml,
  approveParcelWithExcise 
} from '@/helpers/parcel.actions.helpers.js'

describe('parcel actions helpers', () => {
  let mockParcelsStore
  let mockItem
  let mockValues
  const parcelId = 123

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockItem = {
      value: {
        id: 123,
        postingNumber: 'ABC123',
        shk: '12345'
      }
    }
    
    mockValues = {
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

  describe('validateParcel', () => {
    it('should validate parcel successfully', async () => {
      await validateParcel({
        values: mockValues,
        item: mockItem,
        parcelId,
        parcelsStore: mockParcelsStore
      })

      expect(mockParcelsStore.update).toHaveBeenCalledWith(123, mockValues)
      expect(mockParcelsStore.validate).toHaveBeenCalledWith(123)
      expect(mockParcelsStore.getById).toHaveBeenCalledWith(parcelId)
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

      await validateParcel({
        values: mockValues,
        item: mockItem,
        parcelId,
        parcelsStore: mockParcelsStore
      })

      expect(mockParcelsStore.error).toBe('Validation failed')
    })

    it('should handle validation errors with default message', async () => {
      mockParcelsStore.validate.mockRejectedValue(new Error('Network error'))

      await validateParcel({
        values: mockValues,
        item: mockItem,
        parcelId,
        parcelsStore: mockParcelsStore
      })

      expect(mockParcelsStore.error).toBe('Ошибка при проверке посылки')
    })
  })

  describe('approveParcel', () => {
    it('should approve parcel successfully without excise', async () => {
      await approveParcel({
        values: mockValues,
        item: mockItem,
        parcelId,
        parcelsStore: mockParcelsStore
      })

      expect(mockParcelsStore.update).toHaveBeenCalledWith(parcelId, mockValues)
      expect(mockParcelsStore.approve).toHaveBeenCalledWith(123, false)
      expect(mockParcelsStore.getById).toHaveBeenCalledWith(parcelId)
      expect(mockParcelsStore.error).toBeNull()
    })

    it('should approve parcel successfully with excise', async () => {
      await approveParcel({
        values: mockValues,
        item: mockItem,
        parcelId,
        parcelsStore: mockParcelsStore,
        withExcise: true
      })

      expect(mockParcelsStore.update).toHaveBeenCalledWith(parcelId, mockValues)
      expect(mockParcelsStore.approve).toHaveBeenCalledWith(123, true)
      expect(mockParcelsStore.getById).toHaveBeenCalledWith(parcelId)
      expect(mockParcelsStore.error).toBeNull()
    })

    it('should handle approval errors without excise', async () => {
      const error = new Error('Approval failed')
      mockParcelsStore.approve.mockRejectedValue(error)

      await approveParcel({
        values: mockValues,
        item: mockItem,
        parcelId,
        parcelsStore: mockParcelsStore
      })

      expect(mockParcelsStore.error).toBe('Ошибка при согласовании посылки')
    })

    it('should handle approval errors with excise', async () => {
      const error = new Error('Approval failed')
      mockParcelsStore.approve.mockRejectedValue(error)

      await approveParcel({
        values: mockValues,
        item: mockItem,
        parcelId,
        parcelsStore: mockParcelsStore,
        withExcise: true
      })

      expect(mockParcelsStore.error).toBe('Ошибка при согласовании посылки с акцизом')
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

      await approveParcel({
        values: mockValues,
        item: mockItem,
        parcelId,
        parcelsStore: mockParcelsStore
      })

      expect(mockParcelsStore.error).toBe('Custom approval error')
    })
  })

  describe('approveParcelWithExcise', () => {
    it('should call approveParcel with withExcise=true', async () => {
      await approveParcelWithExcise({
        values: mockValues,
        item: mockItem,
        parcelId,
        parcelsStore: mockParcelsStore
      })

      expect(mockParcelsStore.approve).toHaveBeenCalledWith(123, true)
    })
  })

  describe('generateXml', () => {
    it('should generate XML with string filename', async () => {
      const filename = 'test-filename'

      await generateXml({
        values: mockValues,
        item: mockItem,
        parcelsStore: mockParcelsStore,
        filenameOrGenerator: filename
      })

      expect(mockParcelsStore.update).toHaveBeenCalledWith(123, mockValues)
      expect(mockParcelsStore.generate).toHaveBeenCalledWith(123, filename)
      expect(mockParcelsStore.error).toBeNull()
    })

    it('should generate XML with filename generator function', async () => {
      const filenameGenerator = vi.fn().mockReturnValue('generated-filename')

      await generateXml({
        values: mockValues,
        item: mockItem,
        parcelsStore: mockParcelsStore,
        filenameOrGenerator: filenameGenerator
      })

      expect(filenameGenerator).toHaveBeenCalledWith(mockItem.value)
      expect(mockParcelsStore.update).toHaveBeenCalledWith(123, mockValues)
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

      await generateXml({
        values: mockValues,
        item: mockItem,
        parcelsStore: mockParcelsStore,
        filenameOrGenerator: 'test-file'
      })

      expect(mockParcelsStore.error).toBe('XML generation failed')
    })

    it('should handle generate XML errors with default message', async () => {
      mockParcelsStore.generate.mockRejectedValue(new Error('Network error'))

      await generateXml({
        values: mockValues,
        item: mockItem,
        parcelsStore: mockParcelsStore,
        filenameOrGenerator: 'test-file'
      })

      expect(mockParcelsStore.error).toBe('Ошибка при генерации XML')
    })
  })
})
