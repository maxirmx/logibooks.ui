// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { describe, it, expect } from 'vitest'
import { config } from '@/helpers/config.js'

describe('config helpers', () => {
  it('exports a config object with all configuration values', () => {
    expect(config).toHaveProperty('apiUrl')
    expect(config).toHaveProperty('enableLog')
  })
})
