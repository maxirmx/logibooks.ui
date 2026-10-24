// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { useAlertStore } from '@/stores/alert.store.js'
import { ParcelApprovalMode } from '@/models/parcel.approval.mode.js'
import { getErrorMessage, reportError, reportFormError } from '@/helpers/error.helpers.js'
import {
  chooseOutputWeightCorrection,
  WEIGHT_CORRECTION_CHOICE
} from '@/helpers/weight.correction.helpers.js'

export async function refreshParcelAfterMutation(
  parcelsStore,
  parcelId,
  alertStore,
  { errorAlreadyReported = false } = {}
) {
  try {
    await parcelsStore.getById(parcelId)
    return true
  } catch (error) {
    if (errorAlreadyReported) {
      reportError(error, { context: 'Failed to refresh parcel after an action failure' })
    } else {
      alertStore.error(error, { fallback: 'Не удалось обновить данные посылки' })
    }
    return false
  }
}

/**
 * Validates parcel data
 * @param {*} item - Parcel item
 * @param {*} parcelsStore - Parcels store
 * @param {*} loadOrdersFn - Load orders function
 * @param {boolean} sw - Whether to validate against Stopwords (true) or FEACN (false)
 * @param {SWMatchMode} matchMode - Whether to use match mode for validation
 * @returns {Promise<boolean>}
 */
export async function validateParcelData(
  values,
  item,
  parcelsStore,
  sw,
  matchMode,
  updateParcel = (id, data) => parcelsStore.update(id, data),
  { setErrors } = {}
) {
  if (item.value.id != values.id) return Promise.resolve(false)
  const alertStore = useAlertStore()
  try {
    const updateAccepted = (await updateParcel(item.value.id, values)) !== false
    if (!updateAccepted) return false
    await parcelsStore.validate(item.value.id, sw, matchMode)
  } catch (error) {
    const fallback = 'Ошибка при проверке информации о посылке'
    parcelsStore.error = getErrorMessage(error, fallback)
    reportFormError(error, { setErrors, alertStore, fallback })
    return false
  }
  return (await reloadCompletedParcelAction(parcelsStore, item.value.id, alertStore, 'Проверка посылки выполнена')) !== false
}

async function reloadCompletedParcelAction(parcelsStore, parcelId, alertStore, completedMessage, onRefreshed) {
  try {
    const parcel = await parcelsStore.getById(parcelId)
    await onRefreshed?.(parcel)
    return parcel
  } catch (error) {
    const message = `${completedMessage}. Не удалось обновить данные посылки. ${getErrorMessage(error)}`
    parcelsStore.error = message
    alertStore.error(message)
    return false
  }
}

/**
 * Approves a parcel with current form values
 * @param {Object} params - Parameters object
 * @param {Object} params.values - Form values
 * @param {Object} params.item - Current parcel item ref
 * @param {Object} params.parcelsStore - Parcels store instance
 * @param {ParcelApprovalMode} params.approvalMode - Approval mode (default: SimpleApprove)
 * @returns {Promise<void>}
 */
export async function approveParcel(
  values,
  item,
  parcelsStore,
  approvalMode = ParcelApprovalMode.SimpleApprove,
  updateParcel = (id, data) => parcelsStore.update(id, data),
  { setErrors, onRefreshed } = {}
) {
  if (item.value.id != values.id) return false
  const alertStore = useAlertStore()
  try {
    // First update the parcel with current form values
    const updateAccepted = (await updateParcel(item.value.id, values)) !== false
    if (!updateAccepted) return false
    // Then approve the parcel
    await parcelsStore.approve(item.value.id, approvalMode)
    // Reload the order data to reflect any changes
  } catch (error) {
    const fallback = 'Ошибка при согласовании посылки'
    parcelsStore.error = getErrorMessage(error, fallback)
    reportFormError(error, { setErrors, alertStore, fallback })
    return false
  }
  return reloadCompletedParcelAction(parcelsStore, item.value.id, alertStore, 'Посылка согласована', onRefreshed)
}

/**
 * Generates XML for a parcel with current form values
 * @param {Object} params - Parameters object
 * @param {Object} params.values - Form values
 * @param {Object} params.item - Current parcel item ref
 * @param {Object} params.parcelsStore - Parcels store instance
 * @param {string|Function} params.filenameOrGenerator - Either a filename string or a function that returns filename
 * @returns {Promise<boolean>}
 */
export async function generateXml(item, parcelsStore, filenameOrGenerator, { confirm = null, register = null } = {}) {
  const alertStore = useAlertStore()
  try {
    let applyWeightCorrection = false
    if (confirm && register) {
      const choice = await chooseOutputWeightCorrection(confirm, register, { singleParcel: true })
      applyWeightCorrection = choice === WEIGHT_CORRECTION_CHOICE.Apply
    }

    
    // Determine filename
    let filename
    if (typeof filenameOrGenerator === 'function') {
      filename = filenameOrGenerator(item.value)
    } else {
      filename = filenameOrGenerator
    }

    // Then generate XML
    await parcelsStore.generate(item.value.id, filename, applyWeightCorrection)
    return true
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при генерации XML'
    alertStore.error(parcelsStore.error)
    return false
  }
}

/**
 * Convenience function for approving parcel with excise
 * @param {Object} params - Parameters object (same as approveParcel)
 * @returns {Promise<void>}
 */
export async function approveParcelWithExcise(values, item, parcelsStore, updateParcel, options) {
  return approveParcel(values, item, parcelsStore, ParcelApprovalMode.ApproveWithExcise, updateParcel, options)
}

/**
 * Convenience function for approving parcel with notification
 * @param {Object} params - Parameters object (same as approveParcel)
 * @returns {Promise<void>}
 */
export async function approveParcelWithNotification(values, item, parcelsStore, updateParcel, options) {
  return approveParcel(values, item, parcelsStore, ParcelApprovalMode.ApproveWithNotification, updateParcel, options)
}

/**
 * Runs a check status action (e.g. clearCheckStatus or checkForDuplicate) on the current parcel.
 * Saves the current form values before running the action and reloads the parcel afterwards.
 * @param {Object} values - Form values containing parcel id
 * @param {Function} actionFn - Action function to run (e.g. parcelsStore.clearCheckStatus)
 * @param {Object} isComponentMounted - Ref indicating if component is mounted
 * @param {Object} runningAction - Ref indicating if an action is running
 * @param {Object} currentParcelId - Ref containing current parcel id
 * @param {Function} ensureNextParcelsPromise - Function that returns/creates the next-parcels promise
 * @param {Object} parcelsStore - Parcels store instance
 * @returns {Promise<void>}
 */
export async function runCheckStatusAction(
  values,
  actionFn,
  isComponentMounted,
  runningAction,
  currentParcelId,
  ensureNextParcelsPromise,
  parcelsStore,
  {
    updateParcel = (id, data) => parcelsStore.update(id, data),
    beforeAction = null
  } = {}
) {
  if (!isComponentMounted.value || runningAction.value || currentParcelId.value != values.id) return
  runningAction.value = true
  const alertStore = useAlertStore()
  let mutationStarted = false
  let actionSucceeded = false
  try {
    if (beforeAction && (await beforeAction()) === false) return false
    await ensureNextParcelsPromise()
    const updateAccepted = (await updateParcel(currentParcelId.value, values)) !== false
    if (!updateAccepted) return false
    mutationStarted = true
    await actionFn(currentParcelId.value)
    actionSucceeded = true
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value && mutationStarted) {
      const refreshed = await refreshParcelAfterMutation(
        parcelsStore,
        currentParcelId.value,
        alertStore,
        { errorAlreadyReported: !actionSucceeded }
      )
      if (!refreshed) actionSucceeded = false
    }
    if (isComponentMounted.value) {
      runningAction.value = false
    }
  }
  return actionSucceeded
}

/**
 * Deletes product image for a parcel after user confirmation
 * @param {Object} values - Form values containing parcel id
 * @param {Object} isComponentMounted - Ref indicating if component is mounted
 * @param {Object} runningAction - Ref indicating if an action is running
 * @param {Object} currentParcelId - Ref containing current parcel id
 * @param {Function} confirm - Confirm dialog function from vuetify-use-dialog
 * @param {Object} parcelsStore - Parcels store instance
 * @returns {Promise<void>}
 */
export async function deleteProductImage(values, isComponentMounted, runningAction, currentParcelId, confirm, parcelsStore) {
  if (!isComponentMounted.value || runningAction.value || currentParcelId.value != values.id) return
  runningAction.value = true
  const alertStore = useAlertStore()
  try {
    const confirmed = await confirm({
      title: 'Подтверждение',
      confirmationText: 'Удалить',
      cancellationText: 'Не удалять',
      content: 'Удалить изображение для этой посылки?'
    })
    if (confirmed) {
      await parcelsStore.deleteImage(currentParcelId.value)
    }
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value) runningAction.value = false
  }
}
