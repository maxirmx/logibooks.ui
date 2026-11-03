// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { buildFinishPassportCheckWarning, confirmPassportCheckRestart } from '@/helpers/lifecycle.warning.helpers.js'

describe('lifecycle warning helpers', () => {
  it.each([
    [1, 12, 'для 1 посылки она не проводилась; для 12 посылок она ещё выполняется'],
    [21, 0, 'для 21 посылки она не проводилась'],
    [11, 0, 'для 11 посылок она не проводилась'],
    [0, 2, 'для 2 посылок она ещё выполняется']
  ])('builds finish warning for %i/%i', (notChecked, inProgress, clause) => {
    expect(buildFinishPassportCheckWarning(notChecked, inProgress)).toBe(
      `Вы завершаете проверку паспортов, хотя ${clause}. Целостность выгружаемых данных может быть нарушена.`
    )
  })

  it('refreshes before deciding whether a passport restart needs confirmation', async () => {
    const confirm = vi.fn().mockResolvedValue(true)
    const registersStore = {
      item: null,
      getById: vi.fn(async () => {
        registersStore.item = { passportCheckWasFinished: true }
      })
    }

    await expect(confirmPassportCheckRestart({
      registerId: 7, registersStore, confirm, parcelCount: 1
    })).resolves.toBe(true)
    expect(registersStore.getById).toHaveBeenCalledWith(7)
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining('проверку паспорта, хотя')
    }))
  })

  it('propagates register refresh failures without opening confirmation', async () => {
    const refreshError = new Error('register refresh failed')
    const confirm = vi.fn()
    const registersStore = {
      item: { passportCheckWasFinished: true },
      getById: vi.fn().mockRejectedValue(refreshError)
    }

    await expect(confirmPassportCheckRestart({
      registerId: 7, registersStore, confirm, parcelCount: 1
    })).rejects.toBe(refreshError)
    expect(confirm).not.toHaveBeenCalled()
  })

})
