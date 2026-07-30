// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'

import {
  REGISTER_STATUS_FILTER_ALL,
  REGISTER_STATUS_FILTER_ALL_ICON,
  REGISTER_STATUS_FILTER_IN_PROGRESS,
  REGISTER_STATUS_FILTER_IN_PROGRESS_ICON,
  buildRegisterStatusFilterOptions,
  normalizeRegisterStatusFilterValue
} from '@/helpers/register.status.filter.helpers.js'

describe('register status filter helpers', () => {
  it.each([
    ['', REGISTER_STATUS_FILTER_ALL],
    [null, REGISTER_STATUS_FILTER_IN_PROGRESS],
    [undefined, REGISTER_STATUS_FILTER_IN_PROGRESS],
    [REGISTER_STATUS_FILTER_ALL, REGISTER_STATUS_FILTER_ALL],
    [REGISTER_STATUS_FILTER_IN_PROGRESS, REGISTER_STATUS_FILTER_IN_PROGRESS],
    [5, 5]
  ])('normalizes persisted filter value %j to %j', (filterValue, expected) => {
    expect(normalizeRegisterStatusFilterValue(filterValue)).toBe(expected)
  })

  it('prepends all and in-progress choices to concrete register statuses', () => {
    expect(buildRegisterStatusFilterOptions([
      { id: 2, title: 'На проверке', readOnly: false },
      { id: 5, title: 'Завершён', readOnly: true }
    ])).toEqual([
      {
        id: REGISTER_STATUS_FILTER_ALL,
        title: 'Все',
        icon: REGISTER_STATUS_FILTER_ALL_ICON,
        bkColor: '#EEF2F6',
        fgColor: '#495057'
      },
      {
        id: REGISTER_STATUS_FILTER_IN_PROGRESS,
        title: 'В работе',
        icon: REGISTER_STATUS_FILTER_IN_PROGRESS_ICON,
        bkColor: '#E7F1FF',
        fgColor: '#0D6EFD'
      },
      {
        id: 2,
        title: 'На проверке',
        icon: null,
        bkColor: null,
        fgColor: null
      },
      {
        id: 5,
        title: 'Завершён',
        icon: null,
        bkColor: null,
        fgColor: null
      }
    ])
  })

  it('returns the synthetic choices when statuses are unavailable', () => {
    expect(buildRegisterStatusFilterOptions(null)).toEqual([
      {
        id: REGISTER_STATUS_FILTER_ALL,
        title: 'Все',
        icon: REGISTER_STATUS_FILTER_ALL_ICON,
        bkColor: '#EEF2F6',
        fgColor: '#495057'
      },
      {
        id: REGISTER_STATUS_FILTER_IN_PROGRESS,
        title: 'В работе',
        icon: REGISTER_STATUS_FILTER_IN_PROGRESS_ICON,
        bkColor: '#E7F1FF',
        fgColor: '#0D6EFD'
      }
    ])
  })
})
