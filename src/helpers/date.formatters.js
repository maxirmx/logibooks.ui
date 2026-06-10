// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

/**
 * Format date string to DD.MM.YYYY format
 * @param {string|Date|null} dateStr - Date string or Date object to format
 * @returns {string} Formatted date string in DD.MM.YYYY format, or empty string if input is falsy
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

/**
 * Format date-time value with Russian locale.
 * @param {string|Date|null} dateValue - Date-time string or Date object to format
 * @returns {string} Localized date-time string, or empty string if input is falsy
 */
export function formatDateTime(dateValue) {
  if (!dateValue) return ''
  const d = new Date(dateValue)
  if (isNaN(d)) return dateValue
  return d.toLocaleString('ru-RU')
}

/**
 * Format date-time value as local time with Russian locale.
 * @param {string|Date|null} dateValue - Date-time string or Date object to format
 * @returns {string} Localized time string, or empty string if input is falsy
 */
export function formatTime(dateValue) {
  if (!dateValue) return ''
  const d = new Date(dateValue)
  if (isNaN(d)) return dateValue
  return d.toLocaleTimeString('ru-RU')
}
