import { describe, it, expect } from 'vitest'
import { apiUrl, enableLog } from '@/helpers/config.js'

describe('config helpers', () => {
  it('exports apiUrl and enableLog', () => {
    expect(apiUrl).toBe('http://localhost:8080/api')
    expect(enableLog).toBe(true)
  })
})
