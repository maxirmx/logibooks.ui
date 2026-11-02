// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const GROUP_CUSTOMS_CHARGE_TOOLTIP = 'Суммарные таможенные платежи для всех товаров в посылке'

export function getCustomsChargeValue(item, field) {
  return item?.customsChargeGroup?.[field] ?? item?.[field]
}

export function hasCustomsCharges(item) {
  return getCustomsChargeValue(item, 'customsFee') != null ||
    getCustomsChargeValue(item, 'customsDuty') != null
}

export function isGroupedCustomsCharge(item, field) {
  return item?.customsChargeGroup != null && Number(getCustomsChargeValue(item, field)) > 0
}

export function clearCustomsCharges(item) {
  return { ...item, customsFee: null, customsDuty: null, customsChargeGroup: null }
}
