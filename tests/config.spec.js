import { describe, it, expect } from 'vitest'
import { apiUrl, enableLog, config } from '@/helpers/config.js'

describe('config helpers', () => {
  it('exports apiUrl and enableLog', () => {
    expect(apiUrl).toBe('https://logibooks.sw.consulting:8085/api')
    expect(enableLog).toBe(true)
  })

  it('exports a config object with all configuration values', () => {
    expect(config).toHaveProperty('apiUrl')
    expect(config).toHaveProperty('enableLog')
    expect(config.apiUrl).toBe('https://logibooks.sw.consulting:8085/api')
    expect(config.enableLog).toBe(true)
  })
})
