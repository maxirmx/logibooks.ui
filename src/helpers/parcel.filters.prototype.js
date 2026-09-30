// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import {
  FCCheckStatus,
  FCCheckStatusNames,
  SWCheckStatus,
  SWCheckStatusNames,
  SwInheritanceFlag,
  WStatusValues
} from '@/helpers/check.status.code.js'

// Phase 1 fixtures use the same shape as the planned management API. Nothing is persisted.
const fixtureFilters = [
  {
    id: 1,
    name: 'Исключить проблемы',
    excludedParcelStatusIds: [],
    excludedCheckStatuses: {
      sw: [SWCheckStatus.IssueStopWord],
      fc: [FCCheckStatus.IssueFeacnCode],
      passport: [30],
      common: [WStatusValues.Defect]
    }
  },
  {
    id: 2,
    name: 'Пустой фильтр',
    excludedParcelStatusIds: [],
    excludedCheckStatuses: { sw: [], fc: [], passport: [], common: [] }
  }
]

function copyFilter(filter) {
  return {
    ...filter,
    excludedParcelStatusIds: [...filter.excludedParcelStatusIds],
    excludedCheckStatuses: Object.fromEntries(
      Object.entries(filter.excludedCheckStatuses).map(([category, values]) => [
        category,
        [...values]
      ])
    )
  }
}

export function createEmptyPrototypeParcelFilter() {
  return {
    id: null,
    name: '',
    excludedParcelStatusIds: [],
    excludedCheckStatuses: { sw: [], fc: [], passport: [], common: [] }
  }
}

export function listPrototypeParcelFilters() {
  return fixtureFilters.map(copyFilter)
}

export function getPrototypeParcelFilter(id) {
  const filter = fixtureFilters.find((item) => item.id === Number(id))
  return filter ? copyFilter(filter) : null
}

const statusOptions = (names) =>
  Object.entries(names).map(([value, title]) => ({ value: Number(value), title }))

const commonStatusValues = new Set([
  WStatusValues.EUR1000,
  WStatusValues.Defect,
  WStatusValues.MarkedByPartner,
  WStatusValues.ApprovedWithExcise,
  WStatusValues.ApprovedWithNotification,
  WStatusValues.Duplicate2
])

const categoryOptions = (names) =>
  statusOptions(Object.fromEntries(
    Object.entries(names).filter(([value]) => !commonStatusValues.has(Number(value)))
  ))

export const prototypeParcelFilterOptions = Object.freeze({
  common: [
    { value: WStatusValues.EUR1000, title: '>1000€' },
    { value: WStatusValues.Defect, title: 'Брак' },
    { value: WStatusValues.MarkedByPartner, title: 'Исключено партнёром', enforced: true },
    { value: WStatusValues.ApprovedWithExcise, title: 'Согл. с акцизом' },
    { value: WStatusValues.ApprovedWithNotification, title: 'Согл. с нотификацией' },
    { value: WStatusValues.Duplicate2, title: 'Дубликат' }
  ],
  sw: categoryOptions({
    ...SWCheckStatusNames,
    [SWCheckStatus.NoIssues | SwInheritanceFlag]: '🔖 Ок стоп слова'
  }),
  fc: categoryOptions(FCCheckStatusNames)
})

export function validatePrototypeParcelFilterName(name, currentId = null) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) return 'Укажите название фильтра'
  if (trimmedName.length > 100) return 'Название фильтра не должно превышать 100 символов'

  const duplicate = fixtureFilters.some(
    (filter) =>
      filter.id !== currentId &&
      filter.name.trim().toLocaleLowerCase('ru-RU') === trimmedName.toLocaleLowerCase('ru-RU')
  )
  return duplicate ? 'Фильтр с таким названием уже есть' : null
}
