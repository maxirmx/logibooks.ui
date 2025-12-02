// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { CheckStatusCode, SWCheckStatus } from './check.status.code.js'

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
 * @param {Object} item - The parcel item containing feacnOrderIds, stopWordIds, and optionally matchingFCComment
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
  
  // Add matchingSWComment if present
  if (item?.matchingSWComment) {
    allInfo.push(item.matchingSWComment)
  }
  
  return allInfo.length > 0 ? allInfo.join('; ') : null
}

/**
 * Get CSS class name for check status styling
 * @param {number} checkStatus - The check status identifier
 * @returns {string} CSS class name for styling the status cell
 */
export function getCheckStatusClass(checkStatus) {
  if (checkStatus === undefined || checkStatus === null) {
    return ''
  }

  if (checkStatus === CheckStatusCode.NotChecked.value) {
    return 'not-checked'
  }

  if (checkStatus === CheckStatusCode.ApprovedWithExcise.value) {
    return 'is-approved-with-excise'
  }

  if (CheckStatusCode.getSW(checkStatus) === SWCheckStatus.IssueStopWordInherited) {
    return 'has-issues-with-inheritance'
  }

  if (CheckStatusCode.hasIssues(checkStatus)) {
    return 'has-issues'
  }

  if (CheckStatusCode.getSW(checkStatus) === SWCheckStatus.ApprovedInherited) {
    return 'is-approved-with-inheritance'
  }

  if (CheckStatusCode.getSW(checkStatus) === SWCheckStatus.Approved) {
    return 'is-approved'
  }

  return 'no-issues'
}

