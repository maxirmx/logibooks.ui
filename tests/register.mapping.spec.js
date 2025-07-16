import { describe, it, expect } from 'vitest'
import { getStatusColor, HasIssues } from '@/helpers/register.mapping.js'

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

  describe('HasIssues', () => {
    it('returns true when checkStatusId is between 101 and 200', () => {
      expect(HasIssues(101)).toBe(true)
      expect(HasIssues(150)).toBe(true)
      expect(HasIssues(200)).toBe(true)
    })

    it('returns false when checkStatusId is outside the range', () => {
      expect(HasIssues(100)).toBe(false)
      expect(HasIssues(201)).toBe(false)
      expect(HasIssues(undefined)).toBe(false)
    })
  })
})
