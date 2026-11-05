// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const lookupTargetModes = Object.freeze({ Status: 0, RedZoneAtStart: 1, MissingFromJob: 2 })

export const lookupPresets = [
  { value: lookupTargetModes.Status, label: 'Поиск по статусу' },
  { value: lookupTargetModes.RedZoneAtStart, label: 'Контроль красной зоны' },
  { value: lookupTargetModes.MissingFromJob, label: 'Поиск ненайденных' }
]

export function isScopedLookup(mode) {
  return [lookupTargetModes.RedZoneAtStart, lookupTargetModes.MissingFromJob].includes(Number(mode))
}

export function lookupPresetLabel(mode) {
  return lookupPresets.find(preset => preset.value === Number(mode ?? 0))?.label
}

// Target membership is frozen at start and confirmations can only increase.
export function mergeLookupProgress(current, incoming) {
  if (!incoming) return current
  if (!current || incoming.expectedCount > current.expectedCount) return incoming
  if (incoming.expectedCount < current.expectedCount || incoming.confirmedCount < current.confirmedCount) return current
  if (incoming.confirmedCount === current.confirmedCount && incoming.missingParcels == null) return current
  return incoming
}

export function scopedLookupFeedback(result) {
  switch (result?.lookupOutcome) {
    case 1: return {
      text: result.batchConfirmedCount > 1 ? `Подтверждено посылок: ${result.batchConfirmedCount}` : 'Посылка подтверждена',
      numbers: []
    }
    case 2: return { text: 'Откройте коробку и проверьте посылки', numbers: result.candidateParcelNumbers ?? [] }
    case 3: return { text: 'Посылка уже подтверждена', numbers: [] }
    default: return null
  }
}
