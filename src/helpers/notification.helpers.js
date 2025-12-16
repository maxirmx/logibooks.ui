// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

/**
 * Formats a notification date value to locale string
 * @param {string|Date|Object} value - Date value that can be string, Date, or {year, month, day}
 * @returns {string} Formatted date string or empty string if value is invalid
 */
export function formatNotificationDate(value) {
  if (!value) {
    return ''
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('ru-RU')
  }

  if (typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('ru-RU')
    }
    return value
  }

  if (typeof value === 'object' && value.year && value.month && value.day) {
    const date = new Date(value.year, value.month - 1, value.day)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('ru-RU')
    }
  }

  return ''
}

function buildNotificationField(item, primary, fallback) {
  return item?.[primary] ?? item?.[fallback]
}

/**
 * Builds tooltip text for notification details
 * @param {Object} item - Source object containing notification fields
 * @returns {string} Tooltip text with available notification details
 */
export function buildNotificationTooltip(item) {
  if (!item || item.notificationId === undefined || item.notificationId === null) return ''

  const number = buildNotificationField(item, 'notificationNumber', 'number')
  const registrationDate = formatNotificationDate(
    buildNotificationField(item, 'notificationRegistrationDate', 'registrationDate')
  )
  const publicationDate = formatNotificationDate(
    buildNotificationField(item, 'notificationPublicationDate', 'publicationDate')
  )
  const terminationDate = formatNotificationDate(
    buildNotificationField(item, 'notificationTerminationDate', 'terminationDate')
  )

  return [
    number ? `Номер: ${number}` : null,
    registrationDate ? `Дата регистрации: ${registrationDate}` : null,
    publicationDate ? `Дата публикации: ${publicationDate}` : null,
    terminationDate ? `Дата окончания: ${terminationDate}` : null
  ]
    .filter(Boolean)
    .join('\n')
}
