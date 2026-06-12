// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

// Helper functions related to parcel statistics (counts per check status, etc.)
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { formatIntegerThousands } from '@/helpers/number.formatters.js'
import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'

/**
 * Builds multiline tooltip string from parcelsByCheckStatus map.
 * Each line: "<Status Name>: <count>"
 * @param {Object} item Register (or parcel) object potentially containing parcelsByCheckStatus
 * @returns {string}
 */
export function formatParcelsByCheckStatusTooltip(item) {
  if (!item?.parcelsByCheckStatus) return ''
  return Object.entries(item.parcelsByCheckStatus)
    .map(([statusId, count]) => `${new CheckStatusCode(Number(statusId)).toString(true)}: ${formatIntegerThousands(count)}`)
    .join('\n')
}

const checkStatusProjectionTooltipLines = [
  { kind: scanjobCheckStatusProjectionKind.Defect, title: 'Брак' },
  { kind: scanjobCheckStatusProjectionKind.Restriction, title: 'Запрет' },
  { kind: scanjobCheckStatusProjectionKind.NotChecked, title: 'Не проверено' },
  { kind: scanjobCheckStatusProjectionKind.Checked, title: 'Проверено' }
]

export function formatParcelsByCheckStatusProjectionTooltip(item) {
  const projection = item?.parcelsByCheckStatusProjection
  if (!projection) return ''

  return checkStatusProjectionTooltipLines
    .map(({ kind, title }) => {
      const count = Number(projection[kind] ?? 0)
      return count > 0 ? `${title}: ${formatIntegerThousands(count)}` : null
    })
    .filter(Boolean)
    .join('\n')
}
