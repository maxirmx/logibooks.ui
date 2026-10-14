// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { useRegisterRestrictionChangeConfirmation } from '@/composables/useRegisterRestrictionChangeConfirmation.js'

vi.mock('@/helpers/error.helpers.js', () => ({ reportError: vi.fn() }))
import { reportError } from '@/helpers/error.helpers.js'

function challenge(token = 'first', msg = 'При изменении таможенной процедуры будут очищены все результаты проверок по стоп-словам и кодам ТН ВЭД.') {
  return Object.assign(new Error(msg), { status: 409, data: {
    msg, code: 'RegisterRestrictionChangeConfirmationRequired', errors: {},
    details: { confirmationToken: token, changeKind: 'customsProcedure' }
  } })
}

function setup() {
  const update = vi.fn().mockResolvedValue(undefined)
  const confirm = vi.fn().mockResolvedValue(true)
  let active = true
  const save = useRegisterRestrictionChangeConfirmation({ update, confirm, isActive: () => active })
  return { update, confirm, save, dispose: () => { active = false } }
}

describe('register restriction confirmation', () => {
  it('saves without confirmation and strips any token from a previous submission', async () => {
    const env = setup()
    const payload = { customsProcedureCode: 40, restrictionChangeConfirmationToken: 'old' }
    expect(await env.save(5, payload)).toBe(true)
    expect(env.update).toHaveBeenCalledExactlyOnceWith(5, { customsProcedureCode: 40 })
    expect(env.confirm).not.toHaveBeenCalled()
    expect(payload.restrictionChangeConfirmationToken).toBe('old')
  })

  it('uses server copy, retries the same values and asks again for stale impact', async () => {
    const env = setup()
    env.update.mockRejectedValueOnce(challenge()).mockRejectedValueOnce(challenge('second', 'Страна отправления: Узбекистан'))
    const payload = { customsProcedureCode: 40, invoiceNumber: 'entered' }
    expect(await env.save(5, payload)).toBe(true)
    expect(env.confirm.mock.calls).toEqual([
      [{ title: 'Подтверждение', content: challenge().data.msg, confirmationText: 'Изменить', cancellationText: 'Не изменять' }],
      [{ title: 'Подтверждение', content: 'Страна отправления: Узбекистан', confirmationText: 'Изменить', cancellationText: 'Не изменять' }]
    ])
    expect(env.update.mock.calls).toEqual([
      [5, payload], [5, { ...payload, restrictionChangeConfirmationToken: 'first' }],
      [5, { ...payload, restrictionChangeConfirmationToken: 'second' }]
    ])
    expect(payload).not.toHaveProperty('restrictionChangeConfirmationToken')
  })

  it('shows country-scope confirmation even when the shared rule and other restrictions remain', async () => {
    const env = setup()
    const msg = 'При изменении страны назначения будут очищены все результаты проверок по стоп-словам и кодам ТН ВЭД для таможенной процедуры Импорт, Узбекистан.'
    const error = challenge('v2:lost-Uzbekistan-scope', msg)
    error.data.details.changeKind = 'counterpartCountry'
    env.update.mockRejectedValueOnce(error)
    const payload = { customsProcedureCode: 10, theOtherCountryCode: 762 }
    expect(await env.save(1847, payload)).toBe(true)
    expect(env.confirm).toHaveBeenCalledExactlyOnceWith({
      title: 'Подтверждение', content: msg, confirmationText: 'Изменить', cancellationText: 'Не изменять'
    })
    expect(env.update.mock.calls).toEqual([
      [1847, payload],
      [1847, { ...payload, restrictionChangeConfirmationToken: 'v2:lost-Uzbekistan-scope' }]
    ])
  })
  it('cancels without a second update', async () => {
    const env = setup()
    env.update.mockRejectedValueOnce(challenge())
    env.confirm.mockResolvedValue(false)
    expect(await env.save(5, {})).toBe(false)
    expect(env.update).toHaveBeenCalledTimes(1)
  })

  it.each(['status', 'code', 'details', 'token', 'emptyToken', 'msg', 'emptyMsg'])('propagates unrelated or malformed %s responses', async field => {
    const env = setup()
    const error = challenge()
    if (field === 'status') error.status = 400
    if (field === 'code') error.data.code = 'RegisterRestrictionChangeConflict'
    if (field === 'details') delete error.data.details
    if (field === 'token') error.data.details.confirmationToken = 42
    if (field === 'emptyToken') error.data.details.confirmationToken = ''
    if (field === 'msg') error.data.msg = null
    if (field === 'emptyMsg') error.data.msg = ' '
    env.update.mockRejectedValueOnce(error)
    await expect(env.save(5, {})).rejects.toBe(error)
    expect(env.confirm).not.toHaveBeenCalled()
  })

  it('propagates transport and dialog failures', async () => {
    const env = setup()
    const transport = new Error('network')
    env.update.mockRejectedValueOnce(transport)
    await expect(env.save(5, {})).rejects.toBe(transport)
    env.update.mockRejectedValueOnce(challenge())
    const dialog = new Error('dialog failed')
    env.confirm.mockRejectedValueOnce(dialog)
    await expect(env.save(5, {})).rejects.toBe(dialog)
  })

  it('does not start a submission after disposal', async () => {
    const env = setup()
    env.dispose()
    expect(await env.save(5, {})).toBe(false)
    expect(env.update).not.toHaveBeenCalled()
  })

  it.each(['success', 'failure'])('ignores late update %s after disposal', async outcome => {
    const env = setup()
    const error = new Error('late network')
    env.update.mockImplementationOnce(async () => {
      env.dispose()
      if (outcome === 'failure') throw error
    })
    expect(await env.save(5, {})).toBe(false)
    expect(env.confirm).not.toHaveBeenCalled()
    if (outcome === 'failure') expect(reportError).toHaveBeenCalledWith(error, expect.any(Object))
  })

  it.each(['accept', 'reject'])('does not retry after a late confirmation %s', async outcome => {
    const env = setup()
    env.update.mockRejectedValueOnce(challenge())
    const error = new Error('late dialog')
    env.confirm.mockImplementationOnce(async () => {
      env.dispose()
      if (outcome === 'reject') throw error
      return true
    })
    expect(await env.save(5, {})).toBe(false)
    expect(env.update).toHaveBeenCalledTimes(1)
    if (outcome === 'reject') expect(reportError).toHaveBeenCalledWith(error, expect.any(Object))
  })
})
