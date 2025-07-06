import { describe, it, expect } from 'vitest'
import { getStatusColor } from '@/helpers/register.mapping.js'

describe('register.mapping.js', () => {
  describe('getStatusColor', () => {
    it('should return "default" for null/undefined statusId', () => {
      expect(getStatusColor(null)).toBe('default')
      expect(getStatusColor(undefined)).toBe('default')
      expect(getStatusColor(0)).toBe('default')
    })

    it('should return "blue" for statusId <= 100', () => {
      expect(getStatusColor(1)).toBe('blue')
      expect(getStatusColor(50)).toBe('blue')
      expect(getStatusColor(100)).toBe('blue')
    })

    it('should return "red" for statusId > 100 and <= 200', () => {
      expect(getStatusColor(101)).toBe('red')
      expect(getStatusColor(150)).toBe('red')
      expect(getStatusColor(200)).toBe('red')
    })

    it('should return "green" for statusId > 200', () => {
      expect(getStatusColor(201)).toBe('green')
      expect(getStatusColor(300)).toBe('green')
      expect(getStatusColor(999)).toBe('green')
    })
  })
})
