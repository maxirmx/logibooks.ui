// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { CheckStatusCode } from '@/helpers/check.status.code.js'

function unrefValue(value) {
  return value && typeof value === 'object' && 'value' in value ? value.value : value
}

function isTruthy(value) {
  return Boolean(unrefValue(value))
}

function getNumericCheckStatus(item) {
  if (item?.checkStatus === null || item?.checkStatus === undefined || item?.checkStatus === '') {
    return null
  }

  const status = Number(item.checkStatus)
  return Number.isFinite(status) ? status : null
}

function normalizeStatusText(value) {
  return String(value || '').toLocaleLowerCase('ru-RU')
}

function getProjectionText(item) {
  return [
    item?.checkStatusProjection?.title,
    item?.checkStatusProjection?.restrictionReason
  ].filter(Boolean).map(normalizeStatusText).join('\n')
}

function projectionIncludes(item, values) {
  const projectionText = getProjectionText(item)
  return values.some((value) => projectionText.includes(normalizeStatusText(value)))
}

export function isParcelDefect(item) {
  const checkStatus = getNumericCheckStatus(item)
  if (checkStatus !== null) {
    return CheckStatusCode.isDefect(checkStatus)
  }

  return projectionIncludes(item, ['Брак'])
}

export function isParcelDuplicate(item) {
  const checkStatus = getNumericCheckStatus(item)
  if (checkStatus !== null) {
    return CheckStatusCode.isDuplicate(checkStatus)
  }

  return projectionIncludes(item, ['Дубликат'])
}

export function isParcelMarkedByPartner(item) {
  const checkStatus = getNumericCheckStatus(item)
  if (checkStatus !== null) {
    return checkStatus === CheckStatusCode.MarkedByPartner.value
  }

  return projectionIncludes(item, ['Исключено партнёром', 'Исключено партнером'])
}

export function canSetParcelDefect(item, authStore) {
  const hasRole = isTruthy(authStore?.isAdmin) || isTruthy(authStore?.isWhManager)
  return hasRole
    && !isParcelDefect(item)
    && !isParcelDuplicate(item)
    && !isParcelMarkedByPartner(item)
}

export function canClearParcelDefect(item, authStore) {
  const hasRole = isTruthy(authStore?.isAdmin) || isTruthy(authStore?.isShiftLead)
  return hasRole && isParcelDefect(item)
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
