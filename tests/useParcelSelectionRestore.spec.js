// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
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

  })

  describe('restoreSelectedParcelIdSnapshot', () => {
    it('should handle undefined selectedParcelId in snapshot', () => {
      const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()

      // Note: JSON.stringify silently omits undefined values
      sessionStorage.setItem(
        'logibooks.idSnapshot',
        JSON.stringify({ selectedParcelId: undefined })
      )

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
    it('should not interfere with logibooks.parcelsSnapshot', () => {
      const { saveSelectedParcelIdSnapshot, restoreSelectedParcelIdSnapshot } =
        useParcelSelectionRestore()

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

  })
})
