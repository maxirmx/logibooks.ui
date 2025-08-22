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

import { HasIssues, getCheckStatusInfo } from '@/helpers/parcels.check.helpers.js'

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
