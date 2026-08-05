// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { useAlertStore } from '@/stores/alert.store.js'
import { useNotificationsStore } from '@/stores/notifications.store.js'

export function formatNotificationDate(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toLocaleDateString('ru-RU')

  if (typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('ru-RU')
    return value
  }

  if (typeof value === 'object' && value.year && value.month && value.day) {
    const date = new Date(value.year, value.month - 1, value.day)
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('ru-RU')
  }

  return ''
}

export async function buildNotificationTooltip(item) {
  if (!item || item.notificationId === undefined || item.notificationId === null) return ''

  const notificationsStore = useNotificationsStore()
  const notification = await notificationsStore.getById(item.notificationId)
  if (!notification) return `Id нотификации: ${item.notificationId} (данные не загружены)`

  const parts = ['Номер нотификации: ' + (notification.number || '(данные не загружены)')]

  if (notification.registrationDate) {
    const date = formatNotificationDate(notification.registrationDate)
    if (date) parts.push(`Дата регистрации: ${date}`)
  }

  if (notification.publicationDate) {
    const date = formatNotificationDate(notification.publicationDate)
    if (date) parts.push(`Дата публикации: ${date}`)
  }

  if (notification.terminationDate) {
    const date = formatNotificationDate(notification.terminationDate)
    if (date) parts.push(`Срок действия: ${date}`)
  }

  if (notification.comment) {
    const comment = String(notification.comment).trim()
    if (comment.length) {
      parts.push('Комментарий:')
      parts.push(comment)
    }
  }

  return parts.join('\n')
}

/**
 * Runs a page load and turns a rejection into one persistent, retryable message.
 * The rejection is handled here, so callers may safely use this from lifecycle hooks.
 */
export async function runWithRetryAlert(
  operation,
  { fallback = 'Не удалось загрузить данные', title = '', actionLabel = 'Повторить' } = {}
) {
  const alertStore = useAlertStore()

  try {
    return await operation()
  } catch (error) {
    alertStore.error(error, {
      fallback,
      title,
      action: {
        label: actionLabel,
        handler: () => runWithRetryAlert(operation, { fallback, title, actionLabel })
      }
    })
    return null
  }
}
