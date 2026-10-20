// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it, vi } from 'vitest'
import { useScanjobFinishConfirmation } from '@/composables/useScanjobFinishConfirmation.js'

const available = { canMarkUnscannedAsNotFound: true, targetRegisterStatus: { id: 2, title: 'Готов' } }
const job = { id: 1, name: 'Приёмка', operation: 10 }

describe('scan-job finish confirmation', () => {
  it.each([[true, true], [true, false], [false, true], [false, false]])('returns independent choices %s / %s', async (mark, update) => {
    const getOptions = vi.fn().mockResolvedValue(available)
    const confirm = vi.fn(async ({ contentComponentProps: props }) => {
      expect(props.choices).toEqual({ markUnscannedAsNotFound: true, updateRegisterStatus: true })
      props.onChange('markUnscannedAsNotFound', mark)
      expect(props.choices.updateRegisterStatus).toBe(true)
      props.onChange('updateRegisterStatus', update)
      return true
    })
    const flow = useScanjobFinishConfirmation(getOptions, confirm)
    expect(await flow.request(job)).toEqual({ markUnscannedAsNotFound: mark, updateRegisterStatus: update })
    expect(getOptions).toHaveBeenCalledWith(1, { operation: 10 })
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Приёмка',
      size: 'medium',
      confirmationText: 'Завершить задание',
      cancellationText: 'Отмена'
    }))
    expect(confirm.mock.calls[0][0].contentComponentProps).not.toHaveProperty('jobName')
  })

  it.each([[true, true], [true, false], [false, true], [false, false]])('chooses the dialog for available actions %s / %s', async (mark, update) => {
    const options = { canMarkUnscannedAsNotFound: mark, targetRegisterStatus: update ? available.targetRegisterStatus : null }
    const confirm = vi.fn().mockResolvedValue(true)
    const flow = useScanjobFinishConfirmation(vi.fn().mockResolvedValue(options), confirm)
    expect(await flow.request(job)).toEqual({ markUnscannedAsNotFound: mark, updateRegisterStatus: update })
    const dialog = confirm.mock.calls[0][0]
    expect(dialog).toMatchObject({ title: job.name, confirmationText: 'Завершить задание', cancellationText: 'Отмена' })
    if (mark || update) {
      expect(dialog.size).toBe('medium')
      expect(dialog.contentComponent).toBeDefined()
      expect(dialog.contentComponentProps.options).toBe(options)
      expect(dialog).not.toHaveProperty('content')
    } else {
      expect(dialog.size).toBe('small')
      expect(dialog.content).toBe('Завершить задание?')
      expect(dialog).not.toHaveProperty('contentComponent')
      expect(dialog).not.toHaveProperty('contentComponentProps')
    }
  })

  it('cancels simple confirmation and resets choices before another attempt', async () => {
    const getOptions = vi.fn().mockResolvedValueOnce({ canMarkUnscannedAsNotFound: false, targetRegisterStatus: null }).mockResolvedValue(available)
    const confirm = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true)
    const flow = useScanjobFinishConfirmation(getOptions, confirm)
    expect(await flow.request(job)).toBeNull()
    expect(await flow.request(job)).toEqual({ markUnscannedAsNotFound: true, updateRegisterStatus: true })
  })

  it('retains choices for retry, fetches fresh options, and resets after cancellation or success', async () => {
    const getOptions = vi.fn().mockResolvedValue(available)
    const confirm = vi.fn().mockImplementationOnce(async ({ contentComponentProps: props }) => {
      props.onChange('markUnscannedAsNotFound', false)
      props.onChange('updateRegisterStatus', false)
      return true
    }).mockResolvedValue(true)
    const flow = useScanjobFinishConfirmation(getOptions, confirm)
    expect(await flow.request(job)).toEqual({ markUnscannedAsNotFound: false, updateRegisterStatus: false })
    expect(await flow.request(job)).toEqual({ markUnscannedAsNotFound: false, updateRegisterStatus: false })
    confirm.mockResolvedValueOnce(false)
    expect(await flow.request(job)).toBeNull()
    expect(await flow.request(job)).toEqual({ markUnscannedAsNotFound: true, updateRegisterStatus: true })
    flow.reset()
    expect(await flow.request(job)).toEqual({ markUnscannedAsNotFound: true, updateRegisterStatus: true })
    expect(getOptions).toHaveBeenCalledTimes(5)
  })

  it('does not leak choices between jobs or operations and clamps newly unavailable actions', async () => {
    const getOptions = vi.fn().mockResolvedValue(available)
    const confirm = vi.fn(async ({ contentComponentProps: props }) => {
      props.onChange('markUnscannedAsNotFound', false)
      return true
    })
    const flow = useScanjobFinishConfirmation(getOptions, confirm)
    await flow.request(job)
    confirm.mockResolvedValue(true)
    expect((await flow.request({ ...job, id: 2 })).markUnscannedAsNotFound).toBe(true)
    await flow.request(job)
    expect((await flow.request({ ...job, operation: 15 })).markUnscannedAsNotFound).toBe(true)
    getOptions.mockResolvedValue({ canMarkUnscannedAsNotFound: false, targetRegisterStatus: null })
    expect(await flow.request({ ...job, operation: 15 })).toEqual({ markUnscannedAsNotFound: false, updateRegisterStatus: false })
  })

  it.each([available, { canMarkUnscannedAsNotFound: false, targetRegisterStatus: null }])('propagates preview and dialog failures without accepting a completion (%j)', async (options) => {
    const error = new Error('Unavailable')
    const getOptions = vi.fn().mockRejectedValue(error)
    const confirm = vi.fn().mockRejectedValue(error)
    const flow = useScanjobFinishConfirmation(getOptions, confirm)
    await expect(flow.request(job)).rejects.toBe(error)
    expect(confirm).not.toHaveBeenCalled()
    getOptions.mockResolvedValue(options)
    await expect(flow.request(job)).rejects.toBe(error)
  })
})
