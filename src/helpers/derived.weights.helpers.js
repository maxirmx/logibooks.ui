// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

// Calculated response fields never become editable API inputs.
export function rawWeightPayload(data) {
  const result = { ...data }
  for (const key of ['adjustedWeightKg', 'reconciliationParcelId', 'derivedTotalsPending', 'weightCorrectionEligible']) {
    delete result[key]
  }
  return result
}

export function pendingWeightProjection(parcel) {
  return { ...parcel, adjustedWeightKg: null, derivedTotalsPending: true }
}
