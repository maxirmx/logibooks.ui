import { HasIssues, getCheckStatusInfo } from '@/helpers/orders.check.helper.js'

/**
 * Get tooltip for column headers combining title and tooltip information
 * @param {string} key - The column key
 * @param {Object} columnTitles - Object mapping column keys to titles
 * @param {Object} columnTooltips - Object mapping column keys to tooltips
 * @returns {string|null} Combined tooltip text or title only, or null if no title exists
 */
export function getColumnTooltip(key, columnTitles, columnTooltips) {
  const tooltip = columnTooltips[key]
  const title = columnTitles[key]

  if (tooltip && title) {
    return `${title} (${tooltip})`
  }
  return title || null
}

/**
 * Get tooltip for checkStatusId with combined status info including issues details
 * @param {Object} item - The parcel item with checkStatusId and other properties
 * @param {Function} getStatusTitle - Function to get status title by ID
 * @param {Array} feacnOrders - Array of FEACN orders for issue checking
 * @param {Array} stopWords - Array of stop words for issue checking
 * @returns {string} Tooltip text with status and optional issue details
 */
export function getCheckStatusTooltip(item, getStatusTitle, feacnOrders, stopWords) {
  const baseTitle = getStatusTitle(item.checkStatusId)

  if (HasIssues(item.checkStatusId)) {
    const checkInfo = getCheckStatusInfo(item, feacnOrders, stopWords)
    if (checkInfo) {
      return `${baseTitle}\n${checkInfo}`
    }
  }

  return baseTitle
}
