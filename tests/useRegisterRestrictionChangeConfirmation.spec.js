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
