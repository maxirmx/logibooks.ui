// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { useAlertStore } from '@/stores/alert.store.js'
import { ParcelApprovalMode } from '@/models/parcel.approval.mode.js'

/**
 * Validates parcel data
 * @param {*} item - Parcel item
 * @param {*} parcelsStore - Parcels store
 * @param {*} loadOrdersFn - Load orders function
 * @param {boolean} sw - Whether to validate against Stopwords (true) or FEACN (false)
 * @param {SWMatchMode} matchMode - Whether to use match mode for validation
 * @returns {Promise<boolean>}
 */
export async function validateParcelData(values, item, parcelsStore, sw, matchMode) {
  if (item.value.id != values.id) return Promise.resolve(false)
  try {
    await parcelsStore.update(item.value.id, values)
    await parcelsStore.validate(item.value.id, sw, matchMode)
  } catch (error) {
    const alertStore = useAlertStore()
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке информации о посылке'
    alertStore.error(parcelsStore.error)
  } finally {
      await parcelsStore.getById(item.value.id)
  }
}

/**
 * Approves a parcel with current form values
 * @param {Object} params - Parameters object
 * @param {Object} params.values - Form values
 * @param {Object} params.item - Current parcel item ref
 * @param {Object} params.parcelsStore - Parcels store instance
 * @param {ParcelApprovalMode|boolean} params.approvalMode - Approval mode (default: SimpleApprove). Boolean values are kept for backwards compatibility.
 * @returns {Promise<void>}
 */
export async function approveParcel(values, item, parcelsStore, approvalMode = ParcelApprovalMode.SimpleApprove ) {
  if (item.value.id != values.id) return Promise.resolve()
  try {
    // First update the parcel with current form values
    await parcelsStore.update(item.value.id, values)
    // Then approve the parcel
    await parcelsStore.approve(item.value.id, approvalMode)
    // Reload the order data to reflect any changes
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при согласовании посылки'

    const alertStore = useAlertStore()
    alertStore.error(parcelsStore?.error || 'Ошибка при согласовании посылки')
  } finally {
      await parcelsStore.getById(item.value.id)
  }
}

/**
 * Generates XML for a parcel with current form values
 * @param {Object} params - Parameters object
 * @param {Object} params.values - Form values
 * @param {Object} params.item - Current parcel item ref
 * @param {Object} params.parcelsStore - Parcels store instance
 * @param {string|Function} params.filenameOrGenerator - Either a filename string or a function that returns filename
 * @returns {Promise<void>}
 */
export async function generateXml(item, parcelsStore, filenameOrGenerator) {
  try {
    
    // Determine filename
    let filename
    if (typeof filenameOrGenerator === 'function') {
      filename = filenameOrGenerator(item.value)
    } else {
      filename = filenameOrGenerator
    }
    
    // Then generate XML
    await parcelsStore.generate(item.value.id, filename)
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при генерации XML'
    const alertStore = useAlertStore()
    alertStore.error(parcelsStore.error)
  }
}

/**
 * Convenience function for approving parcel with excise
 * @param {Object} params - Parameters object (same as approveParcel)
 * @returns {Promise<void>}
 */
export async function approveParcelWithExcise(values, item, parcelsStore) {
  return approveParcel(values, item, parcelsStore, ParcelApprovalMode.ApproveWithExcise)
}

/**
 * Convenience function for approving parcel with notification
 * @param {Object} params - Parameters object (same as approveParcel)
 * @returns {Promise<void>}
 */
export async function approveParcelWithNotification(values, item, parcelsStore) {
  return approveParcel(values, item, parcelsStore, ParcelApprovalMode.ApproveWithNotification)
}
