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
 * Generates complete feacn orders information text
 * @param {Object} item - The parcel item containing feacnOrderIds
 * @param {Array} feacnOrdersCollection - Collection of all feacn orders
 * @returns {string|null} - Formatted complete feacn orders information or null
 */
export function getFeacnOrdersInfo(item, feacnOrdersCollection) {
  const feacnOrdersList = getFeacnOrdersText(item, feacnOrdersCollection)
  
  if (feacnOrdersList) {
    return `Возможные ограничения по коду ТН ВЭД: ${feacnOrdersList}`
  }
  
  return null
}

/**
 * Generates combined check information text with both feacn orders and stopwords
 * @param {Object} item - The parcel item containing feacnOrderIds and stopWordIds
 * @param {Array} feacnOrdersCollection - Collection of all feacn orders
 * @param {Array} stopWordsCollection - Collection of all stopwords
 * @returns {string|null} - Combined formatted information or null if neither present
 */
export function getCheckStatusInfo(item, feacnOrdersCollection, stopWordsCollection) {
  const feacnInfo = getFeacnOrdersInfo(item, feacnOrdersCollection)
  const stopWordsInfo = getStopWordsInfo(item, stopWordsCollection)
  if (feacnInfo && stopWordsInfo) {
    return `${feacnInfo}; ${stopWordsInfo}`
  }
  
  if (feacnInfo) {
    return feacnInfo
  }
  
  if (stopWordsInfo) {
    return stopWordsInfo
  }
  
  return null
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
  return checkStatusId == 399
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

