// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { beforeEach, describe, expect, it, vi } from 'vitest'

const confirmMock = vi.hoisted(() => vi.fn())

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

import { useAppConfirm } from '@/composables/useAppConfirm.js'

describe('useAppConfirm', () => {
  beforeEach(() => {
    confirmMock.mockReset()
    confirmMock.mockResolvedValue(true)
  })

  it('applies the shared size, shell classes, and button styles', async () => {
    const confirm = useAppConfirm()

    await confirm({
      title: 'Подтверждение',
      content: 'Продолжить?',
      dialogProps: { persistent: true, width: '30%', minWidth: '250px' }
    })

    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Подтверждение',
        content: 'Продолжить?',
        dialogProps: {
          persistent: true,
          width: 440,
          maxWidth: 'calc(100vw - 32px)'
        },
        confirmationButtonProps: {
          color: 'orange-darken-3',
          variant: 'flat'
        },
        cancellationButtonProps: { variant: 'text' }
      })
    )
  })

  it('uses the medium shared size when requested', async () => {
    const confirm = useAppConfirm()

    await confirm({ title: 'Длинное подтверждение', size: 'medium' })

    expect(confirmMock.mock.calls[0][0].dialogProps.width).toBe(560)
    expect(confirmMock.mock.calls[0][0]).not.toHaveProperty('size')
  })
})
