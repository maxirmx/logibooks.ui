// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { reportError } from '@/helpers/error.helpers.js'

const CONFIRMATION_CODE = 'RegisterRestrictionChangeConfirmationRequired'

/** Keep the acknowledgement scoped to one captured submission, never to reactive register state. */
export function useRegisterRestrictionChangeConfirmation({ update, confirm, isActive }) {
  return async (id, payload) => {
    const request = { ...payload }
    delete request.restrictionChangeConfirmationToken
    while (isActive()) {
      try {
        await update(id, { ...request })
        return isActive()
      } catch (error) {
        if (!isActive()) {
          // The editor has gone away: report late technical failures without showing a stale alert.
          reportError(error, { context: 'register update after editor disposal' })
          return false
        }
        const details = error?.data?.details
        if (error?.status !== 409 || error?.data?.code !== CONFIRMATION_CODE ||
            typeof details?.confirmationToken !== 'string' || !details.confirmationToken ||
            typeof error.data.msg !== 'string' || !error.data.msg.trim()) throw error

        let accepted
        try {
          accepted = await confirm({
            title: 'Подтверждение',
            content: error.data.msg,
            confirmationText: 'Изменить',
            cancellationText: 'Не изменять'
          })
        } catch (confirmationError) {
          if (isActive()) throw confirmationError
          // A dismissed editor cannot own an alert, but an unexpected dialog failure is recorded.
          reportError(confirmationError, { context: 'register confirmation after editor disposal' })
          return false
        }
        if (!accepted || !isActive()) return false
        request.restrictionChangeConfirmationToken = details.confirmationToken
      }
    }
    return false
  }
}
