// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect } from 'vitest'
import {
  canClearParcelExtId,
  getClearParcelExtIdErrorMessage
} from '@/helpers/parcel.ext-id.helpers.js'

describe('parcel ext-id helpers', () => {
  describe('canClearParcelExtId', () => {
    it('returns false when authStore is undefined', () => {
      expect(canClearParcelExtId({ id: 1, extId: 'KGT-001' }, undefined)).toBe(false)
    })

  })

  describe('getClearParcelExtIdErrorMessage', () => {
    it('returns default message when error is undefined', () => {
      expect(getClearParcelExtIdErrorMessage(undefined)).toBe('Ошибка при очистке номера КГТ')
    })

  })
})
