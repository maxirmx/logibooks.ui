// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { scanjobCheckStatusProjectionKind } from '@/helpers/scanjob.check-status.helpers.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'

function unrefValue(value) {
  return value && typeof value === 'object' && 'value' in value ? value.value : value
}

function isTruthy(value) {
  return Boolean(unrefValue(value))
}

function normalizeStatusText(value) {
  return String(value || '').toLocaleLowerCase('ru-RU')
}

function getProjection(item) {
  return item?.checkStatusProjection && typeof item.checkStatusProjection === 'object'
    ? item.checkStatusProjection
    : null
}

function getProjectionKind(item) {
  const kind = Number(getProjection(item)?.kind)
  return Number.isFinite(kind) ? kind : null
}

function getProjectionText(item) {
  const projection = getProjection(item)
  return [
    projection?.title,
    projection?.restrictionReason
  ].filter(Boolean).map(normalizeStatusText).join('\n')
}

function projectionIncludes(item, values) {
  const projectionText = getProjectionText(item)
  return values.some((value) => projectionText.includes(normalizeStatusText(value)))
}

export function isParcelDefect(item) {
  return getProjectionKind(item) === scanjobCheckStatusProjectionKind.Defect ||
    projectionIncludes(item, ['Брак'])
}

export function isParcelDuplicate(item) {
  return CheckStatusCode.isDuplicate(item?.checkStatus) ||
    projectionIncludes(item, ['Дубликат'])
}

export function isParcelMarkedByPartner(item) {
  return projectionIncludes(item, ['Исключено партнёром', 'Исключено партнером'])
}

export function canSetParcelDefect(item, authStore) {
  const hasRole = isTruthy(authStore?.isAdmin) || isTruthy(authStore?.isWhManager)
  return hasRole
    && getProjection(item) !== null
    && !isParcelDefect(item)
    && !isParcelDuplicate(item)
    && !isParcelMarkedByPartner(item)
}

export function canClearParcelDefect(item, authStore) {
  const hasRole = isTruthy(authStore?.isAdmin) || isTruthy(authStore?.isShiftLead)
  return hasRole && (isParcelDefect(item) || item?.checkStatus === CheckStatusCode.Duplicate2.value)
}

function getErrorStatus(error) {
  const status = error?.status ?? error?.response?.status
  if (status !== null && status !== undefined && status !== '') {
    return String(status)
  }

  return null
}

function errorIncludes(error, text) {
  const status = getErrorStatus(error)
  if (status !== null) {
    return status === text
  }

  return String(error?.message || error || '').includes(text)
}

export function getSetParcelDefectErrorMessage(error) {
  if (errorIncludes(error, '403')) {
    return 'Нет прав для отметки посылки как брак'
  }
  if (errorIncludes(error, '404')) {
    return 'Посылка не найдена'
  }
  if (errorIncludes(error, '409')) {
    return 'Нельзя отметить эту посылку как брак'
  }

  return 'Ошибка при отметке посылки как брак'
}

export function getClearParcelDefectErrorMessage(error) {
  if (errorIncludes(error, '403')) {
    return 'Нет прав для отмены брака'
  }
  if (errorIncludes(error, '404')) {
    return 'Посылка не найдена'
  }

  return 'Ошибка при отмене брака'
}
