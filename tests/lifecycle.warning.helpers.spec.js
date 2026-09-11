// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import {
  buildCustomsExclusionWarning,
  buildClearPassportCheckWarning,
  buildFinishPassportCheckWarning,
  buildRestartPassportCheckWarning,
  confirmCustomsExclusionStatusChange,
  confirmPassportCheckRestart
} from '@/helpers/lifecycle.warning.helpers.js'

describe('lifecycle warning helpers', () => {
  it('builds singular and plural customs exclusion warnings', () => {
    expect(buildCustomsExclusionWarning('Исключена', 1)).toBe(
      'Вы меняете статус посылки на «Исключена». Эта посылка будет исключена из таможенного оформления, проверок, выгрузок и групповых операций.'
    )
    expect(buildCustomsExclusionWarning('Исключена', 12)).toBe(
      'Вы меняете статус посылок на «Исключена». Эти посылки будут исключены из таможенного оформления, проверок, выгрузок и групповых операций.'
    )
  })

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

  it('omits the finish warning when both counts are zero', () => {
    expect(buildFinishPassportCheckWarning(0, 0)).toBeNull()
  })

  it('uses the requested passport form', () => {
    expect(buildRestartPassportCheckWarning(1)).toBe(
      'Вы запрашиваете проверку паспорта, хотя для данного реестра уже выполнялась операция «Завершить проверку паспортов».'
    )
    expect(buildRestartPassportCheckWarning(2)).toBe(
      'Вы запрашиваете проверку паспортов, хотя для данного реестра уже выполнялась операция «Завершить проверку паспортов».'
    )
  })

  it('builds the clear passport status warning', () => {
    expect(buildClearPassportCheckWarning()).toBe(
      'Вы очищаете статус проверки паспорта, хотя для данного реестра уже выполнялась операция «Завершить проверку паспортов».'
    )
  })

  it('only confirms changed statuses excluded from customs processing', async () => {
    const confirm = vi.fn().mockResolvedValue(false)
    const statusStore = {
      parcelStatuses: [
        { id: 1, title: 'Разрешён', useAtCustomsProcessing: true },
        { id: 2, title: 'Исключён', useAtCustomsProcessing: false }
      ]
    }

    await expect(confirmCustomsExclusionStatusChange({
      values: { statusId: 1 }, currentParcel: { statusId: 1 }, statusStore, confirm
    })).resolves.toBe(true)
    await expect(confirmCustomsExclusionStatusChange({
      values: { statusId: 1 }, currentParcel: { statusId: 2 }, statusStore, confirm
    })).resolves.toBe(true)
    await expect(confirmCustomsExclusionStatusChange({
      values: { statusId: 2 }, currentParcel: { statusId: 1 }, statusStore, confirm
    })).resolves.toBe(false)

    expect(confirm).toHaveBeenCalledOnce()
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Подтверждение', confirmationText: 'Изменить', cancellationText: 'Не изменять'
    }))
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

  it('uses the clear-specific warning after refreshing a previously finished register', async () => {
    const confirm = vi.fn().mockResolvedValue(false)
    const registersStore = {
      item: { passportCheckWasFinished: false },
      getById: vi.fn(async () => {
        registersStore.item = { passportCheckWasFinished: true }
      })
    }

    await expect(confirmPassportCheckRestart({
      registerId: 8, registersStore, confirm, action: 'clear'
    })).resolves.toBe(false)
    expect(registersStore.getById).toHaveBeenCalledWith(8)
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      content: buildClearPassportCheckWarning()
    }))
  })
})
