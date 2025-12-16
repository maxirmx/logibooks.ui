// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

export const SwInheritanceFlag = 0x0080

/**
 * Common status values used across enums
 */
export const WStatusValues = Object.freeze({
  ApprovedWithExcise: 0x0230,
  ApprovedWithNotification: 0x0231,
  MarkedByPartner: 0x01FF
})

/**
 * Enumeration for SW (Stop Word) check statuses
 * Lower word: stop word check status (0..65535)
 */
export const SWCheckStatus = Object.freeze({
  NotChecked: 0x0000,
  
  NoIssues: 0x0010,
  Approved: 0x0020,
  ApprovedInherited: 0x0020 | SwInheritanceFlag,
  ApprovedWithExcise: WStatusValues.ApprovedWithExcise,
  ApprovedWithNotification: WStatusValues.ApprovedWithNotification,
  
  IssueStopWord: 0x0100,
  IssueStopWordInherited: 0x0100 | SwInheritanceFlag,
  MarkedByPartner: WStatusValues.MarkedByPartner
})

/**
 * Enumeration for FC (FEACN Code) check statuses
 * Upper word: FEACN code check status (0..65535)
 */
export const FCCheckStatus = Object.freeze({
  NotChecked: 0,
  
  NoIssues: 0x0010,
  ApprovedWithExcise: WStatusValues.ApprovedWithExcise,
  ApprovedWithNotification: WStatusValues.ApprovedWithNotification,
  
  IssueFeacnCode: 0x0100,
  IssueNonexistingFeacn: 0x0101,
  IssueInvalidFeacnFormat: 0x0102,  
  MarkedByPartner: WStatusValues.MarkedByPartner
})

/**
 * Russian names map for SWCheckStatus (excluding MarkedByPartner)
 */
const NotCheckedString = 'Не проверено'
const ApprovedString = 'Согласовано'
const ApprovedWithExciseString = 'Согл. с акцизом'
const ApprovedWithNotificationString = 'Согл. с нотификацией'
const IssueStopWordString = 'Стоп слово'
const FlagString = '🔖 '


export const SWCheckStatusNames = Object.freeze({
  [SWCheckStatus.NotChecked]: NotCheckedString,
  [SWCheckStatus.NoIssues]: 'Ок стоп слова',
  [SWCheckStatus.Approved]: ApprovedString,
  [SWCheckStatus.ApprovedInherited]: FlagString + ApprovedString,
  [SWCheckStatus.ApprovedWithExcise]: ApprovedWithExciseString,
  [SWCheckStatus.ApprovedWithNotification]: ApprovedWithNotificationString,
  [SWCheckStatus.IssueStopWord]: IssueStopWordString,
  [SWCheckStatus.IssueStopWordInherited]: FlagString + IssueStopWordString
})

/**
 * Russian names map for FCCheckStatus (excluding MarkedByPartner)
 */
export const FCCheckStatusNames = Object.freeze({
  [FCCheckStatus.NotChecked]: NotCheckedString,
  [FCCheckStatus.NoIssues]: 'Ок ТН ВЭД',
  [FCCheckStatus.ApprovedWithExcise]: ApprovedWithExciseString,
  [FCCheckStatus.ApprovedWithNotification]: ApprovedWithNotificationString,
  [FCCheckStatus.IssueFeacnCode]: 'Стоп ТН ВЭД',
  [FCCheckStatus.IssueNonexistingFeacn]: 'Нет ТН ВЭД',
  [FCCheckStatus.IssueInvalidFeacnFormat]: 'Формат ТН ВЭД'
})

/**
 * Class representing a combined check status code,
 * assembled from FCCheckStatus (upper word) and SWCheckStatus (lower word).
 * This type provides helper methods for composing and parsing the code.
 */
export class CheckStatusCode {
  constructor(value) {
    if (typeof value === 'object' && value !== null) {
      // Constructor with FC and SW components
      this._value = CheckStatusCode.compose(value.fc, value.sw)
    } else {
      // Constructor with integer value
      this._value = Number(value) || 0
    }
  }

  /**
   * Gets the integer value of the combined status code
   */
  get value() {
    return this._value
  }

  /**
   * Extract FC component from a combined value
   */
  static getFC(value) {
    return ((value >> 16) & 0xFFFF)
  }

  /**
   * Extract FC component as enum value from a combined value
   */
  static getFCe(value) {
    return CheckStatusCode.getFC(value)
  }

  /**
   * Gets the FC component of this status code
   */
  get fc() {
    return CheckStatusCode.getFCe(this._value)
  }

  /**
   * Extract SW component from a combined value
   */
  static getSW(value) {
    return value & 0xFFFF
  }

  /**
   * Extract SW component as enum value from a combined value
   */
  static getSWe(value) {
    return CheckStatusCode.getSW(value)
  }

  /**
   * Gets the SW component of this status code
   */
  get sw() {
    return CheckStatusCode.getSWe(this._value)
  }

  /**
   * Check if the combined status has issues
   */
  static hasIssues(value) {
    return (CheckStatusCode.getFC(value) & 0x0100) !== 0 || 
           (CheckStatusCode.getSW(value) & 0x0100) !== 0
  }

  static isInheritedSw(value) {
    return (CheckStatusCode.getSW(value) & SwInheritanceFlag) !== 0
  }
  
  /**
   * Compose FC and SW components into a single integer
   */
  static compose(fc, sw) {
    return ((fc << 16) | sw) >>> 0 // Use unsigned right shift to ensure positive result
  }

  /**
   * Create CheckStatusCode from FC and SW parts
   */
  static fromParts(fc, sw) {
    return new CheckStatusCode({ fc, sw })
  }

  /**
   * Create CheckStatusCode from integer value
   */
  static fromInt(value) {
    return new CheckStatusCode(value)
  }

  /**
   * Convert to integer value
   */
  toInt() {
    return this._value
  }

  /**
   * String representation
   */
  toString(wFlag = false) {
    // Special cases for combined statuses
    if (this.fc === FCCheckStatus.NotChecked && this.sw === SWCheckStatus.NotChecked) {
      return "Не проверено"
    }
    if (this.fc === FCCheckStatus.ApprovedWithExcise && this.sw === SWCheckStatus.ApprovedWithExcise) {
      return "Согл. с акцизом"
    }

    if (this.fc === FCCheckStatus.ApprovedWithNotification && this.sw === SWCheckStatus.ApprovedWithNotification) {
      return "Согл. с нотификацией"
    }

    if (this.fc === FCCheckStatus.MarkedByPartner && this.sw === SWCheckStatus.MarkedByPartner) {
      return "Исключено партнёром"
    }

    // SW status strings
    const swStrings1 = Object.assign(
      {}, 
      SWCheckStatusNames, 
      {        
        [SWCheckStatus.NotChecked]: '',
      })

    const swStrings2 = Object.assign(
      {}, 
      SWCheckStatusNames, 
      {        
        [SWCheckStatus.NotChecked]: '',
        [SWCheckStatus.ApprovedInherited]: ApprovedString,
        [SWCheckStatus.IssueStopWordInherited]: IssueStopWordString
      })

      const fcStrings = Object.assign(
      {}, 
      FCCheckStatusNames, 
      { 
        [FCCheckStatus.NotChecked]: ''
      }
    )

    const swString = (wFlag ? swStrings1[this.sw] : swStrings2[this.sw]) || ''
    const fcString = fcStrings[this.fc] || ''

    // Combine non-empty strings with comma
    const parts = [swString, fcString].filter(str => str !== '')
    return parts.length > 0 ? parts.join(', ') : ''
  }

  /**
   * Check equality with another CheckStatusCode
   */
  equals(other) {
    if (!(other instanceof CheckStatusCode)) {
      return false
    }
    return this._value === other._value
  }

  /**
   * Return new combined status with replaced FC component,
   * SW component is preserved
   */
  static withFC(old, newFc) {
    const oldCode = old instanceof CheckStatusCode ? old : new CheckStatusCode(old)
    return CheckStatusCode.fromParts(newFc, oldCode.sw)
  }

  /**
   * Return new combined status with replaced SW component,
   * FC component is preserved
   */
  static withSW(old, newSw) {
    const oldCode = old instanceof CheckStatusCode ? old : new CheckStatusCode(old)
    return CheckStatusCode.fromParts(oldCode.fc, newSw)
  }

  // Predefined constants
  static get NotChecked() {
    return CheckStatusCode.fromParts(FCCheckStatus.NotChecked, SWCheckStatus.NotChecked)
  }

  static get NoIssues() {
    return CheckStatusCode.fromParts(FCCheckStatus.NoIssues, SWCheckStatus.NoIssues)
  }

  static get ApprovedWithExcise() {
    return CheckStatusCode.fromParts(FCCheckStatus.ApprovedWithExcise, SWCheckStatus.ApprovedWithExcise)
  }

  static get ApprovedWithNotification() {
    return CheckStatusCode.fromParts(FCCheckStatus.ApprovedWithNotification, SWCheckStatus.ApprovedWithNotification)
  }

  static get MarkedByPartner() {
    return CheckStatusCode.fromParts(FCCheckStatus.MarkedByPartner, SWCheckStatus.MarkedByPartner)
  }
}

/**
 * Helper class for working with combined statuses.
 * Contains constructors and mappers between legacy values and new representation.
 */
export class CheckStatusHelper {
  /**
   * Compose integer value of combined status
   */
  static compose(fc, sw) {
    return CheckStatusCode.compose(fc, sw)
  }

  /**
   * Decompose integer value into components
   */
  static decompose(combined) {
    const s = CheckStatusCode.fromInt(combined)
    return {
      fc: s.fc,
      sw: s.sw
    }
  }

  /**
   * Check if a combined status has issues
   */
  static hasIssues(combined) {
    return CheckStatusCode.hasIssues(combined)
  }

  /**
   * Create a CheckStatusCode from parts
   */
  static fromParts(fc, sw) {
    return CheckStatusCode.fromParts(fc, sw)
  }

  /**
   * Create a CheckStatusCode from integer
   */
  static fromInt(value) {
    return CheckStatusCode.fromInt(value)
  }
}

// Export default for convenience
export default CheckStatusCode
