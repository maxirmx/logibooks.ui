// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import router from '@/router'
import { useAuthStore } from '@/stores/auth.store.js'

/**
 * Handles ParcelNumberExt fellows events - sets filter and navigates to parcels list
 * Always routes to parcels list regardless of current location (list or edit dialog)
 * @param {Object} item - The parcel item  
 * @param {number} registerId - The register ID
 * @param {string} fieldName - The field name to use for filtering ('postingNumber' or 'shk')
 */
export function handleFellowsClick(registerId, parcelNumber) {
  if (!parcelNumber || !registerId) {
    return
  }

  // Set the parcel number filter
  const authStore = useAuthStore()
  authStore.parcels_number = parcelNumber
  // Always navigate to parcels list (even from edit dialog)
  const listUrl = `/registers/${registerId}/parcels`
  router.push(listUrl)
}