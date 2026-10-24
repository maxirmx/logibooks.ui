// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.

export { MANUAL_SCAN_KEY as MANUAL_PARCEL_SCAN_KEY } from './manual.scan.key.js'
import { scanSelectionMessage } from './manual.scan.messages.js'

export function parcelScanSelectionMessage(count) {
  return scanSelectionMessage(count, 'parcel')
}

export function parcelScanId(parcel) {
  const id = Number(parcel?.parcelId ?? parcel?.id)
  return Number.isInteger(id) && id > 0 && parcel?.isInRegister !== false ? id : null
}

export function parcelScanDisabledReason(job, constants) {
  if (!job || !constants || Number(job.status) !== constants.inProgressStatus) return 'Нет активного задания сканирования'
  if (Number(job.type) === constants.boxOnlyType) return 'Задание поддерживает только сканирование коробок'
  return ''
}

export function parcelScanSuccessMessage({ completed, matched, lookup }) {
  if (!lookup) return `Отсканировано посылок: ${completed}.`
  if (completed === 1) {
    return matched ? 'Посылка соответствует условиям поиска' : 'Посылка не соответствует условиям поиска'
  }
  return `Отсканировано посылок: ${completed}. Соответствуют условиям поиска: ${matched}. Не соответствуют: ${completed - matched}.`
}
