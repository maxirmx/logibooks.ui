// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

/**
 * Validates a parcel with current form values
 * @param {Object} params - Parameters object
 * @param {Object} params.values - Form values
 * @param {Object} params.item - Current parcel item ref
 * @param {number} params.parcelId - Parcel ID for reloading
 * @param {Object} params.parcelsStore - Parcels store instance
 * @returns {Promise<void>}
 */
export async function validateParcel({ values, item, parcelId, parcelsStore }) {
  try {
    // First update the parcel with current form values
    await parcelsStore.update(item.value.id, values)
    // Then validate the parcel
    await parcelsStore.validate(item.value.id)
    // Optionally reload the order data to reflect any changes
    await parcelsStore.getById(parcelId)
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке посылки'
  }
}

/**
 * Approves a parcel with current form values
 * @param {Object} params - Parameters object
 * @param {Object} params.values - Form values
 * @param {Object} params.item - Current parcel item ref
 * @param {number} params.parcelId - Parcel ID for updating and reloading
 * @param {Object} params.parcelsStore - Parcels store instance
 * @param {boolean} params.withExcise - Whether to approve with excise (default: false)
 * @returns {Promise<void>}
 */
export async function approveParcel({ values, item, parcelId, parcelsStore, withExcise = false }) {
  try {
    // First update the parcel with current form values
    await parcelsStore.update(parcelId, values)
    // Then approve the parcel
    await parcelsStore.approve(item.value.id, withExcise)
    // Reload the order data to reflect any changes
    await parcelsStore.getById(parcelId)
  } catch (error) {
    const errorMessage = withExcise 
      ? 'Ошибка при согласовании посылки с акцизом'
      : 'Ошибка при согласовании посылки'
    parcelsStore.error = error?.response?.data?.message || errorMessage
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
export async function generateXml({ values, item, parcelsStore, filenameOrGenerator }) {
  try {
    // First update the parcel with current form values
    await parcelsStore.update(item.value.id, values)
    
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
  }
}

/**
 * Convenience function for approving parcel with excise
 * @param {Object} params - Parameters object (same as approveParcel)
 * @returns {Promise<void>}
 */
export async function approveParcelWithExcise(params) {
  return approveParcel({ ...params, withExcise: true })
}
