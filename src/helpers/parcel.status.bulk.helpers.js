// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { GTC_COMPANY_ID, OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID } from '@/helpers/company.constants.js'
import { gtcRegisterColumnTitles } from '@/helpers/gtc.register.mapping.js'
import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'
import { wbrRegisterColumnTitles } from '@/helpers/wbr.register.mapping.js'

const PARCEL_NUMBER_SPLIT_PATTERN = /[,\t\r\n]+/

export function parseParcelStatusBulkInput(value) {
  const seen = new Set()

  return String(value ?? '')
    .split(PARCEL_NUMBER_SPLIT_PATTERN)
    .map((number) => number.trim())
    .filter((number) => {
      if (!number || seen.has(number)) {
        return false
      }

      seen.add(number)
      return true
    })
}

export function normalizeParcelStatusBulkIds(value) {
  return Array.isArray(value)
    ? value
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
    : []
}

export function buildParcelStatusBulkReport(missingNumbers = [], blockedItems = []) {
  const lines = []
  const missing = Array.isArray(missingNumbers) ? missingNumbers : []
  const blocked = Array.isArray(blockedItems) ? blockedItems : []

  if (missing.length > 0) {
    lines.push('Не найдены:')
    lines.push(...missing)
  }

  if (blocked.length > 0) {
    if (lines.length > 0) {
      lines.push('')
    }
    lines.push('Недоступны для изменения:')
    lines.push(...blocked.map((item) => item?.number || `#${item?.parcelId}`))
  }

  return lines.join('\n')
}

export function getParcelStatusBulkNumberLabel(register) {
  const registerType = Number(register?.registerType ?? register?.companyId)

  switch (registerType) {
    case WBR_COMPANY_ID:
    case WBR2_REGISTER_ID:
      return wbrRegisterColumnTitles.shk
    case OZON_COMPANY_ID:
      return ozonRegisterColumnTitles.postingNumber
    case GTC_COMPANY_ID:
      return gtcRegisterColumnTitles.postingNumber
    default:
      return 'Номер посылки'
  }
}
