// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/**
 * Composable to manage selectedParcelId persistence across extension invocations.
 * 
 * Uses separate sessionStorage key 'logibooks.idSnapshot' to store/restore selectedParcelId.
 * Lifecycle:
 * 1. ProductLinkWithActions.saveSelectedParcelIdSnapshot() - saves selectedParcelId
 * 2. Extension is invoked and may cause page reload/navigation
 * 3. List component onMounted calls restoreSelectedParcelIdSnapshot()
 * 4. selectedParcelId is restored AFTER all items are loaded, ensuring dashed border is applied
 * 5. Snapshot is cleaned up after restoration
 */
export function useParcelSelectionRestore() {
  /**
   * Save selectedParcelId to sessionStorage snapshot
   * @param {number|null} parcelId - The parcel ID to save
   */
  function saveSelectedParcelIdSnapshot(parcelId) {
    try {
      if (parcelId == null) {
        // No parcel selected, remove snapshot if it exists
        sessionStorage.removeItem('logibooks.idSnapshot')
        return
      }
      sessionStorage.setItem('logibooks.idSnapshot', JSON.stringify({ selectedParcelId: parcelId }))
    } catch {
    }
  }

  /**
   * Restore selectedParcelId from sessionStorage snapshot and clean it up
   * @returns {number|null} The restored parcel ID or null if no snapshot exists
   */
  function restoreSelectedParcelIdSnapshot() {
    try {
      const raw = sessionStorage.getItem('logibooks.idSnapshot')
      if (!raw) return null

      const snap = JSON.parse(raw)
      if (!snap || snap.selectedParcelId === undefined) return null

      const parcelId = snap.selectedParcelId

      // Clean up the snapshot after reading it so it doesn't interfere with future loads
      sessionStorage.removeItem('logibooks.idSnapshot')

      return parcelId
    } catch  {
      return null
    }
  }

  return {
    saveSelectedParcelIdSnapshot,
    restoreSelectedParcelIdSnapshot
  }
}
