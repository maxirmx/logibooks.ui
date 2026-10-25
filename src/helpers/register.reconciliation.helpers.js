import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'

export function canReconcileRegister(register, isShiftLeadPlus) {
  return Boolean(isShiftLeadPlus) && Number(register?.registerType) === WBRN_REGISTER_ID &&
    Number(register?.theOtherCountryCode) === 762
}

