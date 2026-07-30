// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import {
  formatAirportDisplayName,
  getAirportDisplayName,
  getCompanyDisplayName,
  getRegisterTypeDisplayName
} from '@/helpers/register.display.helpers.js'
import { WBRN_REGISTER_ID } from '@/helpers/company.constants.js'

describe('register display helpers', () => {
  describe('getCompanyDisplayName', () => {
    const companies = [
      { id: 1, shortName: 'Short Name', name: 'Full Name' },
      { id: 2, shortName: '', name: 'Full Only' },
      { id: 3, shortName: '', name: '' }
    ]

    it('uses short name before full name', () => {
      expect(getCompanyDisplayName(companies, 1)).toBe('Short Name')
    })

    it('falls back to full name and unknown label', () => {
      expect(getCompanyDisplayName(companies, '2')).toBe('Full Only')
      expect(getCompanyDisplayName(companies, 3)).toBe('Неизвестно')
      expect(getCompanyDisplayName(companies, 999)).toBe('Неизвестно')
      expect(getCompanyDisplayName(null, 1)).toBe('Неизвестно')
      expect(getCompanyDisplayName(companies, 999, 'Нет компании')).toBe('Нет компании')
    })
  })

  it('formats synthetic register types from the company name', () => {
    const companies = [{ id: 2, shortName: 'РВБ' }]

    expect(getRegisterTypeDisplayName(companies, WBRN_REGISTER_ID)).toBe('РВБ новый формат')
    expect(getRegisterTypeDisplayName(companies, 999)).toBe('Неизвестно')
  })

  it('formats airports consistently for selects and resolved references', () => {
    const airports = [{ id: 1, name: 'Шереметьево', codeIata: 'SVO' }]

    expect(formatAirportDisplayName(airports[0])).toBe('Шереметьево (SVO)')
    expect(getAirportDisplayName(airports, '1')).toBe('Шереметьево (SVO)')
    expect(getAirportDisplayName(airports, 999, 'Нет аэропорта')).toBe('Нет аэропорта')
  })
})
