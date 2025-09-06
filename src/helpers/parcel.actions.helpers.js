// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { useAlertStore } from '@/stores/alert.store.js'

/**
 * Validates parcel data
 * @param {*} item - Parcel item
 * @param {*} parcelsStore - Parcels store
 * @param {*} loadOrdersFn - Load orders function
 * @param {boolean} sw - Whether to validate against Stopwords (true) or FEACN (false)
 * @returns {Promise<boolean>}
 */
export async function validateParcelData(values, item, parcelsStore, sw) {
  try {
    await parcelsStore.update(item.value.id, values)
    await parcelsStore.validate(item.value.id, sw)
  } catch (error) {
    const alertStore = useAlertStore()
    alertStore.error = error?.response?.data?.message || 'Ошибка при проверке информации о посылке'
    if (parcelsStore) {
      parcelsStore.error = alertStore.error
    }
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
 * @param {boolean} params.withExcise - Whether to approve with excise (default: false)
 * @returns {Promise<void>}
 */
export async function approveParcel(values, item, parcelsStore, withExcise = false ) {
  try {
    // First update the parcel with current form values
    await parcelsStore.update(item.value.id, values)
    // Then approve the parcel
    await parcelsStore.approve(item.value.id, withExcise)
    // Reload the order data to reflect any changes
  } catch (error) {
    const errorMessage = withExcise 
      ? 'Ошибка при согласовании посылки с акцизом'
      : 'Ошибка при согласовании посылки'
    parcelsStore.error = error?.response?.data?.message || errorMessage

    const alertStore = useAlertStore()
    alertStore.error = parcelsStore?.error || errorMessage
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
export async function generateXml(values, item, parcelsStore, filenameOrGenerator) {
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
    const alertStore = useAlertStore()
    alertStore.error = parcelsStore.error
  }
}

/**
 * Convenience function for approving parcel with excise
 * @param {Object} params - Parameters object (same as approveParcel)
 * @returns {Promise<void>}
 */
export async function approveParcelWithExcise({ values, item, parcelsStore }) {
  return approveParcel(values, item, parcelsStore, true)
}
