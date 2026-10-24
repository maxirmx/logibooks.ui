// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.

export const MANUAL_PARCEL_SCAN_KEY = Symbol('manualParcelScan')

export function parcelScanId(parcel) {
  const id = Number(parcel?.parcelId ?? parcel?.id)
  return Number.isInteger(id) && id > 0 && parcel?.isInRegister !== false ? id : null
}

export function parcelScanDisabledReason(job, constants) {
  if (!job || !constants || Number(job.status) !== constants.inProgressStatus) return 'Нет активного задания сканирования'
  if (Number(job.type) === constants.boxOnlyType) return 'Задание поддерживает только сканирование коробок'
  return ''
}
