// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import {
  canClearParcelExtId,
  getClearParcelExtIdErrorMessage
} from '@/helpers/parcel.ext-id.helpers.js'

describe('parcel ext-id helpers', () => {
  describe('canClearParcelExtId', () => {
    it('returns true when item has id and extId and user is admin', () => {
      expect(canClearParcelExtId({ id: 1, extId: 'KGT-001' }, { isAdmin: true })).toBe(true)
    })

    it('returns false when item has no id', () => {
      expect(canClearParcelExtId({ extId: 'KGT-001' }, { isAdmin: true })).toBe(false)
    })

    it('returns false when item id is 0', () => {
      expect(canClearParcelExtId({ id: 0, extId: 'KGT-001' }, { isAdmin: true })).toBe(false)
    })

    it('returns false when item extId is null', () => {
      expect(canClearParcelExtId({ id: 1, extId: null }, { isAdmin: true })).toBe(false)
    })

    it('returns false when item extId is empty string', () => {
      expect(canClearParcelExtId({ id: 1, extId: '' }, { isAdmin: true })).toBe(false)
    })

    it('returns false when user is not admin', () => {
      expect(canClearParcelExtId({ id: 1, extId: 'KGT-001' }, { isAdmin: false })).toBe(false)
    })

    it('returns false when item is null', () => {
      expect(canClearParcelExtId(null, { isAdmin: true })).toBe(false)
    })

    it('returns false when item is undefined', () => {
      expect(canClearParcelExtId(undefined, { isAdmin: true })).toBe(false)
    })

    it('returns false when authStore is null', () => {
      expect(canClearParcelExtId({ id: 1, extId: 'KGT-001' }, null)).toBe(false)
    })

    it('returns false when authStore is undefined', () => {
      expect(canClearParcelExtId({ id: 1, extId: 'KGT-001' }, undefined)).toBe(false)
    })

    it('handles Vue ref isAdmin with true value', () => {
      expect(canClearParcelExtId({ id: 1, extId: 'KGT-001' }, { isAdmin: ref(true) })).toBe(true)
    })

    it('returns false when Vue ref isAdmin has false value', () => {
      expect(canClearParcelExtId({ id: 1, extId: 'KGT-001' }, { isAdmin: ref(false) })).toBe(false)
    })

    it('returns false when both id and extId are missing', () => {
      expect(canClearParcelExtId({}, { isAdmin: true })).toBe(false)
    })
  })

  describe('getClearParcelExtIdErrorMessage', () => {
    it('returns error.message when error has a message property', () => {
      expect(getClearParcelExtIdErrorMessage(new Error('Network error'))).toBe('Network error')
    })

    it('returns error.message from plain object', () => {
      expect(getClearParcelExtIdErrorMessage({ message: 'Server error' })).toBe('Server error')
    })

    it('returns default message when error has no message', () => {
      expect(getClearParcelExtIdErrorMessage({})).toBe('Ошибка при очистке номера КГТ')
    })

    it('returns default message when error is null', () => {
      expect(getClearParcelExtIdErrorMessage(null)).toBe('Ошибка при очистке номера КГТ')
    })

    it('returns default message when error is undefined', () => {
      expect(getClearParcelExtIdErrorMessage(undefined)).toBe('Ошибка при очистке номера КГТ')
    })

    it('returns default message when error.message is empty string', () => {
      expect(getClearParcelExtIdErrorMessage({ message: '' })).toBe('Ошибка при очистке номера КГТ')
    })
  })
})
