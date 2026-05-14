// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const scanjobBoxHeaders = [
  { title: '', key: 'boxStickerScanned', align: 'start' },
  { title: 'Номер коробки', key: 'boxCode', align: 'center' },
  { title: 'Сканированный код', key: 'boxScannedSticker', align: 'center' },
  { title: 'Пользователь', key: 'boxScannedUserName', align: 'start' },
  { title: 'Время сканирования', key: 'boxScannedTime', align: 'start' },
  { title: 'Посылки всего / сканировано / не сканировано', key: 'parcelsProgress', align: 'center', sortable: false }
]

export const scanjobParcelHeaders = [
  { title: '', key: 'stickerScanned', align: 'start' },
  { title: 'Посылка', key: 'parcelNumber', align: 'start' },
  { title: 'Сканированный код', key: 'scannedSticker', align: 'start' },
  { title: 'Пользователь', key: 'scannedUserName', align: 'start' },
  { title: 'Время сканирования', key: 'scannedTime', align: 'start' },
  { title: 'Зона', key: 'zoneName', align: 'start' },
  { title: 'Статус', key: 'statusTitle', align: 'start' }
]

export const scanJobMonitorArea = {
  Boxes: 0,
  Box: 1,
  Unassigned: 2,
  NotInRegister: 3
}

const dateTimeRuFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})

export function formatCount(value) {
  return Number(value ?? 0).toLocaleString('ru-RU')
}

export function valueOrDash(value) {
  return value || '-'
}

export function formatScanTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateTimeRuFormatter.format(date)
}

export function stickerText(scanned) {
  return scanned ? 'Сканирована' : 'Не сканирована'
}

export function stickerClass(scanned, notFound = false) {
  if (notFound) return 'monitor-status monitor-status-not-found'
  return scanned ? 'monitor-status monitor-status-scanned' : 'monitor-status monitor-status-waiting'
}

export function isUnassignedMonitorBox(box) {
  return Number(box?.area) === scanJobMonitorArea.Unassigned
    || (box?.boxId == null && box?.bucketIndex != null)
}

export function monitorBoxStickerText(box) {
  return isUnassignedMonitorBox(box) ? 'Без коробки' : stickerText(box?.boxStickerScanned)
}

export function monitorBoxStickerClass(box) {
  return isUnassignedMonitorBox(box)
    ? 'monitor-status monitor-status-neutral'
    : stickerClass(box?.boxStickerScanned)
}
