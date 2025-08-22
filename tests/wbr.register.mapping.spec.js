import { describe, it, expect } from 'vitest'
import { HasIssues } from '@/helpers/parcels.check.helpers.js'

describe('parcels.check.helpers.js HasIssues', () => {

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
