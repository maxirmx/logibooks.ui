// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

/**
 * Shared helper functions for building register headings in parcel list components.
 */

/**
 * Formats invoice (ТСД) information similar to Registers_List implementation.
 * Combines transportation document type, invoice number and date.
 * @param {Object} register - The register item object.
 * @param {Function} getTransportationDocument - Function returning document label for transportationTypeId.
 * @returns {string} A formatted invoice info string or empty string if insufficient data.
 */
export function formatRegisterInvoice(register, getTransportationDocument) {
  if (!register) return ''
  const { invoiceNumber, invoiceDate, transportationTypeId } = register
  const transportationDocument = transportationTypeId != null && typeof getTransportationDocument === 'function'
    ? getTransportationDocument(transportationTypeId)
    : ''

  const formattedDate = formatDate(invoiceDate)
  const numberPart = invoiceNumber ? ` ${invoiceNumber}${formattedDate ? ` от ${formattedDate}` : ''}` : ''
  const docPart = transportationDocument || ''
  const result = `${docPart}${numberPart}`.trim()
  return result
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into DD.MM.YYYY.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

/**
 * Builds heading text for parcel list pages.
 * Example: "Номер сделки: DEAL-123 | ТСД: Авиа накладная 123 от 01.09.2025"
 * Falls back to placeholders when data missing.
 * @param {Object} register - Register item as loaded from API.
 * @param {Function} getTransportationDocument - Function providing document label.
 * @returns {string}
 */
export function buildParcelListHeading(register, getTransportationDocument) {
  if (!register) return 'Загрузка реестра...'
  const dealNumberRaw = register.dealNumber
  const dealNumber = dealNumberRaw && String(dealNumberRaw).trim() !== '' ? String(dealNumberRaw).trim() : null
  const invoiceInfo = formatRegisterInvoice(register, getTransportationDocument)
  const dealPart = `Сделка ${dealNumber || 'без номера'}`
  const tsdPart = `${invoiceInfo || 'ТСД отсутствует'}`
  // Counts removed from heading; will be shown in tooltip instead.
  return `${dealPart} (${tsdPart})`
}

/**
 * Formats goods/parcels counts as shown in Registers_List (Товаров/Посылок column).
 * Relies on API provided fields parcelsTotal and placesTotal.
 * @param {Object} register
 * @returns {string} e.g. "15/20" or empty string if both missing
 */
export function formatGoodsParcelsCounts(register) {
  if (!register) return ''
  let { parcelsTotal, placesTotal } = register
  const norm = (v) => {
    if (v === null || v === undefined) return null
    const num = Number(v)
    return isNaN(num) ? null : num
  }
  parcelsTotal = norm(parcelsTotal)
  placesTotal = norm(placesTotal)
  if (parcelsTotal === null && placesTotal === null) return ''
  // If one side is missing, show 0 for clarity
  return `Товаров/Посылок: ${parcelsTotal ?? 0}/${placesTotal ?? 0}`
}
