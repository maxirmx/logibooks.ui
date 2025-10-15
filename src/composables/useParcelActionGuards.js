import { computed } from 'vue'
import { CheckStatusCode } from '@/helpers/check.status.code.js'

/**
 * Provides common computed flags for parcel action availability.
 * @param {import('vue').Ref} parcelRef
 */
export function useParcelActionGuards(parcelRef) {
  const isApprovedWithExciseStatus = computed(() =>
    CheckStatusCode.isApprovedWithExcise(parcelRef.value?.checkStatus)
  )

  const areValidationActionsDisabled = computed(() =>
    isApprovedWithExciseStatus.value
  )

  return {
    isApprovedWithExciseStatus,
    areValidationActionsDisabled
  }
}
