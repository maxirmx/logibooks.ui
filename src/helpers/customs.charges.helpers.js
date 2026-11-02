// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { formatPrice } from '@/helpers/number.formatters.js'

export function formatCustomsCharge(value) {
  return value == null ? '' : formatPrice(value)
}

export function getCustomsChargeValue(item, field) {
  return item?.customsChargeGroup?.[field] ?? item?.[field]
}
