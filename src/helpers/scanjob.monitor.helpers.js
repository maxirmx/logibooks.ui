// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'
import { wbrRegisterColumnTitles } from '@/helpers/wbr.register.mapping.js'
import { wbr2RegisterColumnTitles } from '@/helpers/wbr2.register.mapping.js'

export const scanjobBoxHeaders = [
  { title: '', key: 'boxStickerScanned', align: 'start' },
  { title: 'Номер коробки', key: 'boxCode', align: 'center' },
  { title: 'Сканированный код', key: 'boxScannedSticker', align: 'center' },
  { title: 'Пользователь', key: 'boxScannedUserName', align: 'start' },
  { title: 'Время сканирования', key: 'boxScannedTime', align: 'start' },
  { title: 'Посылки всего / сканировано / не сканировано', key: 'parcelsProgress', align: 'center', sortable: false }
]

export const scanjobParcelScanHeaders = [
  { title: '', key: 'stickerScanned', align: 'start' },
  { title: 'Сканированный код', key: 'scannedSticker', align: 'start' },
  { title: 'Пользователь', key: 'scannedUserName', align: 'start' },
  { title: 'Время сканирования', key: 'scannedTime', align: 'start' }
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

export const scanjobOzonParcelHeaders = [
  ...scanjobParcelScanHeaders,
  { title: ozonRegisterColumnTitles.postingNumber, key: 'postingNumber', align: 'start' },
  { title: ozonRegisterColumnTitles.barcode, key: 'barcode', align: 'start', sortable: false },
  { title: ozonRegisterColumnTitles.productName, key: 'productName', align: 'start', sortable: false, width: '260px' },
  { title: ozonRegisterColumnTitles.weightKg, key: 'weightKg', align: 'start', sortable: false },
  { title: ozonRegisterColumnTitles.quantity, key: 'quantity', align: 'start', sortable: false },
  { title: 'Зона', key: 'zone', align: 'start' },
  { title: ozonRegisterColumnTitles.statusId, key: 'statusId', align: 'start' },
  { title: ozonRegisterColumnTitles.checkStatus, key: 'checkStatus', align: 'center', width: '170px' }
]

export const scanjobWbrParcelHeaders = [
  ...scanjobParcelScanHeaders,
  { title: wbrRegisterColumnTitles.shk, key: 'shk', align: 'start' },
  { title: wbrRegisterColumnTitles.sticker, key: 'sticker', align: 'start', sortable: false },
  { title: wbrRegisterColumnTitles.stickerCode, key: 'stickerCode', align: 'start', sortable: false },
  { title: wbrRegisterColumnTitles.productName, sortable: false, key: 'productName', align: 'start', width: '260px' },
  { title: wbrRegisterColumnTitles.weightKg, key: 'weightKg', align: 'start', sortable: false },
  { title: wbrRegisterColumnTitles.quantity, key: 'quantity', align: 'start', sortable: false },
  { title: 'Зона', key: 'zone', align: 'start' },
  { title: wbrRegisterColumnTitles.statusId, key: 'statusId', align: 'start' },
  { title: wbrRegisterColumnTitles.checkStatus, key: 'checkStatus', align: 'center', width: '170px' }
]

export const scanjobWbr2ParcelHeaders = [
  ...scanjobParcelScanHeaders,
  { title: wbr2RegisterColumnTitles.shk, key: 'shk', align: 'start' },
  { title: wbr2RegisterColumnTitles.stickerCode, key: 'stickerCode', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.wbSticker, key: 'wbSticker', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.sellerSticker, key: 'sellerSticker', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.productName, sortable: false, key: 'productName', align: 'start', width: '260px' },
  { title: wbr2RegisterColumnTitles.weightKg, key: 'weightKg', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.quantity, key: 'quantity', align: 'start', sortable: false },
  { title: 'Зона', key: 'zone', align: 'start' },
  { title: wbr2RegisterColumnTitles.statusId, key: 'statusId', align: 'start' },
  { title: wbr2RegisterColumnTitles.checkStatus, key: 'checkStatus', align: 'center', width: '170px' }
]

export const scanjobMonitorArea = {
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
  return Number(box?.area) === scanjobMonitorArea.Unassigned
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
