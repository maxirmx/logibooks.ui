/**
 * Helper functions for stopwords handling
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
