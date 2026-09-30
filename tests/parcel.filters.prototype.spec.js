// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, expect, it } from 'vitest'
import { FCCheckStatus, SWCheckStatus, WStatusValues } from '@/helpers/check.status.code.js'
import {
  createEmptyPrototypeParcelFilter,
  getPrototypeParcelFilter,
  listPrototypeParcelFilters,
  prototypeParcelFilterOptions,
  validatePrototypeParcelFilterName
} from '@/helpers/parcel.filters.prototype.js'

describe('parcel filter prototype fixtures', () => {
  it('provides the planned API shape, including an empty filter', () => {
    expect(createEmptyPrototypeParcelFilter()).toEqual({
      id: null,
      name: '',
      excludedParcelStatusIds: [],
      excludedCheckStatuses: { sw: [], fc: [], passport: [], common: [] }
    })
    expect(listPrototypeParcelFilters()).toHaveLength(2)
    expect(listPrototypeParcelFilters()[1].excludedCheckStatuses).toEqual({
      sw: [], fc: [], passport: [], common: []
    })
    expect(Object.keys(prototypeParcelFilterOptions)).toEqual([
      'common', 'sw', 'fc'
    ])
    expect(Object.values(prototypeParcelFilterOptions).every((options) => options.length > 0)).toBe(true)
    expect(prototypeParcelFilterOptions.common.map((option) => option.value)).toEqual([
      WStatusValues.EUR1000, WStatusValues.Defect, WStatusValues.MarkedByPartner,
      WStatusValues.ApprovedWithExcise, WStatusValues.ApprovedWithNotification, WStatusValues.Duplicate2
    ])
    expect(prototypeParcelFilterOptions.common.find((option) => option.enforced)?.value).toBe(WStatusValues.MarkedByPartner)
    const categoryValues = [prototypeParcelFilterOptions.sw, prototypeParcelFilterOptions.fc]
      .flat().map((option) => option.value)
    expect(categoryValues).not.toContain(WStatusValues.Duplicate)
    expect(categoryValues).not.toContain(WStatusValues.MarkedByPartner)
    expect(categoryValues).not.toContain(WStatusValues.EUR1000)
    expect(prototypeParcelFilterOptions.sw.map((option) => option.value)).toContain(SWCheckStatus.IssueStopWord)
    expect(prototypeParcelFilterOptions.fc.map((option) => option.value)).toContain(FCCheckStatus.IssueFeacnCode)
  })

  it('returns isolated copies and no item for an unknown id', () => {
    const list = listPrototypeParcelFilters()
    list[0].excludedParcelStatusIds.push(99)
    list[0].excludedCheckStatuses.sw.push(99)
    const item = getPrototypeParcelFilter(1)
    item.excludedCheckStatuses.passport.push(99)

    expect(getPrototypeParcelFilter(1).excludedParcelStatusIds).not.toContain(99)
    expect(getPrototypeParcelFilter(1).excludedCheckStatuses.sw).not.toContain(99)
    expect(getPrototypeParcelFilter(1).excludedCheckStatuses.passport).not.toContain(99)
    expect(getPrototypeParcelFilter(999)).toBeNull()
  })

  it('validates required, maximum length, and per-user fixture name uniqueness', () => {
    expect(validatePrototypeParcelFilterName('  ')).toBe('Укажите название фильтра')
    expect(validatePrototypeParcelFilterName(null)).toBe('Укажите название фильтра')
    expect(validatePrototypeParcelFilterName('x'.repeat(101))).toContain('100 символов')
    expect(validatePrototypeParcelFilterName('  ИСКЛЮЧИТЬ ПРОБЛЕМЫ  ')).toContain('уже есть')
    expect(validatePrototypeParcelFilterName('Исключить проблемы', 1)).toBeNull()
    expect(validatePrototypeParcelFilterName('Новый фильтр')).toBeNull()
  })
})
