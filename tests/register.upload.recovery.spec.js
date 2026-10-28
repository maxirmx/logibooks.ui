// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect, afterEach } from 'vitest'
import { rememberRegisterUploadDraft, getRegisterUploadDraft, clearRegisterUploadDraft } from '@/helpers/register.upload.recovery.js'

afterEach(() => clearRegisterUploadDraft(42))

describe('register upload recovery drafts', () => {
  it('keys drafts by register, keeps editable values and strips confirmation tokens', () => {
    const payload = { invoiceNumber: 'Invoice Latin', restrictionChangeConfirmationToken: 'expired' }
    rememberRegisterUploadDraft(42, payload)
    payload.invoiceNumber = 'modified'
    expect(getRegisterUploadDraft('42')).toEqual({ invoiceNumber: 'Invoice Latin' })
    expect(getRegisterUploadDraft(43)).toBeNull()
    const copy = getRegisterUploadDraft(42)
    copy.invoiceNumber = 'another modification'
    expect(getRegisterUploadDraft(42).invoiceNumber).toBe('Invoice Latin')
    clearRegisterUploadDraft('42')
    expect(getRegisterUploadDraft(42)).toBeNull()
  })
  it('keeps date-only fields as calendar dates without changing strings or nulls', () => {
    rememberRegisterUploadDraft(42, {
      invoiceDate: new Date(2026, 6, 21),
      warehouseArrivalDate: new Date(2026, 0, 5),
      decDate: '2026-07-20',
      releaseDate: null
    })
    expect(getRegisterUploadDraft(42)).toEqual({
      invoiceDate: '2026-07-21', warehouseArrivalDate: '2026-01-05',
      decDate: '2026-07-20', releaseDate: null
    })
  })

})
