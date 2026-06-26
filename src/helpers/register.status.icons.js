// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const REGISTER_STATUS_DEFAULT_ICON = 'fa-solid fa-circle-question'
export const REGISTER_STATUS_DEFAULT_BK_COLOR = '#FFFFFF'
export const REGISTER_STATUS_DEFAULT_FG_COLOR = '#212529'

export const registerStatusIconOptions = [
  { value: 'fa-solid fa-circle-question' },
  { value: 'fa-solid fa-file-signature' },
  { value: 'fa-solid fa-hourglass-start' },
  { value: 'fa-solid fa-people-carry-box' },
  { value: 'fa-solid fa-hourglass-half' },
  { value: 'fa-solid fa-clock' },
  { value: 'fa-solid fa-truck-fast' },
  { value: 'fa-solid fa-warehouse' },
  { value: 'fa-solid fa-truck-ramp-box' },
  { value: 'fa-solid fa-magnifying-glass' },
  { value: 'fa-solid fa-clipboard-check' },
  { value: 'fa-solid fa-plane-departure' },
  { value: 'fa-solid fa-right-to-bracket' },
  { value: 'fa-solid fa-right-from-bracket' },
  { value: 'fa-solid fa-plane-arrival' },
  { value: 'fa-solid fa-box-open' },
  { value: 'fa-solid fa-circle-check' }
]

export function isSupportedRegisterStatusIcon(icon) {
  return registerStatusIconOptions.some(option => option.value === icon)
}

export function resolveRegisterStatusIcon(icon) {
  return isSupportedRegisterStatusIcon(icon) ? icon : REGISTER_STATUS_DEFAULT_ICON
}

export function resolveRegisterStatusColors(status = {}) {
  return {
    backgroundColor: status?.bkColor || REGISTER_STATUS_DEFAULT_BK_COLOR,
    color: status?.fgColor || REGISTER_STATUS_DEFAULT_FG_COLOR
  }
}

export function normalizeRegisterStatusPresentationPayload(values = {}) {
  return {
    ...values,
    icon: values.icon || null,
    bkColor: values.bkColor || null,
    fgColor: values.fgColor || null
  }
}
