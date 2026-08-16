// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const parcelNavigationModes = new Set([OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE])

export function normalizeParcelNavigationMode(value) {
  return parcelNavigationModes.has(value) ? value : OP_MODE_PAPERWORK
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
  query = {}
}) {
  return {
    name: routeName,
    params: {
      id: parcelId,
      registerId
    },
    query: {
      ...query,
      ...buildParcelNavigationQuery({ mode, returnUrl })
    }
  }
}

export function buildParcelListLocation({ registerId, parcelId, mode }) {
  return {
    path: `/registers/${registerId}/parcels`,
    query: {
      selectedParcelId: String(parcelId),
      mode: normalizeParcelNavigationMode(mode)
    }
  }
}

export function resolveParcelReturnLocation({ returnUrl, registerId, parcelId, mode }) {
  return (
    normalizeInternalReturnUrl(returnUrl) ||
    buildParcelListLocation({ registerId, parcelId, mode })
  )
}
