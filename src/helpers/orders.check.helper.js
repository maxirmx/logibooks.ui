/**
 * Helper functions for orders checking (stopwords and feacn codes)
 */

/**
 * Generates stopwords text for display
 * @param {Object} item - The order item containing stopWordIds
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
 * @param {Object} item - The order item containing feacnOrderIds
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
 * @param {Object} item - The order item containing stopWordIds
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
 * @param {Object} item - The order item containing feacnOrderIds
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
 * Generates combined check order information text with both feacn orders and stopwords
 * @param {Object} item - The order item containing feacnOrderIds and stopWordIds
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
