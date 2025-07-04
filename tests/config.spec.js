import { describe, it, expect } from 'vitest'
import { config } from '@/helpers/config.js'

describe('config helpers', () => {
  it('exports a config object with all configuration values', () => {
    expect(config).toHaveProperty('apiUrl')
    expect(config).toHaveProperty('enableLog')
  })
})
