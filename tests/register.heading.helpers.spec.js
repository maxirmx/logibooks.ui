// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { describe, it, expect } from 'vitest'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'

function mockGetTransportationDocument() {
  return `Документ`
}

describe('register.heading.helpers', () => {
  it('returns loading message for null register', () => {
    const heading = buildParcelListHeading(null, mockGetTransportationDocument)
    expect(heading).toBe('Загрузка...')
  })
})
