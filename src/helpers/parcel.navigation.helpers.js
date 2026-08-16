// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const parcelNavigationModes = new Set([OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE])

export function normalizeParcelNavigationMode(value) {
  return parcelNavigationModes.has(value) ? value : OP_MODE_PAPERWORK
}

export function normalizeParcelBoxId(value) {
  const rawValue = Array.isArray(value) ? value[0] : value
  const parsedValue = Number(rawValue)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
}

export function normalizeParcelBoxCode(value) {
  const rawValue = Array.isArray(value) ? value[0] : value
  return typeof rawValue === 'string' && rawValue.trim() ? rawValue.trim() : null
}

export function normalizeInternalReturnUrl(value) {
  if (typeof value !== 'string' || !/^\/(?![\\/])/.test(value)) {
    return null
  }

  return value
}

export function getCurrentInternalRoute(router) {
  return normalizeInternalReturnUrl(router?.currentRoute?.value?.fullPath)
}

export function buildParcelNavigationQuery({ mode, returnUrl } = {}) {
  const query = {
    mode: normalizeParcelNavigationMode(mode)
  }
  const safeReturnUrl = normalizeInternalReturnUrl(returnUrl)

  if (safeReturnUrl) {
    query.returnUrl = safeReturnUrl
  }

  return query
}

export function buildParcelEditLocation({
  routeName = 'Редактирование посылки',
  registerId,
  parcelId,
  mode,
  returnUrl,
  boxId,
  query = {}
}) {
  const normalizedBoxId = normalizeParcelBoxId(boxId)
  return {
    name: routeName,
    params: {
      id: parcelId,
      registerId
    },
    query: {
      ...query,
      ...buildParcelNavigationQuery({ mode, returnUrl }),
      ...(normalizedBoxId != null ? { boxId: String(normalizedBoxId) } : {})
    }
  }
}

export function buildParcelListLocation({
  registerId,
  parcelId,
  mode,
  returnUrl,
  boxId,
  boxCode
}) {
  const query = buildParcelNavigationQuery({ mode, returnUrl })
  const normalizedBoxId = normalizeParcelBoxId(boxId)
  const normalizedBoxCode = normalizeParcelBoxCode(boxCode)

  if (parcelId != null) {
    query.selectedParcelId = String(parcelId)
  }
  if (normalizedBoxId != null) {
    query.boxId = String(normalizedBoxId)
    if (normalizedBoxCode) query.boxCode = normalizedBoxCode
  }

  return {
    path: `/registers/${registerId}/parcels`,
    query
  }
}

export function resolveParcelReturnLocation({ returnUrl, registerId, parcelId, mode, boxId }) {
  return (
    normalizeInternalReturnUrl(returnUrl) ||
    buildParcelListLocation({ registerId, parcelId, mode, boxId })
  )
}
