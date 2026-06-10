// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

/**
 * Shared helper functions for building register headings in parcel list components.
 */

/**
 * Formats invoice (ТСД) information similar to Registers_List implementation.
 * Combines transportation document type, invoice number and date.
 * @param {Object} register - The register item object.
 * @param {Function} getTransportationDocument - Function returning document label for transportationTypeCode.
 * @returns {string} A formatted invoice info string or empty string if insufficient data.
 */
export function formatRegisterInvoice(register, getTransportationDocument) {
  if (!register) return ''
  const { invoiceNumber, transportationTypeCode } = register
  const transportationDocument = transportationTypeCode != null && typeof getTransportationDocument === 'function'
    ? getTransportationDocument(transportationTypeCode)
    : ''

  const numberPart = invoiceNumber ? ` ${invoiceNumber}` : ''
  const docPart = transportationDocument || ''
  const result = `${docPart}${numberPart}`.trim()
  return result
}

/**
 * Builds heading text for parcel list pages.
 * Example with registerLabel "Реестр": "Реестр DEAL-123 (Авиа накладная 123)"
 * Falls back to placeholders when data missing.
 * @param {Object} register - Register item as loaded from API.
 * @param {Function} getTransportationDocument - Function providing document label.
 * @param {string} registerLabel - Label to use before the register number.
 * @returns {string}
 */
export function buildParcelListHeading(register, getTransportationDocument, registerLabel = 'Сделка') {
  if (!register) return 'Загрузка...'
  const dealNumberRaw = register.dealNumber
  const dealNumber = dealNumberRaw && String(dealNumberRaw).trim() !== '' ? String(dealNumberRaw).trim() : null
  const invoiceInfo = formatRegisterInvoice(register, getTransportationDocument)
  const dealPart = `${registerLabel} ${dealNumber || 'без номера'}`
  const tsdPart = `${invoiceInfo || 'ТСД отсутствует'}`
  // Counts removed from heading; will be shown in tooltip instead.
  return `${dealPart} (${tsdPart})`
}
