// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'

export function canReconcileRegister(register, isSrLogistPlus) {
  return Boolean(isSrLogistPlus) && Number(register?.registerType) === WBRN_REGISTER_ID &&
    Number(register?.theOtherCountryCode) === 762
}


export function canSplitRegister(register, isSrLogistPlus) {
  return canReconcileRegister(register, isSrLogistPlus) && register.hasReconciliationBatch === true
}
