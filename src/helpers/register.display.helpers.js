// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export function getCompanyDisplayName(companies, companyId) {
  if (companyId === null || companyId === undefined || companyId === '') {
    return 'Неизвестно'
  }

  const id = Number(companyId)
  if (Number.isNaN(id)) {
    return 'Неизвестно'
  }

  const company = Array.isArray(companies)
    ? companies.find((item) => Number(item.id) === id)
    : null

  return company?.shortName || company?.name || 'Неизвестно'
}
