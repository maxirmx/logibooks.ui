// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

/**
 * Check status IDs that should be filtered out from UI selectors
 * These statuses are for internal use only and should not be user-selectable
 */
export const HIDDEN_CHECK_STATUS_IDS = [102, 103, 200]

/**
 * Filter function to exclude hidden check status IDs from UI options
 * @param {Object} status - The check status object with id and title
 * @returns {boolean} True if the status should be shown in the UI
 */
export function isSelectableCheckStatus(status) {
  return !HIDDEN_CHECK_STATUS_IDS.includes(status.id)
}

/**
 * Generates stopwords text for display
 * @param {Object} item - The parcel item containing stopWordIds
 * @param {Array} stopWordsCollection - Collection of all stopwords
 * @returns {string|null} - Formatted stopwords text or null if no stopwords
 */
export function getStopWordsText(item, stopWordsCollection) {
  if (!item?.stopWordIds || item.stopWordIds.length === 0) {
    return null
  }

  const stopWordsList = item.stopWordIds
    .map(id => stopWordsCollection.find(sw => sw.id === id))
    .filter(sw => sw) // Remove any undefined values
    .map(sw => `'${sw.word}'`)
    .join(', ')
  
  return stopWordsList || null
}

/**
 * Generates feacn orders comment text for display
 * @param {Object} item - The parcel item containing feacnOrderIds
 * @param {Array} feacnOrdersCollection - Collection of all feacn orders
 * @returns {string|null} - Formatted feacn orders comment text or null if no orders
 */
export function getFeacnOrdersText(item, feacnOrdersCollection) {
  if (!item?.feacnOrderIds || item.feacnOrderIds.length === 0) {
    return null
  }

  const feacnOrdersList = item.feacnOrderIds
    .map(id => feacnOrdersCollection.find(fo => fo.id === id))
    .filter(fo => fo && fo.comment) // Remove any undefined values and items without comments
    .map(fo => `'${fo.comment}'`)
    .join(', ')
  
  return feacnOrdersList || null
}

/**
 * Generates complete stopwords information text
 * @param {Object} item - The parcel item containing stopWordIds
 * @param {Array} stopWordsCollection - Collection of all stopwords
 * @returns {string|null} - Formatted complete stopwords information or null
 */
export function getStopWordsInfo(item, stopWordsCollection) {
  const stopWordsList = getStopWordsText(item, stopWordsCollection)
  
  if (stopWordsList) {
    return `Стоп-слова и фразы: ${stopWordsList}`
  }
  
  return null
}

/**
 * Generates complete manually created feacn prefixes information text
 * @param {Object} item - The parcel item containing feacnPrefixIds
 * @param {Array} feacnPrefixesCollection - Collection of all feacn prefixes
 * @returns {string|null} - Formatted complete feacn prefixes information or null
 */
export function getFeacnPrefixesInfo(item, feacnPrefixesCollection) {
  if (!item?.feacnPrefixIds || item.feacnPrefixIds.length === 0) {
    return null
  }

  const feacnPrefixesList = item.feacnPrefixIds
    .map(id => feacnPrefixesCollection.find(fp => fp.id === id))
    .filter(fp => fp) // Remove any undefined values
    .map(fp => `'${fp.code}'`)
    .join(', ')

  if (feacnPrefixesList) {
    return `Ограничения по коду ТН ВЭД (установлено вручную): ${feacnPrefixesList}`
  }

  return null
}

/**
 * Generates complete feacn orders information text
 * @param {Object} item - The parcel item containing feacnOrderIds
 * @param {Array} feacnOrdersCollection - Collection of all feacn orders
 * @returns {string|null} - Formatted complete feacn orders information or null
 */
export function getFeacnOrdersInfo(item, feacnOrdersCollection) {
  const feacnOrdersList = getFeacnOrdersText(item, feacnOrdersCollection)
  
  if (feacnOrdersList) {
    return `Ограничения по коду ТН ВЭД (постановление): ${feacnOrdersList}`
  }
  
  return null
}

/**
 * Generates combined check information text with both feacn orders and stopwords
 * @param {Object} item - The parcel item containing feacnOrderIds and stopWordIds
 * @param {Array} feacnOrdersCollection - Collection of all feacn orders
 * @param {Array} stopWordsCollection - Collection of all stopwords
 * @param {Array} feacnPrefixesCollection - Collection of all manually set feacn prefixes
 * @returns {string|null} - Combined formatted information or null if neither present
 */
export function getCheckStatusInfo(item, feacnOrdersCollection, stopWordsCollection, feacnPrefixesCollection) {
  const feacnInfo = getFeacnOrdersInfo(item, feacnOrdersCollection)
  const stopWordsInfo = getStopWordsInfo(item, stopWordsCollection)
  const feacnPrefixesInfo = getFeacnPrefixesInfo(item, feacnPrefixesCollection)
  
  const allInfo = [feacnInfo, stopWordsInfo, feacnPrefixesInfo].filter(info => info !== null)
  
  return allInfo.length > 0 ? allInfo.join('; ') : null
}

/**
 * Determine if a check status id indicates issues
 * @param {number} checkStatusId - The check status identifier
 * @returns {boolean} True if the id is > 100 and <= 200
 */
export function HasIssues(checkStatusId) {
  return checkStatusId > 100 && checkStatusId <= 200
}

export function IsNotChecked(checkStatusId) {
  return checkStatusId <= 100 
}

export function HasNoIssues(checkStatusId) {
  return checkStatusId > 200 && checkStatusId <= 300
}

export function IsApproved(checkStatusId) {
  return checkStatusId > 300 && checkStatusId < 399
}

export function IsApprovedWithExcise(checkStatusId) {
  return checkStatusId === 399
}

/**
 * Get CSS class name for check status styling
 * @param {number} checkStatusId - The check status identifier
 * @returns {string} CSS class name for styling the status cell
 */
export function getCheckStatusClass(checkStatusId) {
  if (checkStatusId === undefined || checkStatusId === null) {
    return ''
  }
  if (HasIssues(checkStatusId)) {
    return 'has-issues'
  }
  if (IsNotChecked(checkStatusId)) {
    return 'not-checked'
  }
  if (HasNoIssues(checkStatusId)) {
    return 'no-issues'
  }
  if (IsApproved(checkStatusId)) {
    return 'is-approved'
  }
  if (IsApprovedWithExcise(checkStatusId)) {
    return 'is-approved-with-excise'
  }
  return ''
}

