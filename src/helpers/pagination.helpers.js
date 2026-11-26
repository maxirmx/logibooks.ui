// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

export function buildPageOptions(maxPage, page) {
  const option = value => ({ value, title: String(value) })
  if (maxPage <= 200) {
    return Array.from({ length: maxPage }, (_, index) => option(index + 1))
  }

  const current = page || 1
  const pages = new Set()
  for (let i = 1; i <= 10; i++) pages.add(i)
  for (let i = maxPage - 9; i <= maxPage; i++) pages.add(i)
  for (let i = Math.max(1, current - 10); i <= Math.min(maxPage, current + 10); i++) pages.add(i)

  return [...pages].sort((a, b) => a - b).map(option)
}
