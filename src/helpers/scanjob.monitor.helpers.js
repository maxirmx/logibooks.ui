// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'
import { wbrRegisterColumnTitles } from '@/helpers/wbr.register.mapping.js'
import { wbr2RegisterColumnTitles } from '@/helpers/wbr2.register.mapping.js'

export const scanjobParcelsProgressTitle = 'Посылки всего / сканировано / не сканировано / запретов'

export const scanjobBoxHeaders = [
  { title: '', key: 'boxStickerScanned', align: 'start' },
  { title: 'Номер коробки', key: 'boxCode', align: 'center' },
  { title: 'Пользователь', key: 'boxScannedUserName', align: 'start' },
  { title: 'Время сканирования', key: 'boxScannedTime', align: 'start' },
  { title: 'Сканированный код', key: 'boxScannedSticker', align: 'center' },
  { title: '', key: 'parcelsProgress', align: 'start', sortable: false }
]

export const scanjobParcelScanHeaders = [
  { title: '', key: 'stickerScanned', align: 'start' },
  { title: 'Проверка', key: 'checkStatusProjection', align: 'center' },
  { title: 'Зона', key: 'zone', align: 'start' },
  { title: 'Статус', key: 'statusId', align: 'start' },
  { title: 'Пользователь\nВремя\nСканированный код', key: 'scannedInfo', align: 'start', sortable: false }
]

export const scanjobParcelHeaders = [
  { title: '', key: 'stickerScanned', align: 'start' },
  { title: 'Посылка', key: 'parcelNumber', align: 'start' },
  { title: 'Пользователь\nВремя\nСканированный код', key: 'scannedInfo', align: 'start', sortable: false },
  { title: 'Зона', key: 'zoneName', align: 'start' },
  { title: 'Статус', key: 'statusTitle', align: 'start' }
]

export const scanjobOzonParcelHeaders = [
  ...scanjobParcelScanHeaders,
  { title: ozonRegisterColumnTitles.postingNumber, key: 'postingNumber', align: 'start' },
  { title: ozonRegisterColumnTitles.barcode, key: 'barcode', align: 'start', sortable: false },
  { title: ozonRegisterColumnTitles.productName, key: 'productName', align: 'start', sortable: false },
  { title: ozonRegisterColumnTitles.weightKg, key: 'weightKg', align: 'start', sortable: false },
  { title: ozonRegisterColumnTitles.quantity, key: 'quantity', align: 'start', sortable: false },
]

export const scanjobWbrParcelHeaders = [
  ...scanjobParcelScanHeaders,
  { title: wbrRegisterColumnTitles.shk, key: 'shk', align: 'start' },
  { title: wbrRegisterColumnTitles.sticker, key: 'sticker', align: 'start' },
  { title: wbrRegisterColumnTitles.stickerCode, key: 'stickerCode', align: 'start' },
  { title: wbrRegisterColumnTitles.productName, sortable: false, key: 'productName' },
  { title: wbrRegisterColumnTitles.weightKg, key: 'weightKg', align: 'start', sortable: false },
  { title: wbrRegisterColumnTitles.quantity, key: 'quantity', align: 'start', sortable: false },
]

export const scanjobWbr2ParcelHeaders = [
  ...scanjobParcelScanHeaders,
  { title: wbr2RegisterColumnTitles.shk, key: 'shk', align: 'start' },
  { title: wbr2RegisterColumnTitles.stickerCode, key: 'stickerCode', align: 'start' },
  { title: wbr2RegisterColumnTitles.wbSticker, key: 'wbSticker', align: 'start' },
  { title: wbr2RegisterColumnTitles.sellerSticker, key: 'sellerSticker', align: 'start' },
  { title: wbr2RegisterColumnTitles.productName, sortable: false, key: 'productName', align: 'start' },
  { title: wbr2RegisterColumnTitles.weightKg, key: 'weightKg', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.quantity, key: 'quantity', align: 'start', sortable: false },
]

export const scanjobMonitorArea = {
  Boxes: 0,
  Box: 1,
  Unassigned: 2,
  NotInRegister: 3
}

export const scannedItemSource = {
  Unknown: 0,
  ParcelSticker: 10,
  BoxSticker: 20,
  NotInRegister: 30
}

export function formatCount(value) {
  return Number(value ?? 0).toLocaleString('ru-RU')
}

export function formatParcelProgress(item) {
  return [
    item?.totalParcels,
    item?.parcelsWithStickerScanned,
    item?.parcelsWithStickerNotScanned,
    item?.restrictedParcels
  ].map(formatCount).join(' / ')
}

export function getParcelProgressStats(item) {
  return [
    { label: 'Посылки всего', value: formatCount(item?.totalParcels) },
    { label: 'Сканировано', value: formatCount(item?.parcelsWithStickerScanned) },
    {
      label: 'Запретов',
      value: formatCount(item?.restrictedParcels),
      isRestricted: Number(item?.restrictedParcels ?? 0) !== 0
    },
    { label: 'Не сканировано', value: formatCount(item?.parcelsWithStickerNotScanned) }
  ]
}

export function valueOrDash(value) {
  return value || '-'
}

export function formatScanTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${hh}:${min} ${dd}.${mm}`
}

export function formatScannedInfoLines(item) {
  return [
    valueOrDash(item?.scannedUserName),
    valueOrDash(formatScanTime(item?.scannedTime)),
    valueOrDash(item?.scannedSticker)
  ]
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
