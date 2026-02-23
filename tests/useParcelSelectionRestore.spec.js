// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useParcelSelectionRestore } from '@/composables/useParcelSelectionRestore.js'

describe('useParcelSelectionRestore', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up sessionStorage after each test
    sessionStorage.clear()
  })

  describe('saveSelectedParcelIdSnapshot', () => {
    it('should save a valid parcel ID to sessionStorage', () => {
      const { saveSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      const parcelId = 123

      saveSelectedParcelIdSnapshot(parcelId)

      const stored = sessionStorage.getItem('logibooks.idSnapshot')
      expect(stored).toBeDefined()
      expect(JSON.parse(stored)).toEqual({ selectedParcelId: 123 })
    })

    it('should save a zero parcel ID', () => {
      const { saveSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      const parcelId = 0

      saveSelectedParcelIdSnapshot(parcelId)

      const stored = sessionStorage.getItem('logibooks.idSnapshot')
      expect(stored).toBeDefined()
      expect(JSON.parse(stored)).toEqual({ selectedParcelId: 0 })
    })

    it('should remove snapshot when saving null', () => {
      const { saveSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      // First save a valid ID
      saveSelectedParcelIdSnapshot(123)
      let stored = sessionStorage.getItem('logibooks.idSnapshot')
      expect(stored).toBeDefined()

      // Then save null
      saveSelectedParcelIdSnapshot(null)
      stored = sessionStorage.getItem('logibooks.idSnapshot')
      expect(stored).toBeNull()
    })

    it('should remove snapshot when saving undefined', () => {
      const { saveSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      // First save a valid ID
      saveSelectedParcelIdSnapshot(456)
      let stored = sessionStorage.getItem('logibooks.idSnapshot')
      expect(stored).toBeDefined()

      // Then save undefined
      saveSelectedParcelIdSnapshot(undefined)
      stored = sessionStorage.getItem('logibooks.idSnapshot')
      expect(stored).toBeNull()
    })

    it('should handle sessionStorage quota exceeded gracefully', () => {
      const { saveSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      // Mock sessionStorage.setItem to throw
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

      // Should not throw
      expect(() => {
        saveSelectedParcelIdSnapshot(789)
      }).not.toThrow()

      setItemSpy.mockRestore()
    })
  })

  describe('restoreSelectedParcelIdSnapshot', () => {
    it('should restore a valid parcel ID from sessionStorage', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      // Manually set a snapshot
      sessionStorage.setItem('logibooks.idSnapshot', JSON.stringify({ selectedParcelId: 456 }))

      const restoredId = restoreSelectedParcelIdSnapshot()

      expect(restoredId).toBe(456)
    })

    it('should remove snapshot after restoration', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      // Set a snapshot
      sessionStorage.setItem('logibooks.idSnapshot', JSON.stringify({ selectedParcelId: 789 }))

      restoreSelectedParcelIdSnapshot()

      const stored = sessionStorage.getItem('logibooks.idSnapshot')
      expect(stored).toBeNull()
    })

    it('should return null when no snapshot exists', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()

      const restoredId = restoreSelectedParcelIdSnapshot()

      expect(restoredId).toBeNull()
    })

    it('should return null when snapshot is empty string', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      sessionStorage.setItem('logibooks.idSnapshot', '')

      const restoredId = restoreSelectedParcelIdSnapshot()

      expect(restoredId).toBeNull()
    })

    it('should return null when snapshot is invalid JSON', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      sessionStorage.setItem('logibooks.idSnapshot', 'invalid json {')

      const restoredId = restoreSelectedParcelIdSnapshot()

      expect(restoredId).toBeNull()
    })

    it('should return null when snapshot is missing selectedParcelId property', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      sessionStorage.setItem('logibooks.idSnapshot', JSON.stringify({ someOtherField: 123 }))

      const restoredId = restoreSelectedParcelIdSnapshot()

      expect(restoredId).toBeNull()
    })

    it('should restore zero parcel ID correctly', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      sessionStorage.setItem('logibooks.idSnapshot', JSON.stringify({ selectedParcelId: 0 }))

      const restoredId = restoreSelectedParcelIdSnapshot()

      expect(restoredId).toBe(0)
    })

    it('should handle null selectedParcelId in snapshot', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      sessionStorage.setItem('logibooks.idSnapshot', JSON.stringify({ selectedParcelId: null }))

      const restoredId = restoreSelectedParcelIdSnapshot()

      expect(restoredId).toBeNull()
    })

    it('should handle undefined selectedParcelId in snapshot', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      // Note: JSON.stringify silently omits undefined values
      sessionStorage.setItem('logibooks.idSnapshot', JSON.stringify({ selectedParcelId: undefined }))

      const restoredId = restoreSelectedParcelIdSnapshot()

      expect(restoredId).toBeNull()
    })

    it('should preserve snapshot when parsing fails', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      sessionStorage.setItem('logibooks.idSnapshot', 'invalid {')

      restoreSelectedParcelIdSnapshot()

      const stored = sessionStorage.getItem('logibooks.idSnapshot')
      // Snapshot should not be removed when parsing fails (for safety)
      expect(stored).toBe('invalid {')
    })
  })

  describe('integration scenarios', () => {
    it('should handle save followed by restore cycle', () => {
      const { saveSelectedParcelIdSnapshot, restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      const originalId = 999
      saveSelectedParcelIdSnapshot(originalId)
      
      const restoredId = restoreSelectedParcelIdSnapshot()
      
      expect(restoredId).toBe(originalId)
      expect(sessionStorage.getItem('logibooks.idSnapshot')).toBeNull()
    })

    it('should allow multiple save operations before restore', () => {
      const { saveSelectedParcelIdSnapshot, restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      saveSelectedParcelIdSnapshot(111)
      saveSelectedParcelIdSnapshot(222)
      saveSelectedParcelIdSnapshot(333)
      
      const restoredId = restoreSelectedParcelIdSnapshot()
      
      expect(restoredId).toBe(333)
    })

    it('should not interfere with logibooks.parcelsSnapshot', () => {
      const { saveSelectedParcelIdSnapshot, restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      // Set a parcelsSnapshot
      const parcelsSnapshot = { parcels_page: 2, parcels_sort_by: ['id'] }
      sessionStorage.setItem('logibooks.parcelsSnapshot', JSON.stringify(parcelsSnapshot))
      
      // Use the id snapshot functions
      saveSelectedParcelIdSnapshot(555)
      const restoredId = restoreSelectedParcelIdSnapshot()
      
      expect(restoredId).toBe(555)
      
      // Verify parcelsSnapshot is still intact
      const stored = sessionStorage.getItem('logibooks.parcelsSnapshot')
      expect(JSON.parse(stored)).toEqual(parcelsSnapshot)
    })

    it('should handle rapid save/restore cycles', () => {
      const { saveSelectedParcelIdSnapshot, restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
      
      const ids = [10, 20, 30, 40, 50]
      
      for (const id of ids) {
        saveSelectedParcelIdSnapshot(id)
        const restored = restoreSelectedParcelIdSnapshot()
        expect(restored).toBe(id)
        expect(sessionStorage.getItem('logibooks.idSnapshot')).toBeNull()
      }
    })
  })
})
