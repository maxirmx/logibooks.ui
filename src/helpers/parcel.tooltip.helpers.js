// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { getCheckStatusInfo } from '@/helpers/parcels.check.helpers.js'

/**
 * Get tooltip for form fields combining title and tooltip information
 * @param {string} key - The field key
 * @param {Object} columnTitles - Object mapping field keys to titles
 * @param {Object} columnTooltips - Object mapping field keys to tooltips
 * @returns {string|null} Combined tooltip text or title only, or null if no title exists
 */
export function getFieldTooltip(key, columnTitles, columnTooltips) {
  const tooltip = columnTooltips[key]
  const title = columnTitles[key]

  if (tooltip && title) {
    return `${title} (${tooltip})`
  }
  return title || null
}

/**
 * Get tooltip for checkStatus with combined status info including issues details
 * @param {Object} item - The parcel item with checkStatus and other properties
 * @param {Function} getStatusTitle - Function to get status title by ID (deprecated parameter)
 * @param {Array} feacnOrders - Array of FEACN orders for issue checking
 * @param {Array} stopWords - Array of stop words for issue checking
 * @returns {string} Tooltip text with status and optional issue details
 */
export function getCheckStatusTooltip(item, getStatusTitle, feacnOrders, stopWords) {
  const baseTitle = new CheckStatusCode(item.checkStatus).toString()

  if (CheckStatusCode.hasIssues(item.checkStatus)) {
    const checkInfo = getCheckStatusInfo(item, feacnOrders, stopWords)
    if (checkInfo) {
      return `${baseTitle}\n${checkInfo}`
    }
  }

  return baseTitle
}
