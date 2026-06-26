// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import collectedIcon from '@/assets/register-status-icons/collected.svg'
import customsEndIcon from '@/assets/register-status-icons/customs-end.svg'
import customsStartIcon from '@/assets/register-status-icons/customs-start.svg'
import deliveredIcon from '@/assets/register-status-icons/delivered.svg'
import inStorageIcon from '@/assets/register-status-icons/in-storage.svg'
import inTransitIcon from '@/assets/register-status-icons/in-transit.svg'
import intoCountryOfDestinationIcon from '@/assets/register-status-icons/into-country-of-destination.svg'
import intoCountryOfTransitIcon from '@/assets/register-status-icons/into-country-of-transit.svg'
import outOfCountryOfOriginIcon from '@/assets/register-status-icons/out-of-country-of-origin.svg'
import outOfCountryOfTransitIcon from '@/assets/register-status-icons/out-of-country-of-transit.svg'
import outOfStorageIcon from '@/assets/register-status-icons/out-of-storage.svg'
import registeredIcon from '@/assets/register-status-icons/registered.svg'
import veryDeliveredIcon from '@/assets/register-status-icons/very-delivered.svg'
import waitingForShipmentIcon from '@/assets/register-status-icons/waiting-for-shipment.svg'
import waitingForTransitIcon from '@/assets/register-status-icons/waiting-for-transit.svg'
import waitingIcon from '@/assets/register-status-icons/waiting.svg'

export const REGISTER_STATUS_ICON_KIND_SVG = 'svg'
export const REGISTER_STATUS_ICON_KIND_FONT_AWESOME = 'font-awesome'
export const REGISTER_STATUS_DEFAULT_ICON = 'fa-solid fa-circle-question'
export const REGISTER_STATUS_DEFAULT_BK_COLOR = '#FFFFFF'
export const REGISTER_STATUS_DEFAULT_FG_COLOR = '#212529'

const fontAwesomeQuestionIcon = {
  value: REGISTER_STATUS_DEFAULT_ICON,
  kind: REGISTER_STATUS_ICON_KIND_FONT_AWESOME,
  icon: REGISTER_STATUS_DEFAULT_ICON
}

export const registerStatusIconOptions = [
  { value: 'svg:registered', kind: REGISTER_STATUS_ICON_KIND_SVG, src: registeredIcon },
  { value: 'svg:waiting-for-shipment', kind: REGISTER_STATUS_ICON_KIND_SVG, src: waitingForShipmentIcon },
  { value: 'svg:collected', kind: REGISTER_STATUS_ICON_KIND_SVG, src: collectedIcon },
  { value: 'svg:waiting', kind: REGISTER_STATUS_ICON_KIND_SVG, src: waitingIcon },
  { value: 'svg:waiting-for-transit', kind: REGISTER_STATUS_ICON_KIND_SVG, src: waitingForTransitIcon },
  { value: 'svg:in-transit', kind: REGISTER_STATUS_ICON_KIND_SVG, src: inTransitIcon },
  { value: 'svg:in-storage', kind: REGISTER_STATUS_ICON_KIND_SVG, src: inStorageIcon },
  { value: 'svg:out-of-storage', kind: REGISTER_STATUS_ICON_KIND_SVG, src: outOfStorageIcon },
  { value: 'svg:customs-start', kind: REGISTER_STATUS_ICON_KIND_SVG, src: customsStartIcon },
  { value: 'svg:customs-end', kind: REGISTER_STATUS_ICON_KIND_SVG, src: customsEndIcon },
  { value: 'svg:out-of-country-of-origin', kind: REGISTER_STATUS_ICON_KIND_SVG, src: outOfCountryOfOriginIcon },
  { value: 'svg:into-country-of-transit', kind: REGISTER_STATUS_ICON_KIND_SVG, src: intoCountryOfTransitIcon },
  { value: 'svg:out-of-country-of-transit', kind: REGISTER_STATUS_ICON_KIND_SVG, src: outOfCountryOfTransitIcon },
  { value: 'svg:into-country-of-destination', kind: REGISTER_STATUS_ICON_KIND_SVG, src: intoCountryOfDestinationIcon },
  { value: 'svg:delivered', kind: REGISTER_STATUS_ICON_KIND_SVG, src: deliveredIcon },
  { value: 'svg:very-delivered', kind: REGISTER_STATUS_ICON_KIND_SVG, src: veryDeliveredIcon },
  fontAwesomeQuestionIcon
]

const registerStatusIconOptionMap = new Map(
  registerStatusIconOptions.map(option => [option.value, option])
)

export function isSupportedRegisterStatusIcon(icon) {
  return registerStatusIconOptionMap.has(icon)
}

export function resolveRegisterStatusIcon(icon) {
  return registerStatusIconOptionMap.get(icon) || fontAwesomeQuestionIcon
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
