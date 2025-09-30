// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

/**
 * Helper functions for parcels list functionality shared between WBR and Ozon components
 */

import { HasIssues } from '@/helpers/parcels.check.helpers.js'
import { preloadFeacnInfo, getCachedFeacnInfo } from '@/helpers/feacn.info.helpers.js'

import { useAlertStore } from '@/stores/alert.store.js'

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
 * Validates a parcel against Stopwords or FEACN codes
 * @param {Object} item - The parcel item
 * @param {Object} parcelsStore - The parcels store instance
 * @param {Function} loadOrdersFn - Function to reload orders
 * @param {boolean} sw - Whether to validate against Stopwords (true) or FEACN (false)
 * @returns {Promise<void>}
 */
export async function validateParcelData(item, parcelsStore, loadOrdersFn, sw) {
  try {
    await parcelsStore.validate(item.id, sw)
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке информации о посылке'
    const alertStore = useAlertStore()
    alertStore.error(parcelsStore.error)
  } finally {
    loadOrdersFn()
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
  } catch (error) {
    const errorMessage = withExcise 
      ? 'Ошибка при согласовании посылки с акцизом'
      : 'Ошибка при согласовании посылки'
    parcelsStore.error = error?.response?.data?.message || errorMessage
    const alertStore = useAlertStore()
    alertStore.error(parcelsStore.error)
  } finally {
    loadOrdersFn()
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
    h.key !== 'tnVed' &&
    h.key !== 'postingNumber' &&
    h.key !== 'shk'
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
    const alertStore = useAlertStore()
    alertStore.error(parcelsStore.error)
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
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при подборе кодов ТН ВЭД'
    const alertStore = useAlertStore()
    alertStore.error(parcelsStore.error)
  }
  finally {
    if (loadOrdersFn) {
      loadOrdersFn()
    }
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
  
  const isMatched = tnVed && feacnCode === tnVed
  if (isMatched) {
    return 'feacn-code-item clickable matched'
  }
  const isMatchedWeak = tnVed && feacnCode.substring(0, 6) === tnVed.substring(0, 6)
  return `feacn-code-item clickable ${isMatchedWeak ? 'matched-weak' : 'unmatched'}`
}

/**
 * Helper function to get CSS class for TN VED cell based on FEACN codes
 * @param {string} tnVed - The current TN VED code
 * @param {Array<string>} feacnCodes - Array of FEACN codes
 * @returns {Promise<string>} CSS class name
 */
export async function getTnVedCellClass(tnVed, feacnCodes) {
  // Check if tnVed code was not found in globalFeacnInfo
  if (tnVed) {
    let cachedInfo = getCachedFeacnInfo(tnVed)

    // If not found in cache, load it first
    if (cachedInfo == null) {
      await preloadFeacnInfo([tnVed])
      cachedInfo = getCachedFeacnInfo(tnVed)
    }

    if (!cachedInfo || cachedInfo.found === false) {
      return 'tnved-cell not-exists'
    }
  }
 
  if (!feacnCodes || feacnCodes.length === 0) {
    return 'tnved-cell orphan'
  }
  
  const isMatched = tnVed && feacnCodes.includes(tnVed)

  if (isMatched) {
    return 'tnved-cell matched'
  }

  const isMatchedWeak = tnVed && feacnCodes.some(code => code.substring(0, 6) === tnVed.substring(0, 6))

  return isMatchedWeak ? 'tnved-cell matched-weak' : 'tnved-cell unmatched'
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
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при обновлении ТН ВЭД'
    const alertStore = useAlertStore()
    alertStore.error(parcelsStore.error)
  }
  finally {
    if (loadOrdersFn) {
      loadOrdersFn()
    }
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
    // Get data without updating the reactive store yet
    const response = await parcelsStore.getAll(registerId, { updateStore: false })
    
    if (response && response.items && response.items.length > 0) {
      const tnvedCodes = response.items
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
    
    // Now update the reactive store - watchers will fire with FEACN data ready
    parcelsStore.updateItems(response)
  }
}
