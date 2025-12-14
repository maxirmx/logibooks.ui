// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

// Helper functions related to parcel statistics (counts per check status, etc.)
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { formatIntegerThousands } from '@/helpers/number.formatters.js'

/**
 * Builds multiline tooltip string from parcelsByCheckStatus map.
 * Each line: "<Status Name>: <count>"
 * @param {Object} item Register (or parcel) object potentially containing parcelsByCheckStatus
 * @returns {string}
 */
export function formatParcelsByCheckStatusTooltip(item) {
  if (!item?.parcelsByCheckStatus) return ''
  return Object.entries(item.parcelsByCheckStatus)
    .map(([statusId, count]) => `${new CheckStatusCode(Number(statusId)).toString(true) ?? 'Неизвестно'}: ${formatIntegerThousands(count)}`)
    .join('\n')
}
