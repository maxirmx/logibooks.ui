// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { useNotificationsStore } from '@/stores/notifications.store.js'

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

/**
 * Builds tooltip text for notification details
 * @param {Object} item - Source object containing notificationId
 * @returns {Promise<string>} Tooltip text with available notification details
 */
export async function buildNotificationTooltip(item) {
  if (!item || item.notificationId === undefined || item.notificationId === null) return ''

  const notificationsStore = useNotificationsStore()
  const notification = await notificationsStore.getById(item.notificationId)
  
  if (!notification) {
    return `Id нотификации: ${item.notificationId} (данные не загружены)`
  }

  const parts = [
    'Номер нотификации: ' + (notification.number || '(данные не загружены)')
  ] 
  
  if (notification.registrationDate) {
    const formattedDate = formatNotificationDate(notification.registrationDate)
    if (formattedDate) {
      parts.push(`Дата регистрации: ${formattedDate}`)
    }
  }
  
  if (notification.publicationDate) {
    const formattedDate = formatNotificationDate(notification.publicationDate)
    if (formattedDate) {
      parts.push(`Дата публикации: ${formattedDate}`)
    }
  }
  
  if (notification.terminationDate) {
    const formattedDate = formatNotificationDate(notification.terminationDate)
    if (formattedDate) {
      parts.push(`Срок действия: ${formattedDate}`)
    }
  }

  if (notification.comment) {
    const c = String(notification.comment).trim()
    if (c.length) {
      parts.push('Комментарий:')
      parts.push(`${c}`)
    }
  }

  return parts.join('\n')
}
