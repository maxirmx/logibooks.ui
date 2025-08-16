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

/**
 * Helper functions for parcels list functionality shared between WBR and Ozon components
 */

import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { HasIssues } from '@/helpers/orders.check.helper.js'

/**
 * Fetches register data including status counts
 * @param {number} registerId - The register ID
 * @param {Object} refs - Object containing reactive refs for statuses, fileName, dealNumber
 * @returns {Promise<void>}
 */
export async function fetchRegisterData(registerId, refs) {
  try {
    const res = await fetchWrapper.get(`${apiUrl}/registers/${registerId}`)
    const byStatus = res.ordersByStatus || {}
    refs.statuses.value = Object.keys(byStatus).map((id) => ({
      id: Number(id),
      count: byStatus[id]
    }))
    refs.registerFileName.value = res.fileName || ''
    refs.registerDealNumber.value = res.dealNumber || ''
  } catch {
    // ignore errors
  }
}

/**
 * Loads parcels for a register
 * @param {number} registerId - The register ID
 * @param {Object} parcelsStore - The parcels store instance
 */
export function loadParcelsData(registerId, parcelsStore) {
  parcelsStore.getAll(registerId)
}

/**
 * Navigates to edit parcel page
 * @param {Object} router - Vue router instance
 * @param {Object} item - The parcel item
 * @param {string} routeName - The route name to navigate to
 * @param {Object} queryParams - Query parameters to pass
 */
export function navigateToEditParcel(router, item, routeName, queryParams = {}) {
  router.push({
    name: routeName,
    params: { id: item.id },
    query: queryParams
  })
}

/**
 * Validates a parcel - handles platform-specific validation
 * @param {Object} item - The parcel item
 * @param {Object} parcelsStore - The parcels store instance
 * @param {Object} alertStore - The alert store instance
 * @param {string} platform - Platform type ('wbr' or 'ozon')
 * @param {Function} loadOrdersFn - Function to reload orders
 * @returns {Promise<void>}
 */
export async function validateParcelData(item, parcelsStore, alertStore, platform, loadOrdersFn) {
  try {
    if (platform === 'ozon') {
      alertStore.error('Валидация посылки для Ozon платформы пока не реализована')
      return
    }
    
    await parcelsStore.validate(item.id)
    loadOrdersFn()
  } catch (error) {
    console.error('Failed to validate parcel:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке информации о посылке'
  }
}

/**
 * Approves a parcel and reloads data
 * @param {Object} item - The parcel item
 * @param {Object} parcelsStore - The parcels store instance
 * @param {Object} alertStore - The alert store instance
 * @param {string} platform - Platform type ('wbr' or 'ozon')
 * @param {Function} loadOrdersFn - Function to reload orders
 * @returns {Promise<void>}
 */
export async function approveParcelData(item, parcelsStore, alertStore, platform, loadOrdersFn) {
  try {
    await parcelsStore.approve(item.id)
    loadOrdersFn()
  } catch (error) {
    console.error('Failed to approve parcel:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при согласовании посылки'
  }
}

/**
 * Returns CSS class props for table rows based on check status
 * @param {Object} data - Table row data containing item
 * @returns {Object} Props object with CSS class
 */
export function getRowPropsForParcel(data) {
  return { class: '' + (HasIssues(data.item.checkStatusId) ? 'order-has-issues' : '') }
}

/**
 * Filters headers that need generic templates (excludes special template headers)
 * @param {Array} headers - Array of table headers
 * @returns {Array} Filtered headers array
 */
export function filterGenericTemplateHeadersForParcel(headers) {
  return headers.filter(h => 
    !h.key.startsWith('actions') && 
    h.key !== 'productLink' && 
    h.key !== 'statusId' && 
    h.key !== 'checkStatusId' && 
    h.key !== 'countryCode'
  )
}


/**
 * Generates register display name based on deal number or filename
 * @param {string} dealNumber - Register deal number
 * @param {string} fileName - Register file name
 * @returns {string} Formatted register name
 */
export function generateRegisterName(dealNumber, fileName) {
  if (dealNumber && String(dealNumber).trim() !== '') {
    return `Реестр для сделки ${dealNumber}`
  } else {
    return 'Реестр для сделки без номера (файл: ' + fileName + ')'
  }
}

/**
 * Creates status filter options for dropdown
 * @param {Array} statuses - Array of status objects with id and count
 * @param {Object} parcelStatusStore - Parcel status store for getting titles
 * @returns {Array} Array of status options for dropdown
 */
export function createStatusOptions(statuses, parcelStatusStore) {
  return [
    { value: null, title: 'Все' },
    ...statuses.map((s) => ({
      value: s.id,
      title: `${parcelStatusStore.getStatusTitle(s.id)} (${s.count})`
    }))
  ]
}

/**
 * Exports parcel XML with provided filename
 * @param {Object} item - The parcel item
 * @param {Object} parcelsStore - The parcels store instance
 * @param {string} filename - The filename to use for export
 * @returns {Promise<void>}
 */
export async function exportParcelXmlData(item, parcelsStore, filename) {
  try {
    await parcelsStore.generate(item.id, filename)
  } catch (error) {
    console.error('Failed to export parcel XML:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при выгрузке накладной для посылки'
  }
}

/**
 * Looks up FEACN codes for a parcel (stub implementation)
 * @param {Object} item - The parcel item
 * @param {Object} alertStore - The alert store instance
 * @returns {Promise<void>}
 */
export async function lookupFeacn(item, alertStore) {
  try {
    // TODO: Implement FEACN lookup functionality
    alertStore.info('Подбор кодов ТН ВЭД пока не реализован')
  } catch (error) {
    console.error('Failed to lookup FEACN codes:', error)
    alertStore.error('Ошибка при подборе кодов ТН ВЭД')
  }
}
