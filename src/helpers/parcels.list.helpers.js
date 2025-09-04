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

import { HasIssues } from '@/helpers/parcels.check.helpers.js'
import { preloadFeacnInfo, getCachedFeacnInfo } from '@/helpers/feacn.info.helpers.js'

/**
 * Navigates to edit parcel page
 * @param {Object} router - Vue router instance
 * @param {Object} item - The parcel item
 * @param {string} routeName - The route name to navigate to
 * @param {Object} queryParams - Query parameters to pass
 */
export function navigateToEditParcel(router, item, routeName, queryParams = {}) {
  const { registerId, ...otherQueryParams } = queryParams
  
  router.push({
    name: routeName,
    params: { 
      id: item.id,
      registerId: registerId
    },
    query: otherQueryParams
  })
}

/**
 * Validates a parcel - handles platform-specific validation
 * @param {Object} item - The parcel item
 * @param {Object} parcelsStore - The parcels store instance
 * @param {Function} loadOrdersFn - Function to reload orders
 * @returns {Promise<void>}
 */
export async function validateParcelData(item, parcelsStore, loadOrdersFn) {
  try {
    await parcelsStore.validate(item.id)
    loadOrdersFn()
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке информации о посылке'
  }
}

/**
 * Approves a parcel and reloads data
 * @param {Object} item - The parcel item
 * @param {Object} parcelsStore - The parcels store instance
 * @param {Function} loadOrdersFn - Function to reload orders
 * @param {boolean} withExcise - Whether to approve with excise (default: false)
 * @returns {Promise<void>}
 */
export async function approveParcelData(item, parcelsStore, loadOrdersFn, withExcise = false) {
  try {
    await parcelsStore.approve(item.id, withExcise)
    loadOrdersFn()
  } catch (error) {
    const errorMessage = withExcise 
      ? 'Ошибка при согласовании посылки с акцизом'
      : 'Ошибка при согласовании посылки'
    parcelsStore.error = error?.response?.data?.message || errorMessage
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
    h.key !== 'countryCode' &&
    h.key !== 'feacnLookup' &&
    h.key !== 'tnVed'
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
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при выгрузке накладной для посылки'
  }
}

/**
 * Looks up FEACN codes for a parcel
 * @param {Object} item - The parcel item
 * @param {Object} parcelsStore - The parcels store instance
 * @param {Function} loadOrdersFn - Function to reload orders
 * @returns {Promise<void>}
 */
export async function lookupFeacn(item, parcelsStore, loadOrdersFn) {
  try {
    await parcelsStore.lookupFeacnCode(item.id)
    if (loadOrdersFn) {
      loadOrdersFn()
    }
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при подборе кодов ТН ВЭД'

  }
}

/**
 * Helper function to get FEACN codes for keyword IDs
 * @param {Array<number>} keywordIds - Array of keyword IDs
 * @param {Object} keyWordsStore - The keywords store instance
 * @returns {Array<string>} Array of FEACN codes sorted as 10-digit integers
 */
export function getFeacnCodesForKeywords(keywordIds, keyWordsStore) {
  if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
    return []
  }

  return keywordIds
    .reduce((acc, id) => {
      const keyword = keyWordsStore.keyWords.find(kw => kw.id === id)
      if (keyword && Array.isArray(keyword.feacnCodes)) {
        acc.push(...keyword.feacnCodes)
      }
      return acc
    }, [])
    .filter(code => code !== null && code !== '')
    .sort((a, b) => {
      const numA = parseInt(a, 10)
      const numB = parseInt(b, 10)
      return numA - numB
    })
}

/**
 * Helper function to get keyword/FEACN code pairs
 * @param {Array<number>} keywordIds - Array of keyword IDs
 * @param {Object} keyWordsStore - The keywords store instance
 * @returns {Array<Object>} Array of objects { id, word, feacnCode }
 */
export function getKeywordFeacnPairs(keywordIds, keyWordsStore) {
  if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
    return []
  }

  return keywordIds
    .flatMap((id) => {
      const keyword = keyWordsStore.keyWords.find((kw) => kw.id === id)
      if (keyword && Array.isArray(keyword.feacnCodes)) {
        return keyword.feacnCodes
          .filter((code) => code !== null && code !== '')
          .map((code) => ({ id: `${id}-${code}`, word: keyword.word, feacnCode: code }))
      }
      return []
    })
    .sort((a, b) => {
      const numA = parseInt(a.feacnCode, 10)
      const numB = parseInt(b.feacnCode, 10)
      return numA - numB
    })
}

/**
 * Helper function to get CSS class for FEACN code item based on match status
 * @param {string} feacnCode - The FEACN code to check
 * @param {string} tnVed - The current TN VED code
 * @param {Array<string>} allFeacnCodes - All FEACN codes for this item
 * @returns {string} CSS class name
 */
export function getFeacnCodeItemClass(feacnCode, tnVed, allFeacnCodes) {
  if (!allFeacnCodes || allFeacnCodes.length === 0) {
    return 'feacn-code-item'
  }
  
  const isMatched = tnVed && allFeacnCodes.includes(tnVed) && feacnCode === tnVed
  return `feacn-code-item clickable ${isMatched ? 'matched' : 'unmatched'}`
}

/**
 * Helper function to get CSS class for TN VED cell based on FEACN codes
 * @param {string} tnVed - The current TN VED code
 * @param {Array<string>} feacnCodes - Array of FEACN codes
 * @returns {string} CSS class name
 */
export function getTnVedCellClass(tnVed, feacnCodes) {
  // First check if feacnCodes is empty or null
  if (!feacnCodes || feacnCodes.length === 0) {
    return 'tnved-cell orphan'
  }
  
  // Check if tnVed code was not found in globalFeacnInfo
  if (tnVed) {
    let cachedInfo = getCachedFeacnInfo(tnVed)

    // If not found in cache, load it first
    if (cachedInfo == null) {
      preloadFeacnInfo([tnVed])
      cachedInfo = getCachedFeacnInfo(tnVed)
    }

    if (!cachedInfo || cachedInfo.found === false) {
      return 'tnved-cell not-exists'
    }
  }
 
  const isMatched = tnVed && feacnCodes.includes(tnVed)
  return isMatched ? 'tnved-cell matched' : 'tnved-cell unmatched'
}

/**
 * Updates a parcel's TN VED code
 * @param {Object} item - The parcel item
 * @param {string} feacnCode - The FEACN code to set as TN VED
 * @param {Object} parcelsStore - The parcels store instance
 * @param {Function} loadOrdersFn - Function to reload orders
 * @returns {Promise<void>}
 */
export async function updateParcelTnVed(item, feacnCode, parcelsStore, loadOrdersFn) {
  try {
    const updatedItem = { ...item, tnVed: feacnCode }
    await parcelsStore.update(item.id, updatedItem)
    if (loadOrdersFn) {
      loadOrdersFn()
    }
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при обновлении ТН ВЭД'
  }
}

/**
 * Loads orders/parcels for a register with FEACN info preloading
 * @param {number} registerId - The register ID
 * @param {Object} parcelsStore - The parcels store instance
 * @param {Object} isComponentMounted - Ref indicating if component is mounted
 * @param {Object} alertStore - The alert store instance for error reporting
 * @returns {Promise<void>}
 */
export async function loadOrders(registerId, parcelsStore, isComponentMounted, alertStore) {
  if (isComponentMounted.value) {
    await parcelsStore.getAll(registerId)
    
    // Preload FEACN info for all tnved values in the current page
    if (parcelsStore.items && parcelsStore.items.length > 0) {
      const tnvedCodes = parcelsStore.items
        .map(parcel => parcel.tnVed)
        .filter(tnved => tnved && tnved.trim() !== '')
      
      if (tnvedCodes.length > 0) {
        try {
          await preloadFeacnInfo(tnvedCodes)
        } catch {
          if (alertStore) {
            alertStore.error('Не удалось загрузить информацию о кодах ТН ВЭД')
          }
        }
      }
    }
  }
}
